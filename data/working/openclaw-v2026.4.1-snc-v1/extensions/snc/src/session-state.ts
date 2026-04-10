import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { normalizeHyphenSlug } from "openclaw/plugin-sdk/core";
import {
  buildSncScopedFilename,
  resolveSncAgentScope,
  type SncAgentRole,
} from "./agent-scope.js";
import { analyzeSncTranscriptMessage } from "./transcript-shaping.js";

const STATE_VERSION = 3;
const MAX_RECENT_MESSAGES = 8;
const MAX_MESSAGE_CHARS = 1_600;
const MAX_LEDGER_ITEMS = 8;
const MAX_LEDGER_EVENTS = 24;
const MAX_CONSTRAINTS = 8;

const DIRECTIVE_PATTERNS = [
  /\b(must|should|need to|keep|avoid|rewrite|revise|draft|continue)\b/i,
  /(必须|应该|需要|保持|避免|改写|修订|起草|继续|务必|不要|帮我|保留|修改|重写|补充)/u,
];
const FOCUS_PATTERNS = [
  /\b(chapter|scene|beat|outline|arc|conflict|reveal|climax|ending|opening)\b/i,
  /(章节|场景|情节|主线|冲突|揭示|高潮|结尾|开头|开场|转折|聚焦|重点)/u,
];
const CONSTRAINT_PATTERNS = [
  /\b(keep|avoid|tone|style|voice|pacing|continuity|canon|pov|tense)\b/i,
  /(保持|避免|不要|务必|尽量|语气|风格|口吻|节奏|连贯|设定|视角|时态|第一人称|第三人称)/u,
];
const ACTION_PATTERNS = [
  /\b(will|plan|next|draft|outline|revise|expand|tighten|continue|rewrite)\b/i,
  /(会|计划|下一步|起草|大纲|修订|扩写|精简|继续|重写|我会|我们会|接下来)/u,
];
const CONTINUITY_PATTERNS = [
  /\b(continuity|canon|foreshadow|callback|payoff|consistency)\b/i,
  /(连贯|设定|伏笔|呼应|回收|一致性|前文|延续|线索)/u,
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
const USER_DIRECTIVE_FALLBACK_PATTERNS = [
  /(请|帮我|务必|尽量|不要|避免|保持|继续|修改|重写|补充|总结|整理|列出|确认|对齐|采用|切换|保留|优化)/u,
  /\b(please|help me|must|should|need to|keep|avoid|continue|revise|rewrite|draft|update|change|improve)\b/i,
];
const INTERNAL_RUNTIME_EVENT_PATTERNS = [
  /\[Internal task completion event\]/i,
  /<<<BEGIN_UNTRUSTED_CHILD_RESULT>>>/i,
  /\bOpenClaw runtime context \(internal\):/i,
];
const REPORT_STYLE_ASSISTANT_PATTERNS = [
  /\b(completed|done|finished|submitted|delivered|reported|fulfilled|handled|resolved|verified|confirmed)\b/i,
  /\b(status update|progress update|handoff|deliverable|delivery note|checklist|submission|report mode)\b/i,
  /(?:\u5df2\u5b8c\u6210|\u5df2\u63d0\u4ea4|\u5df2\u5904\u7406|\u5df2\u9a8c\u8bc1|\u5df2\u5bf9\u9f50|\u5df2\u5151\u73b0|\u6c47\u62a5|\u72b6\u6001\u66f4\u65b0|\u4ea4\u4ed8|\u6e05\u5355|\u68c0\u67e5\u8868|\u91cc\u7a0b\u7891)/u,
];
const EVIDENCE_SUBSTANCE_PATTERNS = [
  /\b(remains?|still|visible|present|appears?|shown?|shows?|indicates?|supports?|contradicts?|matches?|found|observed|quoted?)\b/i,
  /\b(clue|chapter|scene|beat|line|lines|paragraph|section|quote|quotes|brief|ledger|packet|file|files|material|materials|evidence)\b/i,
  /(?:\u4ecd\u7136|\u4f9d\u7136|\u53ef\u89c1|\u51fa\u73b0|\u5728\u7b2c.{0,6}\u7ae0|\u7ebf\u7d22|\u8bc1\u636e|\u6750\u6599|\u6bb5\u843d|\u884c\u6587|\u6587\u4ef6)/u,
];

type SncSegment = {
  source: "user" | "assistant";
  text: string;
  timestamp?: number;
};

export type SncStateMessage = {
  role: "user" | "assistant";
  text: string;
  timestamp?: number;
};

export type SncLedgerEventKind = "directive" | "focus" | "assistant-plan" | "continuity";

export type SncLedgerEvent = {
  kind: SncLedgerEventKind;
  source: "user" | "assistant" | "system";
  text: string;
  timestamp?: number;
};

export type SncStoryLedger = {
  userDirectives: string[];
  assistantPlans: string[];
  continuityNotes: string[];
  events: SncLedgerEvent[];
};

export type SncChapterState = {
  focus?: string;
  latestUserDirective?: string;
  latestAssistantPlan?: string;
  constraints: string[];
};

export type SncSessionState = {
  version: number;
  sessionId: string;
  sessionKey?: string;
  agentScopeKey: string;
  agentKey: string;
  agentFamilyKey: string;
  agentRole: SncAgentRole;
  updatedAt: string;
  turnCount: number;
  recentMessages: SncStateMessage[];
  autoCompactionSummary?: string;
  storyLedger: SncStoryLedger;
  chapterState: SncChapterState;
};

export type SncSessionStateSectionMode =
  | "continuity"
  | "evidence-grounding"
  | "writing-prose";

type SncCorrectionPair = {
  preferred: string;
  rejected: string;
};

type SncTurnExtraction = {
  storyLedger: {
    userDirectives: string[];
    assistantPlans: string[];
    continuityNotes: string[];
  };
  chapterState: {
    focus?: string;
    latestUserDirective?: string;
    latestAssistantPlan?: string;
    constraints: string[];
  };
  events: SncLedgerEvent[];
};

function clampText(input: string, maxChars = MAX_MESSAGE_CHARS): string {
  const trimmed = input.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxChars).trimEnd()}...`;
}

function normalizeTextKey(input: string): string {
  return input.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const entries = new Map<string, string>();
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const trimmed = item.trim();
    if (!trimmed) {
      continue;
    }
    entries.set(normalizeTextKey(trimmed), trimmed);
  }
  return [...entries.values()];
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

function collectLatestUserTurnMessages(
  messages: SncSessionState["recentMessages"],
): SncStateMessage[] {
  const collected: SncStateMessage[] = [];
  let sawUser = false;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message) {
      continue;
    }
    if (message.role === "assistant" && !sawUser) {
      continue;
    }
    if (message.role === "assistant") {
      break;
    }
    sawUser = true;
    collected.push(message);
  }

  return collected.reverse();
}

function collectEvidenceCurrentUserDirectives(state: SncSessionState): string[] {
  const latestTurnUserMessages = collectLatestUserTurnMessages(state.recentMessages);
  if (latestTurnUserMessages.length > 0) {
    const segments = latestTurnUserMessages.flatMap((message) =>
      splitIntoSegments(message.text).map((text) => ({
        source: "user" as const,
        text,
        ...(message.timestamp !== undefined ? { timestamp: message.timestamp } : {}),
      })),
    );
    const latestUserSegment = segments.at(-1);
    const latestUserDirective =
      selectBestSegment(segments, DIRECTIVE_PATTERNS) ??
      (latestUserSegment && hasAnyMatch(latestUserSegment.text, USER_DIRECTIVE_FALLBACK_PATTERNS)
        ? latestUserSegment
        : undefined);
    if (latestUserDirective) {
      return [latestUserDirective.text];
    }
  }

  return state.chapterState.latestUserDirective ? [state.chapterState.latestUserDirective] : [];
}

function extractCorrectionPairsFromCurrentSupport(state: SncSessionState): SncCorrectionPair[] {
  const sources = [
    ...collectEvidenceCurrentUserDirectives(state),
    ...(state.chapterState.latestUserDirective ? [state.chapterState.latestUserDirective] : []),
    ...state.chapterState.constraints,
  ];
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

function filterAndSortCorrectionAwareEntries(
  entries: string[],
  pairs: SncCorrectionPair[],
): string[] {
  if (entries.length === 0) {
    return entries;
  }

  return entries
    .map((entry, index) => {
      let supportScore = 0;
      if (pairs.length > 0) {
        for (const pair of pairs) {
          const mentionsPreferred = containsNormalizedPhrase(entry, pair.preferred);
          const mentionsRejected = containsNormalizedPhrase(entry, pair.rejected);
          if (
            mentionsRejected &&
            !mentionsPreferred &&
            !isCorrectionGuardrailForRejected(entry, pair.rejected)
          ) {
            return null;
          }
          if (mentionsPreferred) {
            supportScore += 2;
          }
          if (mentionsRejected && isCorrectionGuardrailForRejected(entry, pair.rejected)) {
            supportScore += 1;
          }
        }
      }
      return { entry, index, supportScore };
    })
    .filter((entry): entry is { entry: string; index: number; supportScore: number } => Boolean(entry))
    .sort((left, right) => right.supportScore - left.supportScore || left.index - right.index)
    .map((entry) => entry.entry)
    .filter((entry, index, values) => {
      const normalized = normalizeTextKey(entry);
      return values.findIndex((candidate) => normalizeTextKey(candidate) === normalized) === index;
    });
}

function normalizeEvents(value: unknown): SncLedgerEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const events: SncLedgerEvent[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const kind = (item as { kind?: unknown }).kind;
    const source = (item as { source?: unknown }).source;
    const text = (item as { text?: unknown }).text;
    const timestamp = (item as { timestamp?: unknown }).timestamp;
    if (
      (kind !== "directive" &&
        kind !== "focus" &&
        kind !== "assistant-plan" &&
        kind !== "continuity") ||
      (source !== "user" && source !== "assistant" && source !== "system") ||
      typeof text !== "string"
    ) {
      continue;
    }
    events.push({
      kind,
      source,
      text,
      ...(typeof timestamp === "number" && Number.isFinite(timestamp) ? { timestamp } : {}),
    });
  }
  return events;
}

function normalizeStoryLedger(value: unknown): SncStoryLedger {
  if (!value || typeof value !== "object") {
    return {
      userDirectives: [],
      assistantPlans: [],
      continuityNotes: [],
      events: [],
    };
  }
  return {
    userDirectives: normalizeStringList((value as { userDirectives?: unknown }).userDirectives),
    assistantPlans: normalizeStringList((value as { assistantPlans?: unknown }).assistantPlans),
    continuityNotes: normalizeStringList((value as { continuityNotes?: unknown }).continuityNotes),
    events: normalizeEvents((value as { events?: unknown }).events),
  };
}

function normalizeChapterState(value: unknown): SncChapterState {
  if (!value || typeof value !== "object") {
    return { constraints: [] };
  }
  const focus = (value as { focus?: unknown }).focus;
  const latestUserDirective = (value as { latestUserDirective?: unknown }).latestUserDirective;
  const latestAssistantPlan = (value as { latestAssistantPlan?: unknown }).latestAssistantPlan;
  return {
    ...(typeof focus === "string" && focus.trim() ? { focus: focus.trim() } : {}),
    ...(typeof latestUserDirective === "string" && latestUserDirective.trim()
      ? { latestUserDirective: latestUserDirective.trim() }
      : {}),
    ...(typeof latestAssistantPlan === "string" && latestAssistantPlan.trim()
      ? { latestAssistantPlan: latestAssistantPlan.trim() }
      : {}),
    constraints: normalizeStringList((value as { constraints?: unknown }).constraints),
  };
}

function matchScore(text: string, patterns: RegExp[]): number {
  return patterns.reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0);
}

function hasAnyMatch(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function isInternalRuntimeEventText(text: string): boolean {
  return INTERNAL_RUNTIME_EVENT_PATTERNS.some((pattern) => pattern.test(text));
}

function splitIntoSegments(text: string): string[] {
  const segments: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/u, "").trim())
    .filter(Boolean);

  for (const line of lines) {
    const sentenceChunks = line
      .split(/(?<=[.!?;。！？；])\s*/u)
      .map((entry) => entry.trim())
      .filter(Boolean);
    const subsegments = sentenceChunks.length > 0 ? sentenceChunks : [line];
    for (const segment of subsegments) {
      const normalized = clampText(segment.replace(/\s+/g, " "));
      if (normalized.length >= 6) {
        segments.push(normalized);
      }
    }
  }

  const unique = new Map<string, string>();
  for (const segment of segments) {
    unique.set(normalizeTextKey(segment), segment);
  }
  return [...unique.values()];
}

function extractMessageText(message: AgentMessage): string | undefined {
  const content = (message as { content?: unknown }).content;

  if (typeof content === "string") {
    const normalized = clampText(content.replace(/\s+/g, " "));
    return normalized || undefined;
  }

  if (!Array.isArray(content)) {
    return undefined;
  }

  const chunks: string[] = [];
  for (const block of content) {
    if (!block || typeof block !== "object") {
      continue;
    }
    if ((block as { type?: unknown }).type !== "text") {
      continue;
    }
    const text = (block as { text?: unknown }).text;
    if (typeof text !== "string") {
      continue;
    }
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized) {
      chunks.push(normalized);
    }
  }

  const joined = clampText(chunks.join(" "));
  return joined || undefined;
}

function toStateMessage(message: AgentMessage): SncStateMessage | undefined {
  const role = (message as { role?: unknown }).role;
  if (role !== "user" && role !== "assistant") {
    return undefined;
  }

  const text = extractMessageText(message);
  if (!text) {
    return undefined;
  }

  if (role === "assistant" && isInternalRuntimeEventText(text)) {
    return undefined;
  }

  const timestamp = (message as { timestamp?: unknown }).timestamp;
  return {
    role,
    text,
    ...(typeof timestamp === "number" && Number.isFinite(timestamp) ? { timestamp } : {}),
  };
}

function extractSegments(messages: AgentMessage[]): SncSegment[] {
  const segments: SncSegment[] = [];
  for (const message of messages) {
    const stateMessage = toStateMessage(message);
    if (!stateMessage) {
      continue;
    }
    for (const text of splitIntoSegments(stateMessage.text)) {
      segments.push({
        source: stateMessage.role,
        text,
        ...(stateMessage.timestamp !== undefined ? { timestamp: stateMessage.timestamp } : {}),
      });
    }
  }
  return segments;
}

function selectBestSegment(segments: SncSegment[], patterns: RegExp[]): SncSegment | undefined {
  const ranked = segments
    .map((segment) => ({
      segment,
      score: matchScore(segment.text, patterns),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.segment;
}

function selectTopSegments(
  segments: SncSegment[],
  patterns: RegExp[],
  limit: number,
): SncSegment[] {
  const ranked = segments
    .map((segment) => ({
      segment,
      score: matchScore(segment.text, patterns),
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) => right.score - left.score || left.segment.text.length - right.segment.text.length,
    );

  const selected = new Map<string, SncSegment>();
  for (const entry of ranked) {
    const key = normalizeTextKey(entry.segment.text);
    if (!selected.has(key)) {
      selected.set(key, entry.segment);
    }
    if (selected.size >= limit) {
      break;
    }
  }
  return [...selected.values()];
}

function mergeTextWindow(existing: string[], incoming: string[], limit: number): string[] {
  const merged = new Map<string, string>();
  for (const entry of [...existing, ...incoming]) {
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    merged.set(normalizeTextKey(trimmed), trimmed);
  }
  return [...merged.values()].slice(-limit);
}

function mergeEventWindow(existing: SncLedgerEvent[], incoming: SncLedgerEvent[], limit: number): SncLedgerEvent[] {
  const merged = new Map<string, SncLedgerEvent>();
  for (const event of [...existing, ...incoming]) {
    const key = `${event.kind}:${event.source}:${normalizeTextKey(event.text)}`;
    merged.set(key, event);
  }
  return [...merged.values()].slice(-limit);
}

function buildEvent(
  kind: SncLedgerEventKind,
  segment: SncSegment | undefined,
): SncLedgerEvent | undefined {
  if (!segment) {
    return undefined;
  }
  return {
    kind,
    source: segment.source,
    text: segment.text,
    ...(segment.timestamp !== undefined ? { timestamp: segment.timestamp } : {}),
  };
}

function buildContinuityEvent(text: string): SncLedgerEvent {
  return {
    kind: "continuity",
    source: "system",
    text,
  };
}

function extractTurnState(params: {
  messages: AgentMessage[];
  autoCompactionSummary?: string;
}): SncTurnExtraction {
  const segments = extractSegments(params.messages);
  const userSegments = segments.filter((segment) => segment.source === "user");
  const assistantSegments = segments.filter((segment) => segment.source === "assistant");

  const latestUserSegment = userSegments.at(-1);
  const latestUserDirective =
    selectBestSegment(userSegments, DIRECTIVE_PATTERNS) ??
    (latestUserSegment && hasAnyMatch(latestUserSegment.text, USER_DIRECTIVE_FALLBACK_PATTERNS)
      ? latestUserSegment
      : undefined);
  const focus = selectBestSegment(segments, FOCUS_PATTERNS);
  const latestAssistantPlan = selectBestSegment(assistantSegments, ACTION_PATTERNS);
  const constraints = selectTopSegments(userSegments, CONSTRAINT_PATTERNS, 4);
  const continuityNotes = selectTopSegments(segments, CONTINUITY_PATTERNS, 3).map(
    (segment) => segment.text,
  );

  if (params.autoCompactionSummary?.trim()) {
    continuityNotes.push(clampText(params.autoCompactionSummary, MAX_MESSAGE_CHARS));
  }

  const events = [
    buildEvent("directive", latestUserDirective),
    buildEvent("focus", focus),
    buildEvent("assistant-plan", latestAssistantPlan),
    ...selectTopSegments(segments, CONTINUITY_PATTERNS, 2).map((segment) => ({
      kind: "continuity" as const,
      source: segment.source,
      text: segment.text,
      ...(segment.timestamp !== undefined ? { timestamp: segment.timestamp } : {}),
    })),
    ...(params.autoCompactionSummary?.trim()
      ? [buildContinuityEvent(clampText(params.autoCompactionSummary, MAX_MESSAGE_CHARS))]
      : []),
  ].filter((event): event is SncLedgerEvent => Boolean(event));

  return {
    storyLedger: {
      userDirectives: latestUserDirective ? [latestUserDirective.text] : [],
      assistantPlans: latestAssistantPlan ? [latestAssistantPlan.text] : [],
      continuityNotes: mergeTextWindow([], continuityNotes, 4),
    },
    chapterState: {
      ...(focus ? { focus: focus.text } : {}),
      ...(latestUserDirective ? { latestUserDirective: latestUserDirective.text } : {}),
      ...(latestAssistantPlan ? { latestAssistantPlan: latestAssistantPlan.text } : {}),
      constraints: constraints.map((segment) => segment.text),
    },
    events,
  };
}

function buildLegacySessionStateFilename(sessionId: string, sessionKey?: string): string {
  const rawLabel = sessionKey?.trim() || sessionId.trim() || "session";
  const slug = normalizeHyphenSlug(rawLabel) || "session";
  const hash = createHash("sha1").update(rawLabel).digest("hex").slice(0, 10);
  return `${slug}-${hash}.json`;
}

function buildSessionStatePath(stateDir: string, scopeKey: string): string {
  return path.join(stateDir, "sessions", buildSncScopedFilename(scopeKey));
}

function buildLegacySessionStatePath(stateDir: string, sessionId: string, sessionKey?: string): string {
  return path.join(stateDir, "sessions", buildLegacySessionStateFilename(sessionId, sessionKey));
}

export async function loadSncSessionState(params: {
  stateDir?: string;
  sessionId: string;
  sessionKey?: string;
}): Promise<SncSessionState | null> {
  if (!params.stateDir) {
    return null;
  }

  const scope = resolveSncAgentScope(params);
  const filePaths = [
    buildSessionStatePath(params.stateDir, scope.sessionScopeKey),
    buildLegacySessionStatePath(params.stateDir, params.sessionId, params.sessionKey),
  ];

  for (const filePath of filePaths) {
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<SncSessionState>;
      if (!parsed || typeof parsed !== "object") {
        continue;
      }

      const recentMessages = Array.isArray(parsed.recentMessages)
        ? parsed.recentMessages
            .map((entry) => {
              if (!entry || typeof entry !== "object") {
                return undefined;
              }
              const role = (entry as { role?: unknown }).role;
              const text = (entry as { text?: unknown }).text;
              const timestamp = (entry as { timestamp?: unknown }).timestamp;
              if ((role !== "user" && role !== "assistant") || typeof text !== "string") {
                return undefined;
              }
              return {
                role,
                text,
                ...(typeof timestamp === "number" && Number.isFinite(timestamp) ? { timestamp } : {}),
              } satisfies SncStateMessage;
            })
            .filter((entry): entry is SncStateMessage => Boolean(entry))
        : [];

      const persistedSessionId =
        typeof parsed.sessionId === "string" ? parsed.sessionId : params.sessionId;
      const persistedSessionKey =
        typeof parsed.sessionKey === "string" ? parsed.sessionKey : params.sessionKey;
      const persistedScope = resolveSncAgentScope({
        sessionId: persistedSessionId,
        sessionKey: persistedSessionKey,
      });

      return {
        version: typeof parsed.version === "number" ? parsed.version : STATE_VERSION,
        sessionId: persistedSessionId,
        ...(persistedSessionKey ? { sessionKey: persistedSessionKey } : {}),
        agentScopeKey:
          typeof parsed.agentScopeKey === "string"
            ? parsed.agentScopeKey
            : persistedScope.sessionScopeKey,
        agentKey:
          typeof parsed.agentKey === "string" ? parsed.agentKey : persistedScope.agentKey,
        agentFamilyKey:
          typeof parsed.agentFamilyKey === "string"
            ? parsed.agentFamilyKey
            : persistedScope.familyKey,
        agentRole:
          parsed.agentRole === "helper" || parsed.agentRole === "primary"
            ? parsed.agentRole
            : persistedScope.role,
        updatedAt:
          typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
        turnCount: typeof parsed.turnCount === "number" ? parsed.turnCount : 0,
        recentMessages,
        ...(typeof parsed.autoCompactionSummary === "string"
          ? { autoCompactionSummary: parsed.autoCompactionSummary }
          : {}),
        storyLedger: normalizeStoryLedger(parsed.storyLedger),
        chapterState: normalizeChapterState(parsed.chapterState),
      };
    } catch {
      // Try next path for backward compatibility.
    }
  }

  return null;
}

export async function persistSncSessionState(params: {
  stateDir?: string;
  sessionId: string;
  sessionKey?: string;
  messages: AgentMessage[];
  prePromptMessageCount: number;
  autoCompactionSummary?: string;
}): Promise<SncSessionState | null> {
  if (!params.stateDir) {
    return null;
  }

  const scope = resolveSncAgentScope(params);
  const filePath = buildSessionStatePath(params.stateDir, scope.sessionScopeKey);
  const existing = await loadSncSessionState({
    stateDir: params.stateDir,
    sessionId: params.sessionId,
    sessionKey: params.sessionKey,
  });

  const turnMessages = params.messages.slice(params.prePromptMessageCount);
  const newMessages = turnMessages
    .map((message) => toStateMessage(message))
    .filter((message): message is SncStateMessage => Boolean(message));
  const extracted = extractTurnState({
    messages: turnMessages,
    autoCompactionSummary: params.autoCompactionSummary,
  });

  const storyLedger = {
    userDirectives: mergeTextWindow(
      existing?.storyLedger.userDirectives ?? [],
      extracted.storyLedger.userDirectives,
      MAX_LEDGER_ITEMS,
    ),
    assistantPlans: mergeTextWindow(
      existing?.storyLedger.assistantPlans ?? [],
      extracted.storyLedger.assistantPlans,
      MAX_LEDGER_ITEMS,
    ),
    continuityNotes: mergeTextWindow(
      existing?.storyLedger.continuityNotes ?? [],
      extracted.storyLedger.continuityNotes,
      MAX_LEDGER_ITEMS,
    ),
    events: mergeEventWindow(existing?.storyLedger.events ?? [], extracted.events, MAX_LEDGER_EVENTS),
  };

  const chapterState = {
    ...(extracted.chapterState.focus ?? existing?.chapterState.focus
      ? { focus: extracted.chapterState.focus ?? existing?.chapterState.focus }
      : {}),
    ...(extracted.chapterState.latestUserDirective ?? existing?.chapterState.latestUserDirective
      ? {
          latestUserDirective:
            extracted.chapterState.latestUserDirective ?? existing?.chapterState.latestUserDirective,
        }
      : {}),
    ...(extracted.chapterState.latestAssistantPlan ?? existing?.chapterState.latestAssistantPlan
      ? {
          latestAssistantPlan:
            extracted.chapterState.latestAssistantPlan ?? existing?.chapterState.latestAssistantPlan,
        }
      : {}),
    constraints: mergeTextWindow(
      existing?.chapterState.constraints ?? [],
      extracted.chapterState.constraints,
      MAX_CONSTRAINTS,
    ),
  };

  const nextState: SncSessionState = {
    version: STATE_VERSION,
    sessionId: params.sessionId,
    ...(params.sessionKey ? { sessionKey: params.sessionKey } : {}),
    agentScopeKey: scope.sessionScopeKey,
    agentKey: scope.agentKey,
    agentFamilyKey: scope.familyKey,
    agentRole: scope.role,
    updatedAt: new Date().toISOString(),
    turnCount: (existing?.turnCount ?? 0) + (newMessages.length > 0 ? 1 : 0),
    recentMessages: [...(existing?.recentMessages ?? []), ...newMessages].slice(-MAX_RECENT_MESSAGES),
    ...(params.autoCompactionSummary
      ? { autoCompactionSummary: clampText(params.autoCompactionSummary, MAX_MESSAGE_CHARS) }
      : existing?.autoCompactionSummary
        ? { autoCompactionSummary: existing.autoCompactionSummary }
        : {}),
    storyLedger,
    chapterState,
  };

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
  return nextState;
}

function appendSection(lines: string[], title: string, entries: string[]): void {
  if (entries.length === 0) {
    return;
  }
  lines.push("", title);
  for (const entry of entries) {
    lines.push(`- ${entry}`);
  }
}

function appendConstraints(lines: string[], constraints: string[]): void {
  if (constraints.length === 0) {
    return;
  }
  lines.push("- constraints:");
  for (const constraint of constraints) {
    lines.push(`  - ${constraint}`);
  }
}

function appendRecentMessages(
  lines: string[],
  messages: SncSessionState["recentMessages"],
  title = "Recent messages:",
): void {
  if (messages.length === 0) {
    return;
  }
  lines.push("", title);
  for (const message of messages) {
    const label = message.role === "assistant" ? "ASSISTANT" : "USER";
    lines.push(`- ${label}: ${message.text}`);
  }
}

function collectEvidenceSecondaryContinuityCues(state: SncSessionState): string[] {
  const correctionPairs = extractCorrectionPairsFromCurrentSupport(state);
  const assistantCue = resolvePromptFacingAssistantCue(
    state.chapterState.latestAssistantPlan,
    "evidence-grounding",
  );
  const filteredContinuityNotes = state.storyLedger.continuityNotes
    .slice(-2)
    .filter((entry) => shouldRetainPromptFacingAssistantText(entry, "evidence-grounding"));
  return filterAndSortCorrectionAwareEntries([
    ...(assistantCue ? [assistantCue] : []),
    ...filteredContinuityNotes,
  ], correctionPairs);
}

function isReportStyleAssistantText(text: string): boolean {
  return REPORT_STYLE_ASSISTANT_PATTERNS.some((pattern) => pattern.test(text));
}

function hasEvidenceHistoricalSubstance(text: string): boolean {
  return hasAnyMatch(text, CONTINUITY_PATTERNS) || hasAnyMatch(text, EVIDENCE_SUBSTANCE_PATTERNS);
}

function shouldRetainPromptFacingAssistantText(
  text: string,
  mode: SncSessionStateSectionMode,
): boolean {
  const classification = analyzeSncTranscriptMessage({
    role: "assistant",
    content: text,
  } as unknown as AgentMessage).classification;

  if (classification === "assistant-ack" || classification === "assistant-meta") {
    return false;
  }

  if (mode === "evidence-grounding") {
    if (classification === "assistant-plan" && !hasEvidenceHistoricalSubstance(text)) {
      return false;
    }
    if (isReportStyleAssistantText(text) && !hasEvidenceHistoricalSubstance(text)) {
      return false;
    }
  }

  if (mode === "writing-prose" && isReportStyleAssistantText(text)) {
    return false;
  }

  if (mode === "writing-prose" && classification === "assistant-plan") {
    return hasAnyMatch(text, CONTINUITY_PATTERNS);
  }

  return true;
}

function resolvePromptFacingAssistantCue(
  text: string | undefined,
  mode: SncSessionStateSectionMode,
): string | undefined {
  if (!text) {
    return undefined;
  }
  return shouldRetainPromptFacingAssistantText(text, mode) ? text : undefined;
}

function filterPromptFacingRecentMessages(
  messages: ReadonlyArray<SncStateMessage>,
  mode: SncSessionStateSectionMode,
): SncStateMessage[] {
  return messages.filter((message) => {
    if (message.role !== "assistant") {
      return true;
    }
    return shouldRetainPromptFacingAssistantText(message.text, mode);
  });
}

export function buildSncEvidenceCurrentSupportSection(
  state: SncSessionState,
): string | undefined {
  const currentUserDirectives = collectEvidenceCurrentUserDirectives(state);
  const hasCurrentSupport =
    currentUserDirectives.length > 0 ||
    Boolean(state.chapterState.focus) ||
    Boolean(state.chapterState.latestUserDirective) ||
    state.chapterState.constraints.length > 0;

  if (!hasCurrentSupport) {
    return undefined;
  }

  const lines = [`updatedAt: ${state.updatedAt}`, `turnCount: ${state.turnCount}`];
  lines.push("", "Evidence-grounding mode:");
  lines.push("- current materials and current-turn wording outrank continuity carry-forward");
  lines.push("- if current coverage is partial, say what you covered and what remains uncovered");
  lines.push("- do not let old continuity imply that direct inspection is already complete");
  lines.push("", "Current-turn support:");
  appendSection(lines, "User directives:", currentUserDirectives);
  if (state.chapterState.focus) {
    lines.push(`- focus: ${state.chapterState.focus}`);
  }
  if (state.chapterState.latestUserDirective) {
    lines.push(`- latestUserDirective: ${state.chapterState.latestUserDirective}`);
  }
  appendConstraints(lines, state.chapterState.constraints);
  return lines.join("\n");
}

export function buildSncEvidenceHistoricalSupportSection(
  state: SncSessionState,
): string | undefined {
  const secondaryContinuityCues = collectEvidenceSecondaryContinuityCues(state);
  const correctionPairs = extractCorrectionPairsFromCurrentSupport(state);
  const secondaryCueKeys = new Set(secondaryContinuityCues.map((entry) => normalizeTextKey(entry)));
  const filteredRecentMessages = filterAndSortCorrectionAwareEntries(
    state.recentMessages.map((message) => `${message.role === "assistant" ? "ASSISTANT" : "USER"}: ${message.text}`),
    correctionPairs,
  ).map((line) => {
    const role = line.startsWith("ASSISTANT:") ? "assistant" : "user";
    const text = line.replace(/^(?:ASSISTANT|USER):\s*/, "");
    return { role, text } as const;
  });
  const promptFacingRecentMessages = filterPromptFacingRecentMessages(
    filteredRecentMessages.map((message) => ({
      role: message.role,
      text: message.text,
    })),
    "evidence-grounding",
  ).filter((message) => message.role !== "assistant" || !secondaryCueKeys.has(normalizeTextKey(message.text)));
  const hasHistoricalSupport =
    secondaryContinuityCues.length > 0 ||
    promptFacingRecentMessages.length > 0 ||
    Boolean(state.autoCompactionSummary);

  if (!hasHistoricalSupport) {
    return undefined;
  }

  const lines = [
    "Use this only for contradiction avoidance, terminology stability, and bounded carry-forward.",
    "Do not treat it as proof that current materials were fully inspected.",
  ];

  if (state.autoCompactionSummary) {
    lines.push("", `autoCompactionSummary: ${state.autoCompactionSummary}`);
  }
  appendSection(lines, "Secondary continuity cues:", secondaryContinuityCues);
  appendRecentMessages(lines, promptFacingRecentMessages, "Recent messages (secondary context):");
  return lines.join("\n");
}

export function buildSncSessionStateSection(
  state: SncSessionState,
  options: { mode?: SncSessionStateSectionMode } = {},
): string | undefined {
  const hasStructuredState =
    state.storyLedger.userDirectives.length > 0 ||
    state.storyLedger.assistantPlans.length > 0 ||
    state.storyLedger.continuityNotes.length > 0 ||
    Boolean(state.chapterState.focus) ||
    Boolean(state.chapterState.latestUserDirective) ||
    Boolean(state.chapterState.latestAssistantPlan) ||
    state.chapterState.constraints.length > 0;

  if (!hasStructuredState && state.recentMessages.length === 0 && !state.autoCompactionSummary) {
    return undefined;
  }

  const lines = [`updatedAt: ${state.updatedAt}`, `turnCount: ${state.turnCount}`];
  if (state.autoCompactionSummary) {
    lines.push(`autoCompactionSummary: ${state.autoCompactionSummary}`);
  }

  const evidenceGroundingMode = options.mode === "evidence-grounding";
  const writingDraftMode = options.mode === "writing-prose";
  const promptFacingAssistantCue = resolvePromptFacingAssistantCue(
    state.chapterState.latestAssistantPlan,
    options.mode ?? "continuity",
  );
  const promptFacingRecentMessages = filterPromptFacingRecentMessages(
    state.recentMessages,
    options.mode ?? "continuity",
  );

  if (hasStructuredState) {
    if (evidenceGroundingMode) {
      lines.push("", "Evidence-grounding mode:");
      lines.push("- prioritize current materials and explicit task wording before continuity carry-forward");
      lines.push("- treat assistant plans and continuity cues as secondary unless current materials support them");
      lines.push("", "Working state:");
      appendSection(lines, "User directives:", state.storyLedger.userDirectives);
    } else if (writingDraftMode) {
      lines.push("", "Writing-draft mode:");
      lines.push("- deliver the draft itself first and treat continuity as support, not as a preamble");
      lines.push("- keep assistant planning cues secondary unless the user explicitly asks for plan or outline");
      lines.push("", "Continuity cues:");
      appendSection(lines, "User directives:", state.storyLedger.userDirectives);
      appendSection(lines, "Continuity notes:", state.storyLedger.continuityNotes);
      lines.push("", "Active draft state:");
    } else {
      lines.push("", "Continuity ledger:");
      appendSection(lines, "User directives:", state.storyLedger.userDirectives);
      appendSection(lines, "Assistant plans:", state.storyLedger.assistantPlans);
      appendSection(lines, "Continuity notes:", state.storyLedger.continuityNotes);
      lines.push("", "Active state:");
    }

    if (state.chapterState.focus) {
      lines.push(`- focus: ${state.chapterState.focus}`);
    }
    if (state.chapterState.latestUserDirective) {
      lines.push(`- latestUserDirective: ${state.chapterState.latestUserDirective}`);
    }
    if (promptFacingAssistantCue && !writingDraftMode && !evidenceGroundingMode) {
      lines.push(`- latestAssistantPlan: ${promptFacingAssistantCue}`);
    } else if (promptFacingAssistantCue && writingDraftMode) {
      lines.push(`- secondaryAssistantCue: ${promptFacingAssistantCue}`);
    }
    appendConstraints(lines, state.chapterState.constraints);

    if (evidenceGroundingMode) {
      const secondaryContinuityCues = collectEvidenceSecondaryContinuityCues(state);
      appendSection(
        lines,
        "Secondary continuity cues:",
        secondaryContinuityCues,
      );
    }
  }

  appendRecentMessages(lines, promptFacingRecentMessages);

  return lines.join("\n");
}
