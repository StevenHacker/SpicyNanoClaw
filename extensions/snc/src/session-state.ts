import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { normalizeHyphenSlug } from "openclaw/plugin-sdk/core";
import {
  analyzeSncHumanity,
  type SncHumanityDiagnostics,
} from "./humanity-lint.js";

const STATE_VERSION = 4;
const MAX_RECENT_MESSAGES = 8;
const MAX_MESSAGE_CHARS = 1_600;
const MAX_LEDGER_ITEMS = 8;
const MAX_LEDGER_EVENTS = 24;
const MAX_CONSTRAINTS = 8;
const MAX_SCENE_ITEMS = 5;

const DIRECTIVE_PATTERNS = [
  /\b(must|should|need to|keep|avoid|rewrite|revise|draft|continue)\b/i,
  /(必须|应该|需要|保持|避免|改写|修改|起草|续写|继续)/,
];
const PRIMARY_DIRECTIVE_PATTERNS = [
  /\b(write|draft|continue|revise|rewrite|outline|expand|chapter|scene)\b/i,
  /(写|起草|续写|继续|改写|重写|提纲|扩写|章节|场景)/,
];
const FOCUS_PATTERNS = [
  /\b(chapter|scene|beat|outline|arc|conflict|reveal|climax|ending|opening)\b/i,
  /(章节|场景|大纲|主线|弧光|冲突|揭示|高潮|结尾|开头)/,
];
const CONSTRAINT_PATTERNS = [
  /\b(keep|avoid|tone|style|voice|pacing|continuity|canon|pov|tense)\b/i,
  /(保持|避免|语气|风格|口吻|节奏|连贯|设定|视角|时态)/,
];
const ACTION_PATTERNS = [
  /\b(will|plan|next|draft|outline|revise|expand|tighten|continue|rewrite)\b/i,
  /(将会|计划|下一步|起草|大纲|修改|扩写|收紧|继续|改写)/,
];
const CONTINUITY_PATTERNS = [
  /\b(continuity|canon|foreshadow|callback|payoff|consistency)\b/i,
  /(连贯|设定|伏笔|呼应|回收|一致性)/,
];
const OBJECTIVE_PATTERNS = [
  /\b(goal|objective|must|need to|recover|deliver|reach|protect|escape)\b/i,
  /(目标|必须|需要|夺回|送到|找到|保护|逃离|完成)/,
];
const CONFLICT_PATTERNS = [
  /\b(conflict|danger|risk|threat|obstacle|pressure|deadline|stakes)\b/i,
  /(冲突|危险|风险|威胁|阻碍|压力|时限|代价|追兵|审讯)/,
];
const AVOID_PATTERNS = [
  /\b(avoid|do not|don't|must not|never)\b/i,
  /(避免|不要|不得|禁止|别用|不能)/,
];
const OUTLINE_PATTERNS = [/\b(outline|bullet|beats?)\b/i, /(提纲|大纲|项目符号|要点|分点)/];
const REVISE_PATTERNS = [/\b(revise|rewrite|edit|polish)\b/i, /(改写|重写|修改|润色|调整)/];
const CONTINUE_PATTERNS = [/\b(continue|next scene|carry on)\b/i, /(续写|继续|接着写|下一场)/];
const DRAFT_PATTERNS = [/\b(write|draft|scene|chapter|opening|prose)\b/i, /(写|起草|场景|章节|开场|正文)/];

const DEFAULT_ANTI_AI_AVOIDS = [
  "Do not explain the setup before entering the scene.",
  "Do not close with a generic summarizing sentence.",
  "Do not replace character action with abstract commentary.",
];
const TRANSPORT_METADATA_PATTERNS = [
  /^Conversation info \(untrusted metadata\):\s*```json[\s\S]*?```\s*/u,
  /^Sender \(untrusted metadata\):\s*```json[\s\S]*?```\s*/u,
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

export type SncScenePacketMode = "draft" | "continue" | "revise" | "outline" | "unknown";

export type SncStyleProfile = {
  directives: string[];
  avoid: string[];
};

export type SncScenePacket = {
  mode: SncScenePacketMode;
  focus?: string;
  objective?: string;
  conflict?: string;
  mustKeep: string[];
  avoid: string[];
  continuityHooks: string[];
};

export type SncSessionState = {
  version: number;
  sessionId: string;
  sessionKey?: string;
  updatedAt: string;
  turnCount: number;
  recentMessages: SncStateMessage[];
  autoCompactionSummary?: string;
  storyLedger: SncStoryLedger;
  chapterState: SncChapterState;
  styleProfile: SncStyleProfile;
  scenePacket: SncScenePacket;
  humanityDiagnostics?: SncHumanityDiagnostics;
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
  styleProfile: SncStyleProfile;
  scenePacket: SncScenePacket;
  humanityDiagnostics?: SncHumanityDiagnostics;
  events: SncLedgerEvent[];
};

function clampText(input: string, maxChars = MAX_MESSAGE_CHARS): string {
  const trimmed = input.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxChars).trimEnd()}...`;
}

function stripLeadingTransportMetadata(input: string): string {
  let current = input.trim();
  let changed = true;

  while (changed && current.length > 0) {
    changed = false;
    for (const pattern of TRANSPORT_METADATA_PATTERNS) {
      const next = current.replace(pattern, "").trimStart();
      if (next !== current) {
        current = next;
        changed = true;
      }
    }
  }

  return current;
}

function sanitizeStateText(input: string, maxChars = MAX_MESSAGE_CHARS): string {
  return clampText(stripLeadingTransportMetadata(input), maxChars);
}

function normalizeTextKey(input: string): string {
  return input.replace(/\s+/g, " ").trim().toLowerCase();
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
    const trimmed = sanitizeStateText(item);
    if (!trimmed) {
      continue;
    }
    entries.set(normalizeTextKey(trimmed), trimmed);
  }
  return [...entries.values()];
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
    const normalizedText = sanitizeStateText(text);
    if (!normalizedText) {
      continue;
    }
    events.push({
      kind,
      source,
      text: normalizedText,
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
    ...(typeof focus === "string" && sanitizeStateText(focus)
      ? { focus: sanitizeStateText(focus) }
      : {}),
    ...(typeof latestUserDirective === "string" && sanitizeStateText(latestUserDirective)
      ? { latestUserDirective: sanitizeStateText(latestUserDirective) }
      : {}),
    ...(typeof latestAssistantPlan === "string" && sanitizeStateText(latestAssistantPlan)
      ? { latestAssistantPlan: sanitizeStateText(latestAssistantPlan) }
      : {}),
    constraints: normalizeStringList((value as { constraints?: unknown }).constraints),
  };
}

function normalizeStyleProfile(value: unknown): SncStyleProfile {
  if (!value || typeof value !== "object") {
    return { directives: [], avoid: [] };
  }
  return {
    directives: normalizeStringList((value as { directives?: unknown }).directives),
    avoid: normalizeStringList((value as { avoid?: unknown }).avoid),
  };
}

function normalizeScenePacketMode(value: unknown): SncScenePacketMode {
  return value === "draft" ||
    value === "continue" ||
    value === "revise" ||
    value === "outline" ||
    value === "unknown"
    ? value
    : "unknown";
}

function normalizeScenePacket(value: unknown): SncScenePacket {
  if (!value || typeof value !== "object") {
    return {
      mode: "unknown",
      mustKeep: [],
      avoid: [],
      continuityHooks: [],
    };
  }
  const focus = (value as { focus?: unknown }).focus;
  const objective = (value as { objective?: unknown }).objective;
  const conflict = (value as { conflict?: unknown }).conflict;
  return {
    mode: normalizeScenePacketMode((value as { mode?: unknown }).mode),
    ...(typeof focus === "string" && sanitizeStateText(focus)
      ? { focus: sanitizeStateText(focus) }
      : {}),
    ...(typeof objective === "string" && sanitizeStateText(objective)
      ? { objective: sanitizeStateText(objective) }
      : {}),
    ...(typeof conflict === "string" && sanitizeStateText(conflict)
      ? { conflict: sanitizeStateText(conflict) }
      : {}),
    mustKeep: normalizeStringList((value as { mustKeep?: unknown }).mustKeep),
    avoid: normalizeStringList((value as { avoid?: unknown }).avoid),
    continuityHooks: normalizeStringList((value as { continuityHooks?: unknown }).continuityHooks),
  };
}

function normalizeHumanityDiagnostics(value: unknown): SncHumanityDiagnostics | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const parseNumber = (entry: unknown): number =>
    typeof entry === "number" && Number.isFinite(entry) ? entry : 0;
  const risk = (value as { risk?: unknown }).risk;

  return {
    sentenceCount: parseNumber((value as { sentenceCount?: unknown }).sentenceCount),
    briefingSignals: parseNumber((value as { briefingSignals?: unknown }).briefingSignals),
    abstractSignals: parseNumber((value as { abstractSignals?: unknown }).abstractSignals),
    sensorySignals: parseNumber((value as { sensorySignals?: unknown }).sensorySignals),
    actionSignals: parseNumber((value as { actionSignals?: unknown }).actionSignals),
    agencySignals: parseNumber((value as { agencySignals?: unknown }).agencySignals),
    templateClosureSignals: parseNumber(
      (value as { templateClosureSignals?: unknown }).templateClosureSignals,
    ),
    repeatedStarts: parseNumber((value as { repeatedStarts?: unknown }).repeatedStarts),
    translationeseSignals: parseNumber(
      (value as { translationeseSignals?: unknown }).translationeseSignals,
    ),
    risk: risk === "low" || risk === "moderate" || risk === "high" ? risk : "low",
    warnings: normalizeStringList((value as { warnings?: unknown }).warnings),
    strengths: normalizeStringList((value as { strengths?: unknown }).strengths),
    recommendedDirectives: normalizeStringList(
      (value as { recommendedDirectives?: unknown }).recommendedDirectives,
    ),
    recommendedAvoids: normalizeStringList(
      (value as { recommendedAvoids?: unknown }).recommendedAvoids,
    ),
  };
}

function matchScore(text: string, patterns: RegExp[]): number {
  return patterns.reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0);
}

function splitIntoSegments(text: string): string[] {
  const segments: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);

  for (const line of lines) {
    const sentenceChunks = line
      .split(/(?<=[.!?。！？；;])\s*/)
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
    const normalized = sanitizeStateText(content.replace(/\s+/g, " "));
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

  const joined = sanitizeStateText(chunks.join(" "));
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

function selectBestSegment(
  segments: SncSegment[],
  patterns: RegExp[],
  fallback?: SncSegment,
): SncSegment | undefined {
  const ranked = segments
    .map((segment, index) => ({
      segment,
      score: matchScore(segment.text, patterns),
      index,
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        (right.segment.timestamp ?? Number.NEGATIVE_INFINITY) -
          (left.segment.timestamp ?? Number.NEGATIVE_INFINITY) ||
        right.index - left.index,
    );

  return ranked[0]?.segment ?? fallback;
}

function selectTopSegments(
  segments: SncSegment[],
  patterns: RegExp[],
  limit: number,
): SncSegment[] {
  const ranked = segments
    .map((segment, index) => ({
      segment,
      score: matchScore(segment.text, patterns),
      index,
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        (right.segment.timestamp ?? Number.NEGATIVE_INFINITY) -
          (left.segment.timestamp ?? Number.NEGATIVE_INFINITY) ||
        right.index - left.index ||
        left.segment.text.length - right.segment.text.length,
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

function detectScenePacketMode(input: string | undefined): SncScenePacketMode {
  const text = input?.trim();
  if (!text) {
    return "unknown";
  }
  if (OUTLINE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "outline";
  }
  if (REVISE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "revise";
  }
  if (CONTINUE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "continue";
  }
  if (DRAFT_PATTERNS.some((pattern) => pattern.test(text))) {
    return "draft";
  }
  return "unknown";
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
  const stateMessages = params.messages
    .map((message) => toStateMessage(message))
    .filter((message): message is SncStateMessage => Boolean(message));
  const segments = extractSegments(params.messages);
  const userSegments = segments.filter((segment) => segment.source === "user");
  const assistantSegments = segments.filter((segment) => segment.source === "assistant");
  const assistantMessages = stateMessages.filter((message) => message.role === "assistant");

  const latestUserSegment = userSegments.at(-1);
  const latestAssistantSegment = assistantSegments.at(-1);
  const latestAssistantMessage = assistantMessages.at(-1);

  const latestUserDirective = selectBestSegment(
    userSegments,
    PRIMARY_DIRECTIVE_PATTERNS,
    latestUserSegment,
  );
  const focus =
    selectBestSegment(userSegments, FOCUS_PATTERNS, latestUserDirective ?? latestUserSegment) ??
    selectBestSegment(assistantSegments, FOCUS_PATTERNS, latestAssistantSegment);
  const latestAssistantPlan = selectBestSegment(
    assistantSegments,
    ACTION_PATTERNS,
    latestAssistantSegment,
  );
  const constraints = selectTopSegments(userSegments, CONSTRAINT_PATTERNS, 4);
  const styleDirectives = constraints.map((segment) => segment.text);
  const explicitAvoids = selectTopSegments(userSegments, AVOID_PATTERNS, 3).map(
    (segment) => segment.text,
  );
  const continuityNotes = selectTopSegments(segments, CONTINUITY_PATTERNS, 3).map(
    (segment) => segment.text,
  );
  const objective = selectBestSegment(
    userSegments,
    OBJECTIVE_PATTERNS,
    latestUserDirective ?? focus ?? latestUserSegment,
  );
  const conflict = selectBestSegment(segments, CONFLICT_PATTERNS);
  const mustKeep = mergeTextWindow(
    constraints.map((segment) => segment.text),
    continuityNotes,
    MAX_SCENE_ITEMS,
  );
  const avoid = mergeTextWindow(explicitAvoids, DEFAULT_ANTI_AI_AVOIDS, MAX_SCENE_ITEMS);
  const sceneMode = detectScenePacketMode(latestUserDirective?.text ?? latestUserSegment?.text);
  const humanityDiagnostics = analyzeSncHumanity(latestAssistantMessage?.text);

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
    styleProfile: {
      directives: mergeTextWindow([], styleDirectives, MAX_CONSTRAINTS),
      avoid,
    },
    scenePacket: {
      mode: sceneMode,
      ...(focus ? { focus: focus.text } : {}),
      ...(objective ? { objective: objective.text } : {}),
      ...(conflict ? { conflict: conflict.text } : {}),
      mustKeep,
      avoid,
      continuityHooks: mergeTextWindow([], continuityNotes, MAX_SCENE_ITEMS),
    },
    ...(humanityDiagnostics ? { humanityDiagnostics } : {}),
    events,
  };
}

function buildSessionStateFilename(sessionId: string, sessionKey?: string): string {
  const rawLabel = sessionKey?.trim() || sessionId.trim() || "session";
  const slug = normalizeHyphenSlug(rawLabel) || "session";
  const hash = createHash("sha1").update(rawLabel).digest("hex").slice(0, 10);
  return `${slug}-${hash}.json`;
}

function buildSessionStatePath(stateDir: string, sessionId: string, sessionKey?: string): string {
  return path.join(stateDir, "sessions", buildSessionStateFilename(sessionId, sessionKey));
}

export async function loadSncSessionState(params: {
  stateDir?: string;
  sessionId: string;
  sessionKey?: string;
}): Promise<SncSessionState | null> {
  if (!params.stateDir) {
    return null;
  }

  const filePath = buildSessionStatePath(params.stateDir, params.sessionId, params.sessionKey);

  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<SncSessionState>;
    if (!parsed || typeof parsed !== "object") {
      return null;
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
            const normalizedText = sanitizeStateText(text);
            if (!normalizedText) {
              return undefined;
            }
            return {
              role,
              text: normalizedText,
              ...(typeof timestamp === "number" && Number.isFinite(timestamp)
                ? { timestamp }
                : {}),
            } satisfies SncStateMessage;
          })
          .filter((entry): entry is SncStateMessage => Boolean(entry))
      : [];

    return {
      version: typeof parsed.version === "number" ? parsed.version : STATE_VERSION,
      sessionId: typeof parsed.sessionId === "string" ? parsed.sessionId : params.sessionId,
      ...(typeof parsed.sessionKey === "string" ? { sessionKey: parsed.sessionKey } : {}),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
      turnCount: typeof parsed.turnCount === "number" ? parsed.turnCount : 0,
      recentMessages,
      ...(typeof parsed.autoCompactionSummary === "string"
        ? { autoCompactionSummary: parsed.autoCompactionSummary }
        : {}),
      storyLedger: normalizeStoryLedger(parsed.storyLedger),
      chapterState: normalizeChapterState(parsed.chapterState),
      styleProfile: normalizeStyleProfile(parsed.styleProfile),
      scenePacket: normalizeScenePacket(parsed.scenePacket),
      ...(normalizeHumanityDiagnostics(parsed.humanityDiagnostics)
        ? { humanityDiagnostics: normalizeHumanityDiagnostics(parsed.humanityDiagnostics) }
        : {}),
    };
  } catch {
    return null;
  }
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

  const filePath = buildSessionStatePath(params.stateDir, params.sessionId, params.sessionKey);
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
    events: mergeEventWindow(
      existing?.storyLedger.events ?? [],
      extracted.events,
      MAX_LEDGER_EVENTS,
    ),
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
  const styleProfile = {
    directives: mergeTextWindow(
      existing?.styleProfile.directives ?? [],
      extracted.styleProfile.directives,
      MAX_CONSTRAINTS,
    ),
    avoid: mergeTextWindow(
      existing?.styleProfile.avoid ?? [],
      extracted.styleProfile.avoid,
      MAX_SCENE_ITEMS,
    ),
  };
  const scenePacket = {
    mode:
      extracted.scenePacket.mode !== "unknown"
        ? extracted.scenePacket.mode
        : existing?.scenePacket.mode ?? "unknown",
    ...(extracted.scenePacket.focus ?? existing?.scenePacket.focus
      ? { focus: extracted.scenePacket.focus ?? existing?.scenePacket.focus }
      : {}),
    ...(extracted.scenePacket.objective ?? existing?.scenePacket.objective
      ? { objective: extracted.scenePacket.objective ?? existing?.scenePacket.objective }
      : {}),
    ...(extracted.scenePacket.conflict ?? existing?.scenePacket.conflict
      ? { conflict: extracted.scenePacket.conflict ?? existing?.scenePacket.conflict }
      : {}),
    mustKeep: mergeTextWindow(
      existing?.scenePacket.mustKeep ?? [],
      extracted.scenePacket.mustKeep,
      MAX_SCENE_ITEMS,
    ),
    avoid: mergeTextWindow(existing?.scenePacket.avoid ?? [], extracted.scenePacket.avoid, MAX_SCENE_ITEMS),
    continuityHooks: mergeTextWindow(
      existing?.scenePacket.continuityHooks ?? [],
      extracted.scenePacket.continuityHooks,
      MAX_SCENE_ITEMS,
    ),
  };

  const nextState: SncSessionState = {
    version: STATE_VERSION,
    sessionId: params.sessionId,
    ...(params.sessionKey ? { sessionKey: params.sessionKey } : {}),
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
    styleProfile,
    scenePacket,
    ...(extracted.humanityDiagnostics ?? existing?.humanityDiagnostics
      ? {
          humanityDiagnostics:
            extracted.humanityDiagnostics ?? existing?.humanityDiagnostics,
        }
      : {}),
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

export function buildSncSessionStateSection(state: SncSessionState): string | undefined {
  const hasStructuredState =
    state.storyLedger.userDirectives.length > 0 ||
    state.storyLedger.assistantPlans.length > 0 ||
    state.storyLedger.continuityNotes.length > 0 ||
    Boolean(state.chapterState.focus) ||
    Boolean(state.chapterState.latestUserDirective) ||
    Boolean(state.chapterState.latestAssistantPlan) ||
    state.chapterState.constraints.length > 0 ||
    state.styleProfile.directives.length > 0 ||
    state.styleProfile.avoid.length > 0 ||
    state.scenePacket.mode !== "unknown" ||
    Boolean(state.scenePacket.focus) ||
    Boolean(state.scenePacket.objective) ||
    Boolean(state.scenePacket.conflict) ||
    state.scenePacket.mustKeep.length > 0 ||
    state.scenePacket.avoid.length > 0 ||
    state.scenePacket.continuityHooks.length > 0 ||
    Boolean(state.humanityDiagnostics);

  if (!hasStructuredState && state.recentMessages.length === 0 && !state.autoCompactionSummary) {
    return undefined;
  }

  const lines = [`updatedAt: ${state.updatedAt}`, `turnCount: ${state.turnCount}`];
  if (state.autoCompactionSummary) {
    lines.push(`autoCompactionSummary: ${state.autoCompactionSummary}`);
  }

  if (hasStructuredState) {
    lines.push("", "Scene packet:");
    lines.push(`- mode: ${state.scenePacket.mode}`);
    if (state.scenePacket.objective) {
      lines.push(`- objective: ${state.scenePacket.objective}`);
    }
    if (state.scenePacket.focus) {
      lines.push(`- focus: ${state.scenePacket.focus}`);
    }
    if (state.scenePacket.conflict) {
      lines.push(`- conflict: ${state.scenePacket.conflict}`);
    }
    if (state.scenePacket.mustKeep.length > 0) {
      lines.push("- mustKeep:");
      for (const item of state.scenePacket.mustKeep) {
        lines.push(`  - ${item}`);
      }
    }
    if (state.scenePacket.continuityHooks.length > 0) {
      lines.push("- continuityHooks:");
      for (const item of state.scenePacket.continuityHooks) {
        lines.push(`  - ${item}`);
      }
    }
    if (state.scenePacket.avoid.length > 0) {
      lines.push("- avoid:");
      for (const item of state.scenePacket.avoid) {
        lines.push(`  - ${item}`);
      }
    }

    if (state.styleProfile.directives.length > 0 || state.styleProfile.avoid.length > 0) {
      lines.push("", "Style profile:");
      if (state.styleProfile.directives.length > 0) {
        lines.push("- directives:");
        for (const item of state.styleProfile.directives) {
          lines.push(`  - ${item}`);
        }
      }
      if (state.styleProfile.avoid.length > 0) {
        lines.push("- avoid:");
        for (const item of state.styleProfile.avoid) {
          lines.push(`  - ${item}`);
        }
      }
    }

    if (state.humanityDiagnostics) {
      lines.push("", "Humanity diagnostics:");
      lines.push(`- risk: ${state.humanityDiagnostics.risk}`);
      lines.push(`- briefingSignals: ${state.humanityDiagnostics.briefingSignals}`);
      lines.push(`- abstractSignals: ${state.humanityDiagnostics.abstractSignals}`);
      lines.push(`- sensorySignals: ${state.humanityDiagnostics.sensorySignals}`);
      lines.push(`- actionSignals: ${state.humanityDiagnostics.actionSignals}`);
      if (state.humanityDiagnostics.strengths.length > 0) {
        lines.push("- strengths:");
        for (const item of state.humanityDiagnostics.strengths) {
          lines.push(`  - ${item}`);
        }
      }
      if (state.humanityDiagnostics.warnings.length > 0) {
        lines.push("- warnings:");
        for (const item of state.humanityDiagnostics.warnings) {
          lines.push(`  - ${item}`);
        }
      }
      if (state.humanityDiagnostics.recommendedDirectives.length > 0) {
        lines.push("- recommendedDirectives:");
        for (const item of state.humanityDiagnostics.recommendedDirectives) {
          lines.push(`  - ${item}`);
        }
      }
      if (state.humanityDiagnostics.recommendedAvoids.length > 0) {
        lines.push("- recommendedAvoids:");
        for (const item of state.humanityDiagnostics.recommendedAvoids) {
          lines.push(`  - ${item}`);
        }
      }
    }

    lines.push("", "Story ledger:");
    appendSection(lines, "User directives:", state.storyLedger.userDirectives);
    appendSection(lines, "Assistant plans:", state.storyLedger.assistantPlans);
    appendSection(lines, "Continuity notes:", state.storyLedger.continuityNotes);

    lines.push("", "Chapter state:");
    if (state.chapterState.focus) {
      lines.push(`- focus: ${state.chapterState.focus}`);
    }
    if (state.chapterState.latestUserDirective) {
      lines.push(`- latestUserDirective: ${state.chapterState.latestUserDirective}`);
    }
    if (state.chapterState.latestAssistantPlan) {
      lines.push(`- latestAssistantPlan: ${state.chapterState.latestAssistantPlan}`);
    }
    if (state.chapterState.constraints.length > 0) {
      lines.push("- constraints:");
      for (const constraint of state.chapterState.constraints) {
        lines.push(`  - ${constraint}`);
      }
    }
  }

  if (state.recentMessages.length > 0) {
    lines.push("", "Recent messages:");
    for (const message of state.recentMessages) {
      const label = message.role === "assistant" ? "ASSISTANT" : "USER";
      lines.push(`- ${label}: ${message.text}`);
    }
  }

  return lines.join("\n");
}
