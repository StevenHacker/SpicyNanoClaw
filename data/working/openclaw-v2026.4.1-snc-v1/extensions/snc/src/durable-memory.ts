import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeHyphenSlug } from "openclaw/plugin-sdk/core";
import { resolveSncAgentScope } from "./agent-scope.js";
import type { SncSessionState } from "./session-state.js";

const DURABLE_MEMORY_VERSION = 1;
const DEFAULT_MAX_ENTRY_TEXT_BYTES = 1_024;
const DEFAULT_MAX_CATALOG_ENTRIES = 64;
const DEFAULT_PROJECTION_LIMIT = 3;
const DEFAULT_PROJECTION_MIN_SCORE = 3;
const DEFAULT_PROJECTION_MAX_BYTES = 900;
const DEFAULT_STALE_ENTRY_DAYS = 30;
const DEFAULT_DIAGNOSTICS_MAX_BYTES = 768;

const CATEGORY_WEIGHTS: Record<SncDurableMemoryCategory, number> = {
  directive: 5,
  constraint: 4,
  continuity: 3,
  fact: 2,
};

const STRENGTH_WEIGHTS: Record<SncDurableMemoryStrength, number> = {
  "explicit-user": 3,
  repeated: 2,
  derived: 1,
};

const TAG_PATTERNS: Array<{ tag: string; pattern: RegExp }> = [
  { tag: "chapter", pattern: /\bchapter\b/i },
  { tag: "scene", pattern: /\bscene\b/i },
  { tag: "outline", pattern: /\boutline\b/i },
  { tag: "draft", pattern: /\bdraft\b/i },
  { tag: "revise", pattern: /\b(revise|rewrite|rewrite)\b/i },
  { tag: "tone", pattern: /\btone\b/i },
  { tag: "voice", pattern: /\bvoice\b/i },
  { tag: "pov", pattern: /\b(pov|point of view|first person|third person)\b/i },
  { tag: "canon", pattern: /\bcanon\b/i },
  { tag: "continuity", pattern: /\bcontinuity\b/i },
  { tag: "character", pattern: /\b(character|protagonist|antagonist)\b/i },
  { tag: "setting", pattern: /\b(setting|location|place|world)\b/i },
];

const TRANSIENT_ACTION_PATTERNS = [
  /\b(read|review|inspect|list|compare|extract|summarize|check|confirm|quote|cite|scan)\b/i,
  /\b(debug|fix|run|rerun|build|test|search|open|triage|verify)\b/i,
];

const TRANSIENT_CONTEXT_PATTERNS = [
  /\b(file|files|doc|docs|document|documents|brief|ledger|packet|workspace|repo|repository|codebase)\b/i,
  /\b(test|tests|suite|report|reports|readme|config|diff|patch|issue|ticket|priority|priorities|checklist|table)\b/i,
  /\b(material|materials|source|sources|artifact|artifacts)\b/i,
];

const TIME_LOCAL_PATTERNS = [
  /\b(today|current|currently|right now|for now|this turn|this session|next step|next steps|latest)\b/i,
];

const FILE_REFERENCE_PATTERNS = [
  /\.[a-z0-9]{1,8}\b/i,
  /\b(?:src|docs|tests|scripts|research|data)\/[^\s]+/i,
];

const PERSISTENT_PREFERENCE_PATTERNS = [
  /\b(tone|style|voice|pov|point of view|tense|canon|continuity|naming|terminology|format|language|consistency)\b/i,
  /\b(always|never|prefer|avoid)\b/i,
];

const LONGFORM_MEMORY_PATTERNS = [
  /\b(chapter|scene|beat|outline|arc|clue|foreshadow|payoff|character|setting|world|plot)\b/i,
  /\b(draft|manuscript|novel|story|episode|continuity|canon)\b/i,
];

const CORRECTION_PREFERRED_THEN_REJECTED_PATTERNS = [
  /(?:use|call|write|refer to(?:\s+\w+)? as|name(?:d)?|keep)\s+[“"「]?(?<preferred>[^"”」,.;:，。；：\n]{1,40})[”"」]?\s*(?:,|\s)+(?:not|instead of|rather than)\s+[“"「]?(?<rejected>[^"”」,.;:，。；：\n]{1,40})/giu,
  /(?:用|写作|统一为|叫|称为|保持)\s*[“"「]?(?<preferred>[^"”」,.;:，。；：\n]{1,40})[”"」]?\s*(?:，|,|\s)*(?:不要写成|不是|而不是|不要再写成)\s*[“"「]?(?<rejected>[^"”」,.;:，。；：\n]{1,40})/gu,
];

const CORRECTION_REJECTED_THEN_PREFERRED_PATTERNS = [
  /(?:change|rename|correct)\s+[“"「]?(?<rejected>[^"”」,.;:，。；：\n]{1,40})[”"」]?\s*(?:to|into|as)\s+[“"「]?(?<preferred>[^"”」,.;:，。；：\n]{1,40})/giu,
  /(?:把|将)\s*[“"「]?(?<rejected>[^"”」,.;:，。；：\n]{1,40})[”"」]?\s*(?:改成|改为|统一成|统一为)\s*[“"「]?(?<preferred>[^"”」,.;:，。；：\n]{1,40})/gu,
];

const CORRECTION_GUARDRAIL_PREFIX_PATTERNS = [
  /\b(?:do not|don't|dont|never|avoid|without|forbid|forbidden|ban|banned|exclude)\b/i,
  /(不要|别|勿|禁止|避免|不可|不得|排除)/u,
];

export type SncDurableMemoryCategory = "directive" | "constraint" | "continuity" | "fact";

export type SncDurableMemoryStrength = "explicit-user" | "repeated" | "derived";

export type SncDurableMemoryEvidenceSource =
  | "story-ledger"
  | "chapter-state"
  | "auto-compaction-summary";

export type SncDurableMemoryEvidence = {
  sessionId: string;
  sessionKey?: string;
  source: SncDurableMemoryEvidenceSource;
};

export type SncDurableMemoryEntry = {
  version: number;
  id: string;
  category: SncDurableMemoryCategory;
  text: string;
  tags: string[];
  strength: SncDurableMemoryStrength;
  firstCapturedAt: string;
  lastConfirmedAt: string;
  confirmationCount: number;
  evidence: SncDurableMemoryEvidence[];
};

export type SncDurableMemoryCatalog = {
  version: number;
  updatedAt: string;
  entries: SncDurableMemoryEntry[];
};

export type SncDurableMemoryHarvestInput = {
  sessionId: string;
  sessionKey?: string;
  sessionState?: Pick<SncSessionState, "storyLedger" | "chapterState" | "autoCompactionSummary"> | null;
  now?: string;
  maxEntries?: number;
  maxEntryTextBytes?: number;
};

export type SncDurableMemoryProjectionInput = {
  entries: SncDurableMemoryEntry[] | SncDurableMemoryCatalog;
  currentText?: string;
  currentFocus?: string;
  currentConstraints?: string[];
  limit?: number;
  minimumScore?: number;
  maxBytes?: number;
};

export type SncDurableMemoryStoreInput = {
  stateDir?: string;
  namespace?: string;
};

export type SncDurableMemoryPersistInput = SncDurableMemoryStoreInput & {
  entries: SncDurableMemoryEntry[];
  now?: string;
  maxCatalogEntries?: number;
  staleEntryDays?: number;
};

export type SncDurableMemoryDiagnosticsInput = SncDurableMemoryProjectionInput & {
  now?: string;
  staleEntryDays?: number;
  maxBytes?: number;
};

type SncDurableMemoryScoredEntry = {
  entry: SncDurableMemoryEntry;
  score: number;
  reasons: string[];
  evidenceOverlapCount: number;
  suppressionReason?: string;
};

type SncCorrectionPair = {
  preferred: string;
  rejected: string;
};

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function normalizeTextKey(value: string): string {
  return normalizeText(value).toLowerCase();
}

function buildNamespaceFolderName(namespace: string): string {
  const normalized = normalizeText(namespace);
  const slug = normalizeHyphenSlug(normalized) || "shared";
  const hash = createHash("sha1").update(normalized).digest("hex").slice(0, 10);
  return `${slug}-${hash}`;
}

export function resolveSncDurableMemoryNamespace(params: {
  sessionId: string;
  sessionKey?: string;
  configuredNamespace?: string;
}): string | undefined {
  return (
    normalizeOptionalString(params.configuredNamespace) ??
    resolveSncAgentScope({
      sessionId: params.sessionId,
      sessionKey: params.sessionKey,
    }).agentKey
  );
}

function clampUtf8(input: string, maxBytes: number): string {
  if (Buffer.byteLength(input, "utf8") <= maxBytes) {
    return input;
  }

  let low = 0;
  let high = input.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (Buffer.byteLength(input.slice(0, mid), "utf8") <= maxBytes) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return `${input.slice(0, low).trimEnd()} [truncated by SNC]`;
}

function clampCount(value: unknown, fallback: number, minimum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(minimum, Math.floor(value));
}

function parseTimestamp(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function createEntryId(category: SncDurableMemoryCategory, text: string): string {
  return `dm-${createHash("sha1").update(`${category}:${normalizeTextKey(text)}`).digest("hex").slice(0, 16)}`;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Map<string, string>();
  for (const value of values) {
    const trimmed = normalizeText(value);
    if (!trimmed) {
      continue;
    }
    seen.set(normalizeTextKey(trimmed), trimmed);
  }
  return [...seen.values()];
}

function matchesAnyPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function tokenSet(text: string): Set<string> {
  const normalized = normalizeText(text).toLowerCase();
  const tokens = new Set<string>();
  const wordLikeTokens = normalized.match(/[\p{L}\p{N}]+/gu) ?? [];

  for (const token of wordLikeTokens) {
    if (!token) {
      continue;
    }

    if (/\p{Script=Han}/u.test(token)) {
      const chars = [...token].filter((char) => /\p{Script=Han}/u.test(char));
      if (chars.length === 1) {
        tokens.add(chars[0]);
        continue;
      }
      if (chars.length > 0 && chars.length <= 8) {
        tokens.add(chars.join(""));
      }
      for (let index = 0; index < chars.length - 1; index++) {
        tokens.add(`${chars[index]}${chars[index + 1]}`);
      }
      continue;
    }

    if (token.length > 2 || /\d/.test(token)) {
      tokens.add(token);
    }
  }

  return tokens;
}

function overlapScore(left: string, right: string): number {
  if (!left || !right) {
    return 0;
  }
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  let score = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      score += 1;
    }
  }
  return score;
}

function containsNormalizedPhrase(haystack: string, needle: string): boolean {
  const normalizedNeedle = normalizeTextKey(needle);
  if (!normalizedNeedle) {
    return false;
  }
  return normalizeTextKey(haystack).includes(normalizedNeedle);
}

function extractCorrectionPairs(text: string): SncCorrectionPair[] {
  const pairs: SncCorrectionPair[] = [];
  const seen = new Set<string>();

  for (const pattern of CORRECTION_PREFERRED_THEN_REJECTED_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const preferred = normalizeOptionalString(match.groups?.preferred);
      const rejected = normalizeOptionalString(match.groups?.rejected);
      if (!preferred || !rejected || normalizeTextKey(preferred) === normalizeTextKey(rejected)) {
        continue;
      }
      const key = `${normalizeTextKey(preferred)}=>${normalizeTextKey(rejected)}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      pairs.push({ preferred, rejected });
    }
  }

  for (const pattern of CORRECTION_REJECTED_THEN_PREFERRED_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const preferred = normalizeOptionalString(match.groups?.preferred);
      const rejected = normalizeOptionalString(match.groups?.rejected);
      if (!preferred || !rejected || normalizeTextKey(preferred) === normalizeTextKey(rejected)) {
        continue;
      }
      const key = `${normalizeTextKey(preferred)}=>${normalizeTextKey(rejected)}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      pairs.push({ preferred, rejected });
    }
  }

  return pairs;
}

function extractCurrentCorrectionPairs(input: SncDurableMemoryProjectionInput): SncCorrectionPair[] {
  const sources = [
    normalizeOptionalString(input.currentText),
    normalizeOptionalString(input.currentFocus),
    ...normalizeSessionStateText(input.currentConstraints),
  ].filter((value): value is string => Boolean(value));

  const pairs: SncCorrectionPair[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    for (const pair of extractCorrectionPairs(source)) {
      const key = `${normalizeTextKey(pair.preferred)}=>${normalizeTextKey(pair.rejected)}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      pairs.push(pair);
    }
  }
  return pairs;
}

function resolveCorrectionSuppressionReason(
  entry: SncDurableMemoryEntry,
  input: SncDurableMemoryProjectionInput,
): string | undefined {
  for (const pair of extractCurrentCorrectionPairs(input)) {
    if (
      containsNormalizedPhrase(entry.text, pair.rejected) &&
      !containsNormalizedPhrase(entry.text, pair.preferred) &&
      !isCorrectionGuardrailForRejected(entry.text, pair.rejected)
    ) {
      return `fresher evidence prefers ${pair.preferred} over ${pair.rejected}`;
    }
  }
  return undefined;
}

function resolveCorrectionSupportReason(
  entry: SncDurableMemoryEntry,
  input: SncDurableMemoryProjectionInput,
): string | undefined {
  for (const pair of extractCurrentCorrectionPairs(input)) {
    const mentionsPreferred = containsNormalizedPhrase(entry.text, pair.preferred);
    const mentionsRejected = containsNormalizedPhrase(entry.text, pair.rejected);
    if (!mentionsPreferred) {
      continue;
    }
    if (!mentionsRejected) {
      return `supports current correction toward ${pair.preferred}`;
    }
    if (isCorrectionGuardrailForRejected(entry.text, pair.rejected)) {
      return `supports current correction against ${pair.rejected}`;
    }
  }
  return undefined;
}

function isCorrectionGuardrailForRejected(text: string, rejected: string): boolean {
  const normalizedText = normalizeTextKey(text);
  const normalizedRejected = normalizeTextKey(rejected);
  if (!normalizedRejected) {
    return false;
  }

  let startIndex = normalizedText.indexOf(normalizedRejected);
  while (startIndex >= 0) {
    const prefix = normalizedText.slice(Math.max(0, startIndex - 32), startIndex);
    if (CORRECTION_GUARDRAIL_PREFIX_PATTERNS.some((pattern) => pattern.test(prefix))) {
      return true;
    }
    startIndex = normalizedText.indexOf(normalizedRejected, startIndex + normalizedRejected.length);
  }

  return false;
}

function deriveTags(text: string, category: SncDurableMemoryCategory): string[] {
  const tags: string[] = [category];
  for (const entry of TAG_PATTERNS) {
    if (entry.pattern.test(text)) {
      tags.push(entry.tag);
    }
  }
  return uniqueStrings(tags).slice(0, 6);
}

function hasTransientOperationalSignal(text: string): boolean {
  const transientAction = matchesAnyPattern(text, TRANSIENT_ACTION_PATTERNS);
  const transientContext =
    matchesAnyPattern(text, TRANSIENT_CONTEXT_PATTERNS) ||
    matchesAnyPattern(text, TIME_LOCAL_PATTERNS) ||
    matchesAnyPattern(text, FILE_REFERENCE_PATTERNS);

  return transientAction && transientContext;
}

function hasPersistentPreferenceSignal(text: string): boolean {
  return matchesAnyPattern(text, PERSISTENT_PREFERENCE_PATTERNS);
}

function hasLongformMemorySignal(text: string): boolean {
  return matchesAnyPattern(text, LONGFORM_MEMORY_PATTERNS);
}

function shouldRetainForCrossSessionMemory(entry: SncDurableMemoryEntry): boolean {
  const text = normalizeText(entry.text);
  const transientOperational = hasTransientOperationalSignal(text);
  const persistentPreference = hasPersistentPreferenceSignal(text);
  const longformMemory = hasLongformMemorySignal(text);
  const operationalContext =
    matchesAnyPattern(text, TRANSIENT_CONTEXT_PATTERNS) ||
    matchesAnyPattern(text, FILE_REFERENCE_PATTERNS);

  switch (entry.category) {
    case "directive":
    case "constraint":
      return !transientOperational || persistentPreference;
    case "continuity":
      if (entry.strength === "derived" && transientOperational) {
        return false;
      }
      if (transientOperational && !longformMemory) {
        return false;
      }
      if (entry.strength === "derived" && operationalContext && !longformMemory) {
        return false;
      }
      return true;
    case "fact":
      if (transientOperational) {
        return false;
      }
      if (operationalContext && !longformMemory) {
        return false;
      }
      return true;
  }
}

function filterCrossSessionDurableEntries(
  entries: SncDurableMemoryEntry[],
): SncDurableMemoryEntry[] {
  return entries.filter((entry) => shouldRetainForCrossSessionMemory(entry));
}

function strengthRank(strength: SncDurableMemoryStrength): number {
  return STRENGTH_WEIGHTS[strength];
}

function mergeStrength(
  left: SncDurableMemoryStrength,
  right: SncDurableMemoryStrength,
): SncDurableMemoryStrength {
  return strengthRank(right) > strengthRank(left) ? right : left;
}

function normalizeEvidence(value: unknown): SncDurableMemoryEvidence | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const sessionId = normalizeOptionalString((value as { sessionId?: unknown }).sessionId);
  const source = (value as { source?: unknown }).source;
  const sessionKey = normalizeOptionalString((value as { sessionKey?: unknown }).sessionKey);
  if (
    !sessionId ||
    (source !== "story-ledger" && source !== "chapter-state" && source !== "auto-compaction-summary")
  ) {
    return undefined;
  }
  return {
    sessionId,
    ...(sessionKey ? { sessionKey } : {}),
    source,
  };
}

function normalizeEntry(value: unknown): SncDurableMemoryEntry | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const category = (value as { category?: unknown }).category;
  const id = normalizeOptionalString((value as { id?: unknown }).id);
  const text = normalizeOptionalString((value as { text?: unknown }).text);
  const strength = (value as { strength?: unknown }).strength;
  const firstCapturedAt = normalizeOptionalString((value as { firstCapturedAt?: unknown }).firstCapturedAt);
  const lastConfirmedAt = normalizeOptionalString((value as { lastConfirmedAt?: unknown }).lastConfirmedAt);
  const confirmationCount = (value as { confirmationCount?: unknown }).confirmationCount;
  const evidenceValue = (value as { evidence?: unknown }).evidence;
  const tagsValue = (value as { tags?: unknown }).tags;

  if (
    !id ||
    (category !== "directive" &&
      category !== "constraint" &&
      category !== "continuity" &&
      category !== "fact") ||
    !text ||
    (strength !== "explicit-user" && strength !== "repeated" && strength !== "derived") ||
    !firstCapturedAt ||
    !lastConfirmedAt
  ) {
    return undefined;
  }

  const normalizedCategory = category as SncDurableMemoryCategory;
  const normalizedStrength = strength as SncDurableMemoryStrength;

  const evidence = Array.isArray(evidenceValue)
    ? evidenceValue.map((item) => normalizeEvidence(item)).filter((item): item is SncDurableMemoryEvidence => Boolean(item))
    : [];

  return {
    version: typeof (value as { version?: unknown }).version === "number" ? (value as { version: number }).version : DURABLE_MEMORY_VERSION,
    id,
    category: normalizedCategory,
    text,
    tags: Array.isArray(tagsValue)
      ? uniqueStrings(
          tagsValue
            .map((tag) => normalizeOptionalString(tag))
            .filter((tag): tag is string => Boolean(tag)),
        )
      : deriveTags(text, normalizedCategory),
    strength: normalizedStrength,
    firstCapturedAt,
    lastConfirmedAt,
    confirmationCount:
      typeof confirmationCount === "number" && Number.isFinite(confirmationCount) && confirmationCount > 0
        ? Math.floor(confirmationCount)
        : Math.max(1, evidence.length),
    evidence,
  };
}

function normalizeCatalog(value: unknown): SncDurableMemoryCatalog {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createSncDurableMemoryCatalog();
  }

  const entriesRaw = (value as { entries?: unknown }).entries;
  const entries = Array.isArray(entriesRaw)
    ? entriesRaw
        .map((entry) => normalizeEntry(entry))
        .filter((entry): entry is SncDurableMemoryEntry => Boolean(entry))
    : [];

  return {
    version:
      typeof (value as { version?: unknown }).version === "number"
        ? (value as { version: number }).version
        : DURABLE_MEMORY_VERSION,
    updatedAt:
      normalizeOptionalString((value as { updatedAt?: unknown }).updatedAt) ?? new Date(0).toISOString(),
    entries,
  };
}

function mergeEvidence(
  existing: SncDurableMemoryEvidence[],
  incoming: SncDurableMemoryEvidence[],
): SncDurableMemoryEvidence[] {
  const merged = new Map<string, SncDurableMemoryEvidence>();
  for (const evidence of [...existing, ...incoming]) {
    const key = `${evidence.sessionId}:${evidence.sessionKey ?? "-"}:${evidence.source}`;
    if (!merged.has(key)) {
      merged.set(key, evidence);
    }
  }
  return [...merged.values()];
}

function upsertEntry(
  existing: SncDurableMemoryEntry | undefined,
  incoming: SncDurableMemoryEntry,
): SncDurableMemoryEntry {
  const evidence = mergeEvidence(existing?.evidence ?? [], incoming.evidence);
  const mergedTags = uniqueStrings([...(existing?.tags ?? []), ...incoming.tags]);
  const firstCapturedAt =
    existing && existing.firstCapturedAt < incoming.firstCapturedAt
      ? existing.firstCapturedAt
      : incoming.firstCapturedAt;
  const lastConfirmedAt =
    existing && existing.lastConfirmedAt > incoming.lastConfirmedAt
      ? existing.lastConfirmedAt
      : incoming.lastConfirmedAt;

  return {
    version: DURABLE_MEMORY_VERSION,
    id: incoming.id,
    category: incoming.category,
    text: incoming.text,
    tags: mergedTags,
    strength: existing ? mergeStrength(existing.strength, incoming.strength) : incoming.strength,
    firstCapturedAt,
    lastConfirmedAt,
    confirmationCount: Math.max(1, evidence.length),
    evidence,
  };
}

function buildDurableMemoryRoot(stateDir: string, namespace?: string): string {
  const normalizedNamespace = normalizeOptionalString(namespace);
  return normalizedNamespace
    ? path.join(
        stateDir,
        "durable-memory",
        "namespaces",
        buildNamespaceFolderName(normalizedNamespace),
      )
    : path.join(stateDir, "durable-memory");
}

function buildEntryPath(stateDir: string, entryId: string, namespace?: string): string {
  return path.join(buildDurableMemoryRoot(stateDir, namespace), "entries", `${entryId}.json`);
}

function buildCatalogPath(stateDir: string, namespace?: string): string {
  return path.join(buildDurableMemoryRoot(stateDir, namespace), "catalog.json");
}

function normalizeHarvestText(value: string, maxEntryTextBytes: number): string {
  return clampUtf8(normalizeText(value), maxEntryTextBytes);
}

function createHarvestCandidate(input: {
  sessionId: string;
  sessionKey?: string;
  source: SncDurableMemoryEvidenceSource;
  category: SncDurableMemoryCategory;
  text: string;
  strength: SncDurableMemoryStrength;
  now: string;
  maxEntryTextBytes: number;
}): SncDurableMemoryEntry {
  const text = normalizeHarvestText(input.text, input.maxEntryTextBytes);
  const evidence = [
    {
      sessionId: input.sessionId,
      ...(input.sessionKey ? { sessionKey: input.sessionKey } : {}),
      source: input.source,
    },
  ];

  return {
    version: DURABLE_MEMORY_VERSION,
    id: createEntryId(input.category, text),
    category: input.category,
    text,
    tags: deriveTags(text, input.category),
    strength: input.strength,
    firstCapturedAt: input.now,
    lastConfirmedAt: input.now,
    confirmationCount: 1,
    evidence,
  };
}

function harvestFromList(input: {
  sessionId: string;
  sessionKey?: string;
  category: SncDurableMemoryCategory;
  source: SncDurableMemoryEvidenceSource;
  strength: SncDurableMemoryStrength;
  values: string[];
  now: string;
  maxEntryTextBytes: number;
}): SncDurableMemoryEntry[] {
  return uniqueStrings(input.values)
    .map((text) =>
      createHarvestCandidate({
        sessionId: input.sessionId,
        sessionKey: input.sessionKey,
        source: input.source,
        category: input.category,
        text,
        strength: input.strength,
        now: input.now,
        maxEntryTextBytes: input.maxEntryTextBytes,
      }),
    )
    .filter((entry) => entry.text.length > 0);
}

function harvestFocusEntry(input: {
  sessionId: string;
  sessionKey?: string;
  focus?: string;
  now: string;
  maxEntryTextBytes: number;
}): SncDurableMemoryEntry[] {
  if (!input.focus) {
    return [];
  }
  return [
    createHarvestCandidate({
      sessionId: input.sessionId,
      sessionKey: input.sessionKey,
      source: "chapter-state",
      category: "fact",
      text: input.focus,
      strength: "derived",
      now: input.now,
      maxEntryTextBytes: input.maxEntryTextBytes,
    }),
  ];
}

function harvestSummaryEntry(input: {
  sessionId: string;
  sessionKey?: string;
  summary?: string;
  now: string;
  maxEntryTextBytes: number;
}): SncDurableMemoryEntry[] {
  if (!input.summary) {
    return [];
  }
  return [
    createHarvestCandidate({
      sessionId: input.sessionId,
      sessionKey: input.sessionKey,
      source: "auto-compaction-summary",
      category: "continuity",
      text: input.summary,
      strength: "derived",
      now: input.now,
      maxEntryTextBytes: input.maxEntryTextBytes,
    }),
  ];
}

function normalizeSessionStateText(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function mergeHarvestedEntries(entries: SncDurableMemoryEntry[]): SncDurableMemoryEntry[] {
  const merged = new Map<string, SncDurableMemoryEntry>();
  for (const entry of entries) {
    const existing = merged.get(entry.id);
    merged.set(entry.id, upsertEntry(existing, entry));
  }
  return [...merged.values()];
}

function scoreEntry(entry: SncDurableMemoryEntry, input: SncDurableMemoryProjectionInput): number {
  const currentText = normalizeOptionalString(input.currentText) ?? "";
  const currentFocus = normalizeOptionalString(input.currentFocus) ?? "";
  const currentConstraints = normalizeSessionStateText(input.currentConstraints);

  let score = CATEGORY_WEIGHTS[entry.category] + strengthRank(entry.strength);
  score += Math.min(2, Math.max(0, entry.confirmationCount - 1));
  score += overlapScore(entry.text, currentText) * 2;
  score += overlapScore(entry.text, currentFocus) * 2;
  for (const constraint of currentConstraints) {
    score += overlapScore(entry.text, constraint) * 2;
  }
  score += overlapScore(entry.tags.join(" "), currentText);
  score += overlapScore(entry.tags.join(" "), currentFocus);

  return score;
}

function normalizeEntryList(value: SncDurableMemoryProjectionInput["entries"]): SncDurableMemoryEntry[] {
  return Array.isArray(value) ? value.map((entry) => normalizeEntry(entry)).filter((entry): entry is SncDurableMemoryEntry => Boolean(entry)) : normalizeCatalog(value).entries;
}

function isWeakSingleSignal(entry: SncDurableMemoryEntry): boolean {
  return entry.strength === "derived" && entry.confirmationCount <= 1;
}

function filterWeakStaleEntries(
  entries: SncDurableMemoryEntry[],
  now: string,
  staleEntryDays: number,
): SncDurableMemoryEntry[] {
  if (staleEntryDays <= 0) {
    return entries;
  }

  const nowTime = parseTimestamp(now);
  if (nowTime === undefined) {
    return entries;
  }

  const staleWindowMs = staleEntryDays * 24 * 60 * 60 * 1000;
  return entries.filter((entry) => {
    if (!isWeakSingleSignal(entry)) {
      return true;
    }

    const lastConfirmedAt = parseTimestamp(entry.lastConfirmedAt);
    if (lastConfirmedAt === undefined) {
      return true;
    }

    return nowTime - lastConfirmedAt <= staleWindowMs;
  });
}

function countWeakStaleEntries(
  entries: SncDurableMemoryEntry[],
  now: string,
  staleEntryDays: number,
): number {
  return entries.length - filterWeakStaleEntries(entries, now, staleEntryDays).length;
}

function buildCategoryMix(entries: SncDurableMemoryEntry[]): string {
  const counts = new Map<SncDurableMemoryCategory, number>([
    ["directive", 0],
    ["constraint", 0],
    ["continuity", 0],
    ["fact", 0],
  ]);

  for (const entry of entries) {
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 0)
    .map(([category, count]) => `${category} ${count}`)
    .join(", ");
}

function countQualifiedEntries(
  entries: SncDurableMemoryEntry[],
  input: SncDurableMemoryProjectionInput,
  minimumScore: number,
): number {
  return entries
    .map((entry) => scoreEntryWithReasons(entry, input))
    .filter((entry) => !entry.suppressionReason && entry.score >= minimumScore).length;
}

function buildEntryIdentityReason(entry: SncDurableMemoryEntry): string {
  const strengthLabel = (() => {
    switch (entry.strength) {
      case "explicit-user":
        return "explicit-user";
      case "repeated":
        return "repeated";
      case "derived":
        return "derived";
    }
  })();

  return `${strengthLabel} ${entry.category}`;
}

function scoreEntryWithReasons(
  entry: SncDurableMemoryEntry,
  input: SncDurableMemoryProjectionInput,
): SncDurableMemoryScoredEntry {
  const currentText = normalizeOptionalString(input.currentText) ?? "";
  const currentFocus = normalizeOptionalString(input.currentFocus) ?? "";
  const currentConstraints = normalizeSessionStateText(input.currentConstraints);

  let score = CATEGORY_WEIGHTS[entry.category] + strengthRank(entry.strength);
  const reasons = [buildEntryIdentityReason(entry)];
  let evidenceOverlapCount = 0;

  const confirmationBonus = Math.min(2, Math.max(0, entry.confirmationCount - 1));
  score += confirmationBonus;
  if (entry.confirmationCount > 1) {
    reasons.push(`confirmed x${entry.confirmationCount}`);
  }

  const textOverlap = overlapScore(entry.text, currentText) * 2;
  score += textOverlap;
  if (textOverlap > 0) {
    reasons.push("matches current turn");
    evidenceOverlapCount += 1;
  }

  const focusOverlap = overlapScore(entry.text, currentFocus) * 2;
  score += focusOverlap;
  if (focusOverlap > 0) {
    reasons.push("matches current focus");
    evidenceOverlapCount += 1;
  }

  let constraintMatched = false;
  for (const constraint of currentConstraints) {
    const constraintOverlap = overlapScore(entry.text, constraint) * 2;
    score += constraintOverlap;
    if (constraintOverlap > 0) {
      constraintMatched = true;
      evidenceOverlapCount += 1;
    }
  }
  if (constraintMatched) {
    reasons.push("matches active constraints");
  }

  const currentTagOverlap =
    overlapScore(entry.tags.join(" "), currentText) + overlapScore(entry.tags.join(" "), currentFocus);
  score += currentTagOverlap;
  if (currentTagOverlap > 0) {
    reasons.push("tag overlap");
    evidenceOverlapCount += 1;
  }

  const suppressionReason = resolveCorrectionSuppressionReason(entry, input);
  const correctionSupportReason = suppressionReason
    ? undefined
    : resolveCorrectionSupportReason(entry, input);
  if (correctionSupportReason) {
    score += 6;
    reasons.push(correctionSupportReason);
    evidenceOverlapCount += 1;
  }

  return {
    entry,
    score,
    reasons,
    evidenceOverlapCount,
    ...(suppressionReason ? { suppressionReason } : {}),
  };
}

function rankSncDurableMemoryEntries(
  input: SncDurableMemoryProjectionInput,
): SncDurableMemoryScoredEntry[] {
  return filterCrossSessionDurableEntries(normalizeEntryList(input.entries))
    .map((entry) => scoreEntryWithReasons(entry, input))
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.entry.confirmationCount - left.entry.confirmationCount ||
        right.entry.lastConfirmedAt.localeCompare(left.entry.lastConfirmedAt) ||
        left.entry.id.localeCompare(right.entry.id),
    );
}

function formatDiagnosticReasonSummary(scored: SncDurableMemoryScoredEntry): string {
  const reasons = [...scored.reasons];
  if (scored.evidenceOverlapCount === 0) {
    reasons.push("no current evidence overlap");
  }
  if (scored.suppressionReason) {
    reasons.push(scored.suppressionReason);
  }
  return reasons.slice(0, 4).join("; ");
}

function clampDiagnosticText(text: string, maxBytes = 256): string {
  return clampUtf8(text, maxBytes).replace(/\s+\[truncated by SNC\]$/, " …");
}

export function createSncDurableMemoryCatalog(now = new Date().toISOString()): SncDurableMemoryCatalog {
  return {
    version: DURABLE_MEMORY_VERSION,
    updatedAt: now,
    entries: [],
  };
}

export function harvestSncDurableMemoryEntries(
  input: SncDurableMemoryHarvestInput,
): SncDurableMemoryEntry[] {
  const sessionState = input.sessionState;
  if (!sessionState) {
    return [];
  }

  const now = input.now ?? new Date().toISOString();
  const maxEntryTextBytes = clampCount(
    input.maxEntryTextBytes,
    DEFAULT_MAX_ENTRY_TEXT_BYTES,
    64,
  );
  const explicitDirectiveKeys = new Set(
    uniqueStrings(sessionState.storyLedger?.userDirectives ?? []).map((entry) => normalizeTextKey(entry)),
  );
  const latestUserDirective = normalizeOptionalString(sessionState.chapterState?.latestUserDirective);

  const harvested = [
    ...harvestFromList({
      sessionId: input.sessionId,
      sessionKey: input.sessionKey,
      category: "directive",
      source: "story-ledger",
      strength: "explicit-user",
      values: sessionState.storyLedger?.userDirectives ?? [],
      now,
      maxEntryTextBytes,
    }),
    ...harvestFromList({
      sessionId: input.sessionId,
      sessionKey: input.sessionKey,
      category: "constraint",
      source: "chapter-state",
      strength: "explicit-user",
      values: sessionState.chapterState?.constraints ?? [],
      now,
      maxEntryTextBytes,
    }),
    ...harvestFromList({
      sessionId: input.sessionId,
      sessionKey: input.sessionKey,
      category: "continuity",
      source: "story-ledger",
      strength: "repeated",
      values: sessionState.storyLedger?.continuityNotes ?? [],
      now,
      maxEntryTextBytes,
    }),
    ...harvestFocusEntry({
      sessionId: input.sessionId,
      sessionKey: input.sessionKey,
      focus: sessionState.chapterState?.focus,
      now,
      maxEntryTextBytes,
    }),
    ...harvestSummaryEntry({
      sessionId: input.sessionId,
      sessionKey: input.sessionKey,
      summary: sessionState.autoCompactionSummary,
      now,
      maxEntryTextBytes,
    }),
    ...(latestUserDirective &&
    !explicitDirectiveKeys.has(normalizeTextKey(latestUserDirective))
      ? harvestFromList({
          sessionId: input.sessionId,
          sessionKey: input.sessionKey,
          category: "directive",
          source: "chapter-state",
          strength: "derived",
          values: [latestUserDirective],
          now,
          maxEntryTextBytes,
        })
      : []),
  ];

  return filterCrossSessionDurableEntries(mergeHarvestedEntries(harvested)).slice(
    0,
    clampCount(input.maxEntries, DEFAULT_MAX_CATALOG_ENTRIES, 1),
  );
}

export function mergeSncDurableMemoryEntries(
  existingEntries: SncDurableMemoryEntry[] | SncDurableMemoryCatalog,
  incomingEntries: SncDurableMemoryEntry[],
  now = new Date().toISOString(),
): SncDurableMemoryCatalog {
  const current = normalizeEntryList(existingEntries);
  const merged = new Map<string, SncDurableMemoryEntry>();

  for (const entry of current) {
    merged.set(entry.id, entry);
  }

  for (const entry of incomingEntries) {
    const normalized = normalizeEntry(entry);
    if (!normalized) {
      continue;
    }
    merged.set(normalized.id, upsertEntry(merged.get(normalized.id), normalized));
  }

  return {
    version: DURABLE_MEMORY_VERSION,
    updatedAt: now,
    entries: [...merged.values()].sort((left, right) =>
      right.lastConfirmedAt.localeCompare(left.lastConfirmedAt) ||
      right.confirmationCount - left.confirmationCount ||
      left.id.localeCompare(right.id),
    ),
  };
}

export function projectSncDurableMemoryEntries(
  input: SncDurableMemoryProjectionInput,
): SncDurableMemoryEntry[] {
  const limit = clampCount(input.limit, DEFAULT_PROJECTION_LIMIT, 1);
  const minimumScore = clampCount(input.minimumScore, DEFAULT_PROJECTION_MIN_SCORE, 0);

  return rankSncDurableMemoryEntries(input)
    .filter((entry) => !entry.suppressionReason && entry.score >= minimumScore)
    .slice(0, limit)
    .map((entry) => entry.entry);
}

export function buildSncDurableMemorySection(
  input: SncDurableMemoryProjectionInput,
): string | undefined {
  const projected = projectSncDurableMemoryEntries(input);
  if (projected.length === 0) {
    return undefined;
  }

  const lines = ["Durable memory cues:"];
  for (const entry of projected) {
    const tagText = entry.tags.length > 0 ? ` (${entry.tags.join(", ")})` : "";
    const countText = entry.confirmationCount > 1 ? ` x${entry.confirmationCount}` : "";
    lines.push(`- [${entry.category}]${countText} ${entry.text}${tagText}`);
  }

  const maxBytes = clampCount(input.maxBytes, DEFAULT_PROJECTION_MAX_BYTES, 128);
  return clampUtf8(lines.join("\n"), maxBytes);
}

export function buildSncDurableMemoryDiagnosticsSection(
  input: SncDurableMemoryDiagnosticsInput,
): string | undefined {
  const catalogEntries = normalizeEntryList(input.entries);
  if (catalogEntries.length === 0) {
    return undefined;
  }
  const entries = filterCrossSessionDurableEntries(catalogEntries);
  const suppressedTransientCount = catalogEntries.length - entries.length;

  const projectionLimit = clampCount(input.limit, DEFAULT_PROJECTION_LIMIT, 1);
  const projectionMinimumScore = clampCount(input.minimumScore, DEFAULT_PROJECTION_MIN_SCORE, 0);
  const now = input.now ?? new Date().toISOString();
  const staleEntryDays = clampCount(input.staleEntryDays, DEFAULT_STALE_ENTRY_DAYS, 1);
  const rankedEntries = rankSncDurableMemoryEntries({
    ...input,
    entries,
  });
  const qualifiedEntries = rankedEntries.filter(
    (entry) => !entry.suppressionReason && entry.score >= projectionMinimumScore,
  );
  const projected = qualifiedEntries.slice(0, projectionLimit).map((entry) => entry.entry);
  const qualifiedCount = countQualifiedEntries(entries, input, projectionMinimumScore);
  const weakSingleSignalCount = entries.filter((entry) => isWeakSingleSignal(entry)).length;
  const weakStaleCount = countWeakStaleEntries(entries, now, staleEntryDays);
  const suppressedConflictEntries = rankedEntries.filter((entry) => entry.suppressionReason);

  const diagnostics: string[] = [];
  if (qualifiedCount === 0) {
    diagnostics.push(
      `No durable cue currently clears score ${projectionMinimumScore}; do not force stale memory into this turn.`,
    );
  } else if (qualifiedCount > projected.length) {
    diagnostics.push(
      `Projection is saturated at limit ${projectionLimit}; only raise it if continuity evidence is still starved after review.`,
    );
  }
  if (weakSingleSignalCount > 0) {
    diagnostics.push(
      `Weak single-signal entries: ${weakSingleSignalCount}; entries that stay unconfirmed for ${staleEntryDays}d age out on later writes.`,
    );
  }
  if (weakStaleCount > 0) {
    diagnostics.push(
      `Stale weak entries waiting for prune: ${weakStaleCount}; the next successful durable-memory write should remove them.`,
    );
  }
  if (suppressedTransientCount > 0) {
    diagnostics.push(
      `Transient operational entries suppressed: ${suppressedTransientCount}; keep them in session continuity, not cross-session durable projection.`,
    );
  }
  if (suppressedConflictEntries.length > 0) {
    diagnostics.push(
      `Conflict-suppressed cues: ${suppressedConflictEntries.length}; current evidence or fresher same-session wording wins.`,
    );
  }

  const explainabilityLines: string[] = [];
  if (qualifiedEntries.length > 0) {
    explainabilityLines.push("Projected cue reasons:");
    for (const scored of qualifiedEntries.slice(0, Math.min(2, projectionLimit))) {
      explainabilityLines.push(
        `- ${clampDiagnosticText(scored.entry.text)} -> ${formatDiagnosticReasonSummary(scored)} (score ${scored.score})`,
      );
    }
  }

  if (qualifiedEntries.length > projectionLimit) {
    const heldBack = qualifiedEntries[projectionLimit];
    if (heldBack) {
      explainabilityLines.push(
        `Held back by limit: ${clampDiagnosticText(heldBack.entry.text)} -> ${formatDiagnosticReasonSummary(heldBack)} (score ${heldBack.score})`,
      );
    }
  } else if (qualifiedEntries.length === 0) {
    const closestMiss = rankedEntries.find((entry) => !entry.suppressionReason) ?? rankedEntries[0];
    if (closestMiss) {
      if (closestMiss.suppressionReason) {
        explainabilityLines.push(
          `Top suppressed cue: ${clampDiagnosticText(closestMiss.entry.text)} -> ${closestMiss.suppressionReason} (score ${closestMiss.score})`,
        );
      } else {
        explainabilityLines.push(
          `Top held-back cue: ${clampDiagnosticText(closestMiss.entry.text)} -> ${formatDiagnosticReasonSummary(closestMiss)} (score ${closestMiss.score} < ${projectionMinimumScore})`,
        );
      }
    }
  }

  if (suppressedConflictEntries.length > 0) {
    const strongestSuppressed = suppressedConflictEntries[0];
    explainabilityLines.push(
      `Suppressed by fresher evidence: ${clampDiagnosticText(strongestSuppressed.entry.text)} -> ${strongestSuppressed.suppressionReason} (score ${strongestSuppressed.score})`,
    );
  }

  if (diagnostics.length === 0 && explainabilityLines.length === 0) {
    return undefined;
  }

  const lines = [
    `Catalog: ${catalogEntries.length} entries; projected now ${projected.length}/${qualifiedCount} above score ${projectionMinimumScore}.`,
    `Mix: ${buildCategoryMix(entries)}.`,
    ...explainabilityLines,
    ...diagnostics,
  ];

  const maxBytes = clampCount(input.maxBytes, DEFAULT_DIAGNOSTICS_MAX_BYTES, 160);
  return clampUtf8(lines.join("\n"), maxBytes);
}

export async function loadSncDurableMemoryCatalog(
  input: SncDurableMemoryStoreInput,
): Promise<SncDurableMemoryCatalog | null> {
  if (!input.stateDir) {
    return null;
  }

  try {
    const raw = await readFile(buildCatalogPath(input.stateDir, input.namespace), "utf8");
    return normalizeCatalog(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export async function loadSncDurableMemoryEntry(
  input: SncDurableMemoryStoreInput & { entryId: string },
): Promise<SncDurableMemoryEntry | null> {
  if (!input.stateDir) {
    return null;
  }

  try {
    const raw = await readFile(buildEntryPath(input.stateDir, input.entryId, input.namespace), "utf8");
    return normalizeEntry(JSON.parse(raw) as unknown) ?? null;
  } catch {
    return null;
  }
}

export async function persistSncDurableMemoryStore(
  input: SncDurableMemoryPersistInput,
): Promise<SncDurableMemoryCatalog | null> {
  if (!input.stateDir) {
    return null;
  }

  const now = input.now ?? new Date().toISOString();
  const existing =
    (await loadSncDurableMemoryCatalog({
      stateDir: input.stateDir,
      namespace: input.namespace,
    })) ?? createSncDurableMemoryCatalog(now);
  const catalog = mergeSncDurableMemoryEntries(existing, input.entries, now);
  const crossSessionEntries = filterCrossSessionDurableEntries(catalog.entries);
  const hardenedEntries = filterWeakStaleEntries(
    crossSessionEntries,
    now,
    clampCount(input.staleEntryDays, DEFAULT_STALE_ENTRY_DAYS, 1),
  );
  const cappedEntries = hardenedEntries.slice(0, clampCount(input.maxCatalogEntries, DEFAULT_MAX_CATALOG_ENTRIES, 1));
  const normalizedCatalog: SncDurableMemoryCatalog = {
    ...catalog,
    entries: cappedEntries,
  };

  const rootDir = buildDurableMemoryRoot(input.stateDir, input.namespace);
  const entriesDir = path.join(rootDir, "entries");
  await mkdir(entriesDir, { recursive: true });
  await writeFile(
    buildCatalogPath(input.stateDir, input.namespace),
    `${JSON.stringify(normalizedCatalog, null, 2)}\n`,
    "utf8",
  );

  const keptEntryIds = new Set(cappedEntries.map((entry) => entry.id));
  for (const entry of cappedEntries) {
    await writeFile(
      buildEntryPath(input.stateDir, entry.id, input.namespace),
      `${JSON.stringify(entry, null, 2)}\n`,
      "utf8",
    );
  }

  try {
    const existingFiles = await readdir(entriesDir, { withFileTypes: true });
    for (const entry of existingFiles) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".json")) {
        continue;
      }
      const entryId = entry.name.slice(0, -".json".length);
      if (keptEntryIds.has(entryId)) {
        continue;
      }
      await rm(path.join(entriesDir, entry.name), { force: true });
    }
  } catch {
    // Keep persistence conservative if cleanup fails.
  }

  return normalizedCatalog;
}
