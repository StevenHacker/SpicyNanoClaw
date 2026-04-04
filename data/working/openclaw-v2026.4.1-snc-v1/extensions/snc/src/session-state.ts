import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { normalizeHyphenSlug } from "openclaw/plugin-sdk/core";

const STATE_VERSION = 2;
const MAX_RECENT_MESSAGES = 8;
const MAX_MESSAGE_CHARS = 1_600;
const MAX_LEDGER_ITEMS = 8;
const MAX_LEDGER_EVENTS = 24;
const MAX_CONSTRAINTS = 8;

const DIRECTIVE_PATTERNS = [
  /\b(must|should|need to|keep|avoid|rewrite|revise|draft|continue)\b/i,
  /(必须|应该|需要|保持|避免|改写|修订|起草|继续|请|务必|不要|帮我|保留|修改|重写|补充)/,
];
const FOCUS_PATTERNS = [
  /\b(chapter|scene|beat|outline|arc|conflict|reveal|climax|ending|opening)\b/i,
  /(章节|场景|情节|主线|冲突|揭示|高潮|结尾|开头|开篇|转折|聚焦|重点)/,
];
const CONSTRAINT_PATTERNS = [
  /\b(keep|avoid|tone|style|voice|pacing|continuity|canon|pov|tense)\b/i,
  /(保持|避免|不要|务必|尽量|语气|风格|口吻|节奏|连贯|设定|视角|时态|第一人称|第三人称)/,
];
const ACTION_PATTERNS = [
  /\b(will|plan|next|draft|outline|revise|expand|tighten|continue|rewrite)\b/i,
  /(将|计划|下一步|起草|大纲|修订|扩写|精简|继续|重写|我会|我们将|接下来)/,
];
const CONTINUITY_PATTERNS = [
  /\b(continuity|canon|foreshadow|callback|payoff|consistency)\b/i,
  /(连贯|设定|伏笔|呼应|回收|一致性|前文|延续|线索)/,
];
const USER_DIRECTIVE_FALLBACK_PATTERNS = [
  /(请|帮我|务必|尽量|不要|避免|保持|继续|修改|重写|补充|总结|整理|列出|确认|对齐|采用|切换|保留|优化)/,
  /\b(please|help me|must|should|need to|keep|avoid|continue|revise|rewrite|draft|update|change|improve)\b/i,
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
  updatedAt: string;
  turnCount: number;
  recentMessages: SncStateMessage[];
  autoCompactionSummary?: string;
  storyLedger: SncStoryLedger;
  chapterState: SncChapterState;
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
    const trimmed = item.trim();
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
    .sort((left, right) => right.score - left.score || left.segment.text.length - right.segment.text.length);

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
            return {
              role,
              text,
              ...(typeof timestamp === "number" && Number.isFinite(timestamp) ? { timestamp } : {}),
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

export function buildSncSessionStateSection(state: SncSessionState): string | undefined {
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

  if (hasStructuredState) {
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
