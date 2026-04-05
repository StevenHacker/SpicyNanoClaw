import { createHash } from "node:crypto";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import type { SncHookTarget, SncResolvedConfig } from "./config.js";
import {
  buildSncReplacementLedgerKey,
  createSncReplacementLedger,
  findSncReplacementDecision,
  recordSncReplacementDecision,
  type SncReplacementLedgerEntry,
  type SncReplacementLedger,
} from "./replacement-ledger.js";
import { shapeSncTranscriptMessage } from "./transcript-shaping.js";
import {
  applySncWorkerFollowUpToolResult,
  applySncWorkerLaunchToolResult,
  applySncWorkerEndedLifecycle,
  applySncWorkerSpawnedLifecycle,
} from "./worker-state.js";

type SncRegisterHook = Pick<OpenClawPluginApi, "registerHook">["registerHook"];
type SncInternalHookHandler = Parameters<SncRegisterHook>[1];

const HOOK_DESCRIPTIONS: Record<SncHookTarget, string> = {
  before_message_write: "SNC rewrites assistant planning/meta chatter into bounded continuity notes.",
  tool_result_persist: "SNC stores bounded tool-result previews and freezes replacement decisions.",
  session_end: "SNC clears per-session shaping state at the end of a session.",
  subagent_spawned: "SNC syncs bounded worker spawn bookkeeping into persisted controller state.",
  subagent_ended: "SNC records bounded worker lifecycle fallback results when child runs end.",
};

const SNC_ASSISTANT_NOTE_PREFIX = "SNC planning note:";
const SNC_ASSISTANT_META_NOTE_PREFIX = "SNC meta note:";
const SNC_TOOL_RESULT_NOTE_PREFIX = "SNC stored tool result preview:";
const MIN_BYTES_SAVED = 12;
const MAX_TOOL_PREVIEW_SOURCE_BYTES = 320;

type SncBeforeMessageWriteEvent = {
  message: AgentMessage;
  sessionKey?: string;
  agentId?: string;
};

type SncBeforeMessageWriteResult = {
  block?: boolean;
  message?: AgentMessage;
};

type SncToolResultPersistEvent = {
  message: AgentMessage;
  toolName?: string;
  toolCallId?: string;
  isSynthetic?: boolean;
};

type SncToolResultPersistContext = {
  agentId?: string;
  sessionKey?: string;
  toolName?: string;
  toolCallId?: string;
};

type SncToolResultPersistResult = {
  message?: AgentMessage;
};

type SncSessionScope = {
  sessionId?: string;
  sessionKey?: string;
  agentId?: string;
};

type SncSubagentSpawnedEvent = {
  runId?: string;
  childSessionKey: string;
};

type SncSubagentEndedEvent = {
  targetSessionKey: string;
  reason?: string;
  outcome?: string;
  error?: string;
  runId?: string;
  endedAt?: number;
};

type SncSubagentContext = {
  runId?: string;
  childSessionKey?: string;
  requesterSessionKey?: string;
};

type SncHookSessionState = {
  assistantRewriteCount: number;
  ledger: SncReplacementLedger;
};

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolveSessionScopeKey(scope: SncSessionScope): string {
  return (
    normalizeOptionalString(scope.sessionKey) ??
    normalizeOptionalString(scope.sessionId) ??
    normalizeOptionalString(scope.agentId) ??
    "global"
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

  return `${input.slice(0, low).trimEnd()}...`;
}

function normalizeInlineWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function hasAnyMatch(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
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

function canRewriteAssistantMessage(message: AgentMessage): boolean {
  const content = (message as { content?: unknown }).content;
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
    const type = (part as { type?: unknown }).type;
    const text = (part as { text?: unknown }).text;
    return type === "text" && typeof text === "string";
  });
}

function replaceAssistantMessageText(
  message: AgentMessage,
  replacementText: string,
): AgentMessage | undefined {
  if (!canRewriteAssistantMessage(message)) {
    return undefined;
  }

  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") {
    return {
      ...message,
      content: replacementText,
    } as AgentMessage;
  }

  return {
    ...message,
    content: [{ type: "text", text: replacementText }],
  } as AgentMessage;
}

function stripToolResultDetails(message: AgentMessage): AgentMessage {
  const { details: _details, ...rest } = message as unknown as Record<string, unknown>;
  return rest as unknown as AgentMessage;
}

function replaceToolResultMessageText(message: AgentMessage, replacementText: string): AgentMessage {
  return {
    ...(stripToolResultDetails(message) as unknown as Record<string, unknown>),
    content: [{ type: "text", text: replacementText }],
  } as unknown as AgentMessage;
}

function safeJsonStringify(value: unknown): string {
  if (value === undefined) {
    return "";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function getToolResultPreviewSource(message: AgentMessage): string {
  const text = normalizeInlineWhitespace(extractTextContent((message as { content?: unknown }).content));
  if (text) {
    return text;
  }
  return normalizeInlineWhitespace(safeJsonStringify((message as { details?: unknown }).details));
}

function buildToolResultPreview(params: {
  message: AgentMessage;
  toolName?: string;
  isSynthetic?: boolean;
  maxReplacementBytes: number;
  maxToolResultBytes: number;
}): string | undefined {
  const previewSource = getToolResultPreviewSource(params.message);
  const previewBytes = Buffer.byteLength(previewSource, "utf8");
  const detailsBytes = Buffer.byteLength(
    safeJsonStringify((params.message as { details?: unknown }).details),
    "utf8",
  );
  const totalBytes = previewBytes + detailsBytes;
  const shouldReplace = params.isSynthetic === true || totalBytes > params.maxToolResultBytes;

  if (!shouldReplace) {
    return undefined;
  }

  const normalizedToolName = normalizeOptionalString(params.toolName) ?? "unknown";
  const snippet = clampUtf8(
    previewSource || (params.isSynthetic ? "Synthetic tool-result flush recorded." : "Tool result captured."),
    MAX_TOOL_PREVIEW_SOURCE_BYTES,
  );
  const lines = [
    SNC_TOOL_RESULT_NOTE_PREFIX,
    `tool: ${normalizedToolName}`,
    ...(params.isSynthetic ? ["source: synthetic tool-result flush"] : []),
    `preview: ${snippet}`,
  ];
  return clampUtf8(lines.join("\n"), params.maxReplacementBytes);
}

function buildMessageHash(text: string): string {
  return createHash("sha1").update(text).digest("hex").slice(0, 12);
}

function buildAssistantStableId(scopeKey: string, message: AgentMessage): string {
  const timestamp =
    typeof (message as { timestamp?: unknown }).timestamp === "number"
      ? String((message as { timestamp?: number }).timestamp)
      : "na";
  const text = normalizeInlineWhitespace(extractTextContent((message as { content?: unknown }).content));
  return `${scopeKey}:assistant:${timestamp}:${buildMessageHash(text || "empty")}`;
}

function buildToolResultStableId(
  scopeKey: string,
  event: SncToolResultPersistEvent,
  ctx: SncToolResultPersistContext,
): string {
  const toolCallId = normalizeOptionalString(event.toolCallId) ?? normalizeOptionalString(ctx.toolCallId);
  if (toolCallId) {
    return `${scopeKey}:tool:${toolCallId}`;
  }

  const toolName = normalizeOptionalString(event.toolName) ?? normalizeOptionalString(ctx.toolName) ?? "unknown";
  const previewSource = getToolResultPreviewSource(event.message);
  return `${scopeKey}:tool:${toolName}:${buildMessageHash(previewSource || "empty")}`;
}

class SncHookRuntime {
  private readonly sessions = new Map<string, SncHookSessionState>();

  constructor(private readonly config: SncResolvedConfig) {}

  handleBeforeMessageWrite(
    event: SncBeforeMessageWriteEvent,
    ctx: { agentId?: string; sessionKey?: string },
  ): SncBeforeMessageWriteResult | void {
    if (event.message.role !== "assistant") {
      return;
    }

    const shaped = shapeSncTranscriptMessage(event.message, {
      maxSegments: 2,
      maxSummaryBytes: this.config.hooks.maxReplacementBytes,
      planPrefix: SNC_ASSISTANT_NOTE_PREFIX,
      metaPrefix: SNC_ASSISTANT_META_NOTE_PREFIX,
    });
    if (!shaped.shouldRewrite || !shaped.replacementMessage || !shaped.summary) {
      return;
    }

    const scopeKey = resolveSessionScopeKey({
      sessionKey: event.sessionKey ?? ctx.sessionKey,
      agentId: event.agentId ?? ctx.agentId,
    });
    const state = this.getSessionState(scopeKey);
    const existing = findSncReplacementDecision(state.ledger, {
      channel: "before_message_write",
      sessionKey: event.sessionKey ?? ctx.sessionKey,
      agentId: event.agentId ?? ctx.agentId,
      message: event.message,
    });
    if (existing) {
      return this.applyAssistantDecision(event.message, existing);
    }

    if (state.assistantRewriteCount >= this.config.hooks.maxRewritesPerSession) {
      state.ledger = recordSncReplacementDecision(state.ledger, {
        channel: "before_message_write",
        sessionKey: event.sessionKey ?? ctx.sessionKey,
        agentId: event.agentId ?? ctx.agentId,
        message: event.message,
        action: "keep",
        classification: "assistant-budget-exhausted",
      });
      return;
    }

    state.assistantRewriteCount += 1;
    state.ledger = recordSncReplacementDecision(state.ledger, {
      channel: "before_message_write",
      sessionKey: event.sessionKey ?? ctx.sessionKey,
      agentId: event.agentId ?? ctx.agentId,
      message: event.message,
      replacementMessage: shaped.replacementMessage,
      action: "replace",
      classification:
        shaped.rewriteKind === "meta-note" ? "assistant-meta-note" : "assistant-plan-note",
    });

    return { message: shaped.replacementMessage };
  }

  async handleToolResultPersist(
    event: SncToolResultPersistEvent,
    ctx: SncToolResultPersistContext,
  ): Promise<SncToolResultPersistResult | void> {
    if (event.message.role !== "toolResult") {
      return;
    }

    const scopeKey = resolveSessionScopeKey({
      sessionKey: ctx.sessionKey,
      agentId: ctx.agentId,
    });
    const state = this.getSessionState(scopeKey);
    const lookupInput = {
      channel: "tool_result_persist",
      sessionKey: ctx.sessionKey,
      agentId: ctx.agentId,
      toolName: event.toolName ?? ctx.toolName,
      toolCallId: event.toolCallId ?? ctx.toolCallId,
      message: event.message,
    } as const;
    const existing = findSncReplacementDecision(
      state.ledger,
      buildSncReplacementLedgerKey(lookupInput),
    );
    if (existing) {
      return this.applyToolResultDecision(event.message, existing);
    }

    await this.syncWorkerToolResult(event, ctx);

    const replacementText = buildToolResultPreview({
      message: event.message,
      toolName: event.toolName ?? ctx.toolName,
      isSynthetic: event.isSynthetic,
      maxReplacementBytes: this.config.hooks.maxReplacementBytes,
      maxToolResultBytes: this.config.hooks.maxToolResultBytes,
    });

    if (!replacementText) {
      state.ledger = recordSncReplacementDecision(state.ledger, {
        ...lookupInput,
        action: "keep",
        classification: "tool-result-kept",
      });
      return;
    }

    const replacedMessage = replaceToolResultMessageText(event.message, replacementText);
    state.ledger = recordSncReplacementDecision(state.ledger, {
      ...lookupInput,
      replacementMessage: replacedMessage,
      action: "replace",
      classification: event.isSynthetic
        ? "tool-result-synthetic-preview"
        : "tool-result-preview",
    });

    return {
      message: replacedMessage,
    };
  }

  handleSessionEnd(
    event: { sessionId: string; sessionKey?: string },
    ctx: { sessionId: string; sessionKey?: string; agentId?: string },
  ): void {
    this.sessions.delete(
      resolveSessionScopeKey({
        sessionId: event.sessionId ?? ctx.sessionId,
        sessionKey: event.sessionKey ?? ctx.sessionKey,
        agentId: ctx.agentId,
      }),
    );
  }

  async handleSubagentSpawned(
    event: SncSubagentSpawnedEvent,
    ctx: SncSubagentContext,
  ): Promise<void> {
    if (!this.config.stateDir) {
      return;
    }

    await applySncWorkerSpawnedLifecycle({
      stateDir: this.config.stateDir,
      requesterSessionKey: ctx.requesterSessionKey,
      childSessionKey: event.childSessionKey,
      runId: event.runId ?? ctx.runId,
      updatedAt: new Date().toISOString(),
    });
  }

  async handleSubagentEnded(
    event: SncSubagentEndedEvent,
    ctx: SncSubagentContext,
  ): Promise<void> {
    if (!this.config.stateDir) {
      return;
    }

    const updatedAt =
      typeof event.endedAt === "number" && Number.isFinite(event.endedAt)
        ? new Date(event.endedAt).toISOString()
        : new Date().toISOString();
    await applySncWorkerEndedLifecycle({
      stateDir: this.config.stateDir,
      requesterSessionKey: ctx.requesterSessionKey,
      targetSessionKey: event.targetSessionKey,
      runId: event.runId ?? ctx.runId,
      reason: event.reason,
      outcome: event.outcome,
      error: event.error,
      updatedAt,
    });
  }

  private getSessionState(scopeKey: string): SncHookSessionState {
    const existing = this.sessions.get(scopeKey);
    if (existing) {
      return existing;
    }

    const created: SncHookSessionState = {
      assistantRewriteCount: 0,
      ledger: createSncReplacementLedger(),
    };
    this.sessions.set(scopeKey, created);
    return created;
  }

  private applyAssistantDecision(
    message: AgentMessage,
    decision: SncReplacementLedgerEntry,
  ): SncBeforeMessageWriteResult | void {
    if (decision.action !== "replace" || !decision.replacementPreview) {
      return;
    }

    const replaced = replaceAssistantMessageText(message, decision.replacementPreview);
    return replaced ? { message: replaced } : undefined;
  }

  private applyToolResultDecision(
    message: AgentMessage,
    decision: SncReplacementLedgerEntry,
  ): SncToolResultPersistResult | void {
    if (decision.action !== "replace" || !decision.replacementPreview) {
      return;
    }

    return {
      message: replaceToolResultMessageText(message, decision.replacementPreview),
    };
  }

  private async syncWorkerToolResult(
    event: SncToolResultPersistEvent,
    ctx: SncToolResultPersistContext,
  ): Promise<void> {
    if (!this.config.stateDir) {
      return;
    }

    const toolName = normalizeOptionalString(event.toolName) ?? normalizeOptionalString(ctx.toolName);
    const sessionKey = normalizeOptionalString(ctx.sessionKey);
    if ((toolName !== "sessions_spawn" && toolName !== "sessions_send") || !sessionKey) {
      return;
    }

    try {
      if (toolName === "sessions_spawn") {
        await applySncWorkerLaunchToolResult({
          stateDir: this.config.stateDir,
          sessionId: sessionKey,
          sessionKey,
          message: event.message,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await applySncWorkerFollowUpToolResult({
          stateDir: this.config.stateDir,
          sessionId: sessionKey,
          sessionKey,
          message: event.message,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch {
      // Best-effort only: hook shaping should not break runtime tool-result persistence.
    }
  }
}

export function installSncHookScaffold(
  api: Pick<OpenClawPluginApi, "registerHook">,
  config: SncResolvedConfig,
): void {
  if (!config.hooks.enabled || config.hooks.targets.length === 0) {
    return;
  }

  const runtime = new SncHookRuntime(config);
  const targets = new Set(config.hooks.targets);

  if (targets.has("before_message_write")) {
    api.registerHook(
      "before_message_write",
      (((event: unknown, ctx: unknown) =>
        runtime.handleBeforeMessageWrite(
          event as SncBeforeMessageWriteEvent,
          ctx as { agentId?: string; sessionKey?: string },
        )) as SncInternalHookHandler),
      {
        name: "snc-before_message_write",
        description: HOOK_DESCRIPTIONS.before_message_write,
      },
    );
  }

  if (targets.has("tool_result_persist")) {
    api.registerHook(
      "tool_result_persist",
      (((event: unknown, ctx: unknown) =>
        runtime.handleToolResultPersist(
          event as SncToolResultPersistEvent,
          ctx as SncToolResultPersistContext,
        )) as SncInternalHookHandler),
      {
        name: "snc-tool_result_persist",
        description: HOOK_DESCRIPTIONS.tool_result_persist,
      },
    );
  }

  if (targets.has("session_end")) {
    api.registerHook(
      "session_end",
      (((event: unknown, ctx: unknown) =>
        runtime.handleSessionEnd(
          event as { sessionId: string; sessionKey?: string },
          ctx as { sessionId: string; sessionKey?: string; agentId?: string },
        )) as SncInternalHookHandler),
      {
        name: "snc-session_end",
        description: HOOK_DESCRIPTIONS.session_end,
      },
    );
  }

  if (targets.has("subagent_spawned")) {
    api.registerHook(
      "subagent_spawned",
      (((event: unknown, ctx: unknown) =>
        runtime.handleSubagentSpawned(
          event as SncSubagentSpawnedEvent,
          ctx as SncSubagentContext,
        )) as SncInternalHookHandler),
      {
        name: "snc-subagent_spawned",
        description: HOOK_DESCRIPTIONS.subagent_spawned,
      },
    );
  }

  if (targets.has("subagent_ended")) {
    api.registerHook(
      "subagent_ended",
      (((event: unknown, ctx: unknown) =>
        runtime.handleSubagentEnded(
          event as SncSubagentEndedEvent,
          ctx as SncSubagentContext,
        )) as SncInternalHookHandler),
      {
        name: "snc-subagent_ended",
        description: HOOK_DESCRIPTIONS.subagent_ended,
      },
    );
  }
}
