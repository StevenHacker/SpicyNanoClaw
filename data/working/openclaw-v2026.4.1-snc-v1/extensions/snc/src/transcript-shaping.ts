import type { AgentMessage } from "@mariozechner/pi-agent-core";

export const SNC_PLAN_NOTE_PREFIX = "Planning note preserved by SNC:";
export const SNC_META_NOTE_PREFIX = "Meta note preserved by SNC:";

const DEFAULT_MAX_SUMMARY_BYTES = 480;
const DEFAULT_MAX_SEGMENTS = 3;
const QUOTE_PATTERN = /["“”‘’「」『』《》〈〉]/u;
const SPEECH_VERB_PATTERNS = [
  /\b(said|asked|replied|whispered)\b/i,
  /(说道|问道|回答|低声|应道|回道)/u,
];

const PLAN_PATTERNS = [
  /\b(next|plan|i will|we will|outline|draft|revise|rewrite|expand|continue|approach|step(?:s)?)\b/i,
  /\b(i'll|we'll|going to|let me)\b/i,
  /(下一步|接下来|计划|打算|我会|我们会|然后|继续|改写|重写|扩写|润色|整理|补充|推进|起草|修订)/u,
];
const META_PATTERNS = [
  /\b(internal note|scratch note|working note|meta note|notes to self|thought process)\b/i,
  /\b(reasoning|options|candidate|tradeoff|considering|process note|thinking through)\b/i,
  /(内部备注|内部说明|工作笔记|元备注|思路备注|取舍|权衡|过程说明|自我备注|考虑|比较|方案)/u,
];
const CONTINUITY_PATTERNS = [
  /\b(continuity|canon|foreshadow|callback|payoff|consistency|anchor|thread)\b/i,
  /(连贯|设定|伏笔|呼应|回收|一致性|前文|延续|线索|照应|世界观|人物关系)/u,
];
const STORY_GUARD_PATTERNS = [
  QUOTE_PATTERN,
  /\b(said|asked|replied|whispered|looked|walked|smiled|sighed)\b/i,
  /(说道|问道|回答|低声|看着|走向|笑了|叹了口气|转身|站在)/u,
];
const ACK_PATTERNS = [
  /^\s*(ok|okay|understood|got it|sure|will do|sounds good|acknowledged)[.!?]?\s*$/i,
  /^\s*(好的|收到|明白|知道了|行|没问题|可以|继续吧?)[。！？!?]?\s*$/u,
];
const PLAN_LEAD_PATTERNS = [
  /^\s*(?:plan|next|outline|draft|revise|rewrite|continue|let me)\b/i,
  /^\s*(?:计划|下一步|接下来|我会|我们会|然后|继续|改写|重写|扩写|润色|整理|补充|推进|起草|修订)(?:[:：，,]|$)/u,
];
const META_LEAD_PATTERNS = [
  /^\s*(?:internal note|scratch note|working note|meta note|notes to self|process note)\b/i,
  /^\s*(?:内部备注|内部说明|工作笔记|元备注|思路备注|过程说明|自我备注)(?:[:：，,]|$)/u,
];

export type SncTranscriptClassification =
  | "non-assistant"
  | "non-text"
  | "already-shaped"
  | "assistant-plan"
  | "assistant-meta"
  | "assistant-story"
  | "assistant-ack"
  | "assistant-other";

export type SncTranscriptRewriteKind = "plan-note" | "meta-note";

export type SncTranscriptAnalysis = {
  classification: SncTranscriptClassification;
  text?: string;
  segments: string[];
  planSegments: string[];
  metaSegments: string[];
  continuitySegments: string[];
  storyGuard: boolean;
};

export type SncTranscriptShapeOptions = {
  maxSummaryBytes?: number;
  maxSegments?: number;
  planPrefix?: string;
  metaPrefix?: string;
};

export type SncTranscriptShapeResult = SncTranscriptAnalysis & {
  shouldRewrite: boolean;
  preservedSegments: string[];
  rewriteKind?: SncTranscriptRewriteKind;
  summary?: string;
  replacementMessage?: AgentMessage;
};

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

function normalizeInlineWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeKey(text: string): string {
  return text.normalize("NFKC").toLowerCase();
}

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function hasAnyMatch(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function isTextOnlyContent(content: unknown): boolean {
  if (typeof content === "string") {
    return true;
  }
  if (!Array.isArray(content)) {
    return false;
  }
  return content.every((part) => {
    if (!part || typeof part !== "object") {
      return false;
    }
    return (
      (part as { type?: unknown }).type === "text" &&
      typeof (part as { text?: unknown }).text === "string"
    );
  });
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content) || !isTextOnlyContent(content)) {
    return "";
  }
  return content
    .map((part) => {
      if (!part || typeof part !== "object") {
        return "";
      }
      const type = (part as { type?: unknown }).type;
      const text = (part as { text?: unknown }).text;
      return type === "text" && typeof text === "string" ? text : "";
    })
    .filter(Boolean)
    .join("\n");
}

function splitSegments(text: string): string[] {
  const deduped = new Map<string, string>();
  const lines = text
    .split(/\r?\n+/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/u, ""))
    .flatMap((line) => line.split(/(?<=[.!?;。！？；])\s*/u))
    .map((line) => normalizeInlineWhitespace(line))
    .filter(Boolean);

  for (const line of lines) {
    const key = normalizeKey(line);
    if (!deduped.has(key)) {
      deduped.set(key, line);
    }
  }
  return [...deduped.values()];
}

function selectMatchingSegments(segments: string[], patterns: RegExp[]): string[] {
  return segments.filter((segment) => countMatches(segment, patterns) > 0);
}

function dedupeSegments(segments: string[]): string[] {
  const deduped = new Map<string, string>();
  for (const segment of segments) {
    const trimmed = normalizeInlineWhitespace(segment);
    if (!trimmed) {
      continue;
    }
    const key = normalizeKey(trimmed);
    if (!deduped.has(key)) {
      deduped.set(key, trimmed);
    }
  }
  return [...deduped.values()];
}

function buildReplacementMessage(message: AgentMessage, summary: string): AgentMessage {
  const content = (message as { content?: unknown }).content;
  return {
    ...message,
    content: Array.isArray(content) ? [{ type: "text", text: summary }] : summary,
  } as AgentMessage;
}

export function analyzeSncTranscriptMessage(message: AgentMessage): SncTranscriptAnalysis {
  if (message.role !== "assistant") {
    return {
      classification: "non-assistant",
      segments: [],
      planSegments: [],
      metaSegments: [],
      continuitySegments: [],
      storyGuard: false,
    };
  }

  const content = (message as { content?: unknown }).content;
  if (!isTextOnlyContent(content)) {
    return {
      classification: "non-text",
      segments: [],
      planSegments: [],
      metaSegments: [],
      continuitySegments: [],
      storyGuard: false,
    };
  }

  const text = normalizeInlineWhitespace(extractTextContent(content));
  if (!text) {
    return {
      classification: "non-text",
      segments: [],
      planSegments: [],
      metaSegments: [],
      continuitySegments: [],
      storyGuard: false,
    };
  }

  if (text.startsWith(SNC_PLAN_NOTE_PREFIX) || text.startsWith(SNC_META_NOTE_PREFIX)) {
    return {
      classification: "already-shaped",
      text,
      segments: splitSegments(text),
      planSegments: [],
      metaSegments: [],
      continuitySegments: [],
      storyGuard: false,
    };
  }

  const segments = splitSegments(text);
  const planSegments = selectMatchingSegments(segments, PLAN_PATTERNS);
  const metaSegments = selectMatchingSegments(segments, META_PATTERNS);
  const continuitySegments = selectMatchingSegments(segments, CONTINUITY_PATTERNS);
  const planScore = countMatches(text, PLAN_PATTERNS) + planSegments.length;
  const metaScore = countMatches(text, META_PATTERNS) + metaSegments.length;
  const continuityScore = countMatches(text, CONTINUITY_PATTERNS) + continuitySegments.length;
  const storyGuard = hasAnyMatch(text, STORY_GUARD_PATTERNS);
  const hasDialogueStoryGuard = QUOTE_PATTERN.test(text) && hasAnyMatch(text, SPEECH_VERB_PATTERNS);
  const explicitPlanLead = hasAnyMatch(text, PLAN_LEAD_PATTERNS);
  const explicitMetaLead = hasAnyMatch(text, META_LEAD_PATTERNS);

  let classification: SncTranscriptClassification = "assistant-other";
  if (ACK_PATTERNS.some((pattern) => pattern.test(text)) && planScore === 0 && metaScore === 0) {
    classification = "assistant-ack";
  } else if (
    hasDialogueStoryGuard ||
    (storyGuard && metaScore === 0 && continuityScore === 0 && planScore <= 1)
  ) {
    classification = "assistant-story";
  } else if (explicitMetaLead && metaScore > 0) {
    classification = "assistant-meta";
  } else if (explicitPlanLead && (planScore > 0 || continuityScore > 0)) {
    classification = "assistant-plan";
  } else if (metaScore > planScore && metaScore > 0) {
    classification = "assistant-meta";
  } else if (planScore > 0 || continuityScore > 0) {
    classification = "assistant-plan";
  } else if (metaScore > 0) {
    classification = "assistant-meta";
  }

  return {
    classification,
    text,
    segments,
    planSegments,
    metaSegments,
    continuitySegments,
    storyGuard,
  };
}

export function shapeSncTranscriptMessage(
  message: AgentMessage,
  options: SncTranscriptShapeOptions = {},
): SncTranscriptShapeResult {
  const analysis = analyzeSncTranscriptMessage(message);
  if (
    analysis.classification !== "assistant-plan" &&
    analysis.classification !== "assistant-meta"
  ) {
    return {
      ...analysis,
      shouldRewrite: false,
      preservedSegments: [],
    };
  }

  const maxSegments = Math.max(1, Math.floor(options.maxSegments ?? DEFAULT_MAX_SEGMENTS));
  const maxSummaryBytes = Math.max(
    64,
    Math.floor(options.maxSummaryBytes ?? DEFAULT_MAX_SUMMARY_BYTES),
  );
  const preferredSegments =
    analysis.classification === "assistant-plan"
      ? dedupeSegments([...analysis.planSegments, ...analysis.continuitySegments])
      : dedupeSegments([
          ...analysis.metaSegments,
          ...analysis.continuitySegments,
          ...analysis.planSegments,
        ]);
  const preservedSegments =
    preferredSegments.slice(0, maxSegments).length > 0
      ? preferredSegments.slice(0, maxSegments)
      : analysis.segments.slice(0, 1);

  const prefix =
    analysis.classification === "assistant-plan"
      ? options.planPrefix ?? SNC_PLAN_NOTE_PREFIX
      : options.metaPrefix ?? SNC_META_NOTE_PREFIX;
  const summary = clampUtf8(`${prefix} ${preservedSegments.join("; ")}`, maxSummaryBytes);

  return {
    ...analysis,
    shouldRewrite: true,
    preservedSegments,
    rewriteKind: analysis.classification === "assistant-plan" ? "plan-note" : "meta-note",
    summary,
    replacementMessage: buildReplacementMessage(message, summary),
  };
}
