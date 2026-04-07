import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { SncSessionState } from "./session-state.js";

const MAX_RECENT_USER_TEXTS = 3;

const EVIDENCE_ACTION_PATTERNS = [
  /\b(read|review|inspect|check|compare|list|extract|summari[sz]e|confirm|verify|scan|quote|cite)\b/i,
  /(阅读|查看|审阅|检查|核对|比较|对比|列出|提取|总结|确认|扫描|引用|根据|依据)/u,
];
const EVIDENCE_SOURCE_PATTERNS = [
  /\b(file|files|doc|docs|document|documents|brief|ledger|packet|workspace|material|materials|note|notes|report|reports|readme)\b/i,
  /[A-Za-z0-9._-]+\.(?:md|txt|json|ya?ml|csv)\b/i,
  /(文件|文档|材料|简报|台账|包|工作区|说明|报告|记录|清单|README)/u,
];
const EVIDENCE_OUTPUT_PATTERNS = [
  /\b(priority|priorities|top\s+\d+|checklist|table|bullet|coverage|diff|difference)\b/i,
  /(优先级|最高优先级|清单|列表|表格|要点|覆盖|差异|对照)/u,
];
const EVIDENCE_GROUNDING_PATTERNS = [
  /\b(according to|based on|from the (?:workspace|materials|docs?|files?)|using only)\b/i,
  /(根据|依据|按.*(?:文档|材料|文件|工作区)|只根据|仅根据|从.*(?:文档|材料|文件|工作区))/u,
];

export type SncTaskPosture = "continuity" | "evidence-grounding";

export type SncTaskPostureContext = {
  posture: SncTaskPosture;
  score: number;
  matchedSignals: string[];
};

const WRITING_DIRECT_PATTERNS = [
  /\b(write|draft|continue|rewrite|revise|expand|polish|scene|chapter|novel|story|prose|dialogue)\b/i,
  /(继续|给我写|写一段|写一章|改写|润色|扩写|场景|章节|小说|故事|正文|对话)/u,
];
const WRITING_STRUCTURED_PATTERNS = [
  /\b(outline|plan|bullet|list|table|checklist|beat|beats|summary|summari[sz]e|analy[sz]e|compare|report|notes?)\b/i,
  /(大纲|计划|列表|清单|表格|要点|节拍|总结|分析|比较|报告|笔记)/u,
];

const TURN_OVERRIDE_PATTERNS = [
  /\b(?:actually|instead|ignore that|forget that|rather than that|just|switch to|change that|rewrite that)\b/i,
  /(?:\u5176\u5b9e|\u6539\u6210|\u6539\u4e3a|\u6362\u6210|\u76f4\u63a5|\u522b|\u4e0d\u8981|\u5ffd\u7565\u4e0a\u9762)/u,
];

export type SncOutputDisciplineMode = "neutral" | "writing-prose";

export type SncOutputDisciplineContext = {
  mode: SncOutputDisciplineMode;
  score: number;
  matchedSignals: string[];
};

function normalizeInlineWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return normalizeInlineWhitespace(content);
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((part) => {
      if (!part || typeof part !== "object") {
        return "";
      }
      return (part as { type?: unknown }).type === "text" &&
        typeof (part as { text?: unknown }).text === "string"
        ? normalizeInlineWhitespace((part as { text: string }).text)
        : "";
    })
    .filter(Boolean)
    .join(" ");
}

function collectCurrentTurnUserTexts(messages: AgentMessage[]): string[] {
  const texts: string[] = [];
  let foundCurrentTurn = false;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message) {
      continue;
    }
    if (message.role === "user") {
      const text = extractTextContent((message as { content?: unknown }).content);
      if (text.length > 0) {
        texts.push(text);
      }
      foundCurrentTurn = true;
      continue;
    }
    if (foundCurrentTurn) {
      break;
    }
  }

  return texts.reverse().slice(-MAX_RECENT_USER_TEXTS);
}

function collectHistoricalUserTexts(
  sessionState?: Pick<SncSessionState, "recentMessages" | "chapterState"> | null,
): string[] {
  const persistedTexts =
    sessionState?.recentMessages
      .filter((message) => message.role === "user")
      .map((message) => normalizeInlineWhitespace(message.text))
      .filter((text) => text.length > 0) ?? [];

  const fallbackDirective = sessionState?.chapterState.latestUserDirective
    ? [normalizeInlineWhitespace(sessionState.chapterState.latestUserDirective)]
    : [];

  return [...persistedTexts, ...fallbackDirective].slice(-MAX_RECENT_USER_TEXTS);
}

function collectRelevantUserTexts(params: {
  messages: AgentMessage[];
  sessionState?: Pick<SncSessionState, "recentMessages" | "chapterState"> | null;
}): string[] {
  const currentTurnTexts = collectCurrentTurnUserTexts(params.messages);
  if (currentTurnTexts.length === 0) {
    return collectHistoricalUserTexts(params.sessionState);
  }

  if (currentTurnTexts.length === 1) {
    return currentTurnTexts;
  }

  const latestText = currentTurnTexts.at(-1) ?? "";
  const latestEvidenceScore = scoreEvidenceText(latestText).score;
  const latestDirectScore = matchCount(latestText, WRITING_DIRECT_PATTERNS);
  const latestStructuredScore = matchCount(latestText, WRITING_STRUCTURED_PATTERNS);

  if (TURN_OVERRIDE_PATTERNS.some((pattern) => pattern.test(latestText))) {
    return [latestText];
  }

  if (latestEvidenceScore >= 4) {
    return [latestText];
  }

  if (latestDirectScore > 0 && latestDirectScore > latestStructuredScore) {
    return [latestText];
  }

  return currentTurnTexts;
}

function scoreEvidenceText(text: string): { score: number; signals: string[] } {
  if (!text) {
    return { score: 0, signals: [] };
  }

  let score = 0;
  const signals: string[] = [];

  if (EVIDENCE_ACTION_PATTERNS.some((pattern) => pattern.test(text))) {
    score += 2;
    signals.push("evidence-action");
  }
  if (EVIDENCE_SOURCE_PATTERNS.some((pattern) => pattern.test(text))) {
    score += 2;
    signals.push("evidence-source");
  }
  if (EVIDENCE_OUTPUT_PATTERNS.some((pattern) => pattern.test(text))) {
    score += 1;
    signals.push("evidence-output");
  }
  if (EVIDENCE_GROUNDING_PATTERNS.some((pattern) => pattern.test(text))) {
    score += 2;
    signals.push("evidence-grounding");
  }

  return { score, signals };
}

export function detectSncTaskPosture(params: {
  messages: AgentMessage[];
  sessionState?: Pick<SncSessionState, "recentMessages" | "chapterState"> | null;
}): SncTaskPostureContext {
  let bestScore = 0;
  const matchedSignals = new Set<string>();

  for (const text of collectRelevantUserTexts(params)) {
    const scored = scoreEvidenceText(text);
    if (scored.score > bestScore) {
      bestScore = scored.score;
      matchedSignals.clear();
      for (const signal of scored.signals) {
        matchedSignals.add(signal);
      }
    }
  }

  return {
    posture: bestScore >= 4 ? "evidence-grounding" : "continuity",
    score: bestScore,
    matchedSignals: [...matchedSignals.values()],
  };
}

export function buildSncTaskPostureSection(
  posture: SncTaskPostureContext,
): string | undefined {
  if (posture.posture !== "evidence-grounding") {
    return undefined;
  }

  return [
    "Current turn reads as evidence-first.",
    "- Prioritize current materials, workspace facts, and explicitly provided files before continuity carry-forward.",
    "- Use SNC continuity and durable-memory cues to avoid contradictions, not to replace reading or inspection.",
    "- If current materials conflict with older SNC cues, prefer the current materials and report the conflict plainly.",
    "- If you cannot inspect every requested item, say what you covered and what remains uncovered.",
    "- If a required file, packet, or material is missing, inaccessible, or unread, say that explicitly before falling back to partial coverage.",
  ].join("\n");
}

export function detectSncOutputDiscipline(params: {
  messages: AgentMessage[];
  sessionState?: Pick<SncSessionState, "recentMessages" | "chapterState"> | null;
  framingMode: "writing" | "general";
  taskPosture: SncTaskPostureContext;
}): SncOutputDisciplineContext {
  if (
    params.framingMode !== "writing" ||
    params.taskPosture.posture === "evidence-grounding"
  ) {
    return {
      mode: "neutral",
      score: 0,
      matchedSignals: [],
    };
  }

  let bestDirectScore = 0;
  let bestStructuredScore = 0;

  for (const text of collectRelevantUserTexts(params)) {
    bestDirectScore = Math.max(bestDirectScore, matchCount(text, WRITING_DIRECT_PATTERNS));
    bestStructuredScore = Math.max(
      bestStructuredScore,
      matchCount(text, WRITING_STRUCTURED_PATTERNS),
    );
  }

  if (
    bestDirectScore === 0 ||
    (bestStructuredScore > 0 && bestStructuredScore >= bestDirectScore)
  ) {
    return {
      mode: "neutral",
      score: Math.max(bestDirectScore, bestStructuredScore),
      matchedSignals: bestStructuredScore > 0 ? ["structured-request"] : [],
    };
  }

  const matchedSignals: string[] = ["direct-writing"];
  if (bestStructuredScore > 0) {
    matchedSignals.push("structured-request-present");
  }

  return {
    mode: "writing-prose",
    score: bestDirectScore,
    matchedSignals,
  };
}

export function buildSncOutputDisciplineSection(
  posture: SncOutputDisciplineContext,
): string | undefined {
  if (posture.mode !== "writing-prose") {
    return undefined;
  }

  return [
    "Current turn looks like direct drafting.",
    "- Deliver the prose or scene itself before any planning preamble or process commentary.",
    "- Avoid bullet lists, headings, or outline formatting unless the user explicitly asks for them.",
    "- Match the user's active writing language; do not prepend cross-language framing or setup text.",
    "- Do not slip into status-report, handoff, checklist, or milestone-complete wording inside the draft itself.",
  ].join("\n");
}

export function resolveSncEvidenceAwareProjectionPolicy(
  posture: SncTaskPostureContext,
  base: {
    limit: number;
    minimumScore: number;
  },
): {
  limit: number;
  minimumScore: number;
} {
  if (posture.posture !== "evidence-grounding") {
    return base;
  }

  return {
    limit: Math.max(1, Math.min(base.limit, 2)),
    minimumScore: Math.max(base.minimumScore + 1, 4),
  };
}

function matchCount(text: string, patterns: RegExp[]): number {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}
