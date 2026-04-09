import type { AgentMessage } from "@mariozechner/pi-agent-core";
import {
  buildSncWorkerSpawnBrief,
  markSncWorkerSpawned,
  queueSncWorkerExpectation,
  recordSncWorkerResult,
  renderSncWorkerSpawnBrief,
  type SncWorkerCompletionMode,
  type SncWorkerControllerState,
  type SncWorkerFollowUpMode,
  type SncWorkerFollowUpObservation,
  type SncWorkerFollowUpObservationStatus,
  type SncWorkerJobContract,
  type SncWorkerResult,
  type SncWorkerSpawnBrief,
  type SncWorkerTrackingRecord,
} from "./worker-policy.js";

const DEFAULT_SUBAGENT_RUNTIME = "subagent";
const DEFAULT_SPAWN_CLEANUP = "keep";
const DEFAULT_SPAWN_SANDBOX = "inherit";
const DEFAULT_YIELD_MESSAGE = "Yielding so SNC worker results can arrive as completion events.";
const DEFAULT_RECENT_MINUTES = 15;
const MAX_LABEL_CHARS = 96;
const MAX_REPLY_SNIPPET_CHARS = 220;
const INTERNAL_EVENT_HEADER = "[Internal task completion event]";
const BEGIN_UNTRUSTED_CHILD_RESULT = "<<<BEGIN_UNTRUSTED_CHILD_RESULT>>>";
const END_UNTRUSTED_CHILD_RESULT = "<<<END_UNTRUSTED_CHILD_RESULT>>>";

export type SncWorkerExecutionRuntime = "subagent";
export type SncWorkerSpawnCleanup = "keep" | "delete";
export type SncWorkerSpawnSandbox = "inherit" | "require";
export type SncSubagentsAction = "steer" | "kill";
export type SncParsedCompletionStatus = "complete" | "failed" | "aborted";

export type SncWorkerSpawnToolArgs = {
  task: string;
  label: string;
  runtime: SncWorkerExecutionRuntime;
  mode: "run";
  thread: false;
  cleanup: SncWorkerSpawnCleanup;
  sandbox: SncWorkerSpawnSandbox;
  runTimeoutSeconds?: number;
  agentId?: string;
};

export type SncWorkerYieldToolArgs = {
  message: string;
};

export type SncWorkerSubagentsToolArgs = {
  action: SncSubagentsAction;
  target: string;
  message?: string;
  recentMinutes?: number;
};

export type SncWorkerHostLaunchPlan = {
  supported: true;
  workerId: string;
  contract: SncWorkerJobContract;
  brief: SncWorkerSpawnBrief;
  toolName: "sessions_spawn";
  args: SncWorkerSpawnToolArgs;
};

export type SncWorkerUnsupportedLaunchPlan = {
  supported: false;
  workerId: string;
  contract: SncWorkerJobContract;
  brief: SncWorkerSpawnBrief;
  reason: string;
};

export type SncWorkerLaunchPlan = SncWorkerHostLaunchPlan | SncWorkerUnsupportedLaunchPlan;

export type SncPrepareWorkerLaunchInput = {
  contract: SncWorkerJobContract;
  workerId?: string;
  controllerSessionKey?: string;
  runTimeoutSeconds?: number;
  agentId?: string;
  cleanup?: SncWorkerSpawnCleanup;
  sandbox?: SncWorkerSpawnSandbox;
  now?: string;
};

export type SncPreparedWorkerLaunch = {
  state: SncWorkerControllerState;
  plan: SncWorkerLaunchPlan;
};

export type SncWorkerSpawnToolResult = {
  status?: unknown;
  childSessionKey?: unknown;
  runId?: unknown;
  mode?: unknown;
  note?: unknown;
  error?: unknown;
};

export type SncWorkerFollowUpToolResult = {
  status?: unknown;
  sessionKey?: unknown;
  reply?: unknown;
  delivery?: unknown;
  error?: unknown;
  runId?: unknown;
};

export type SncWorkerLaunchFailureClass =
  | "validation"
  | "host-refused"
  | "runtime-clean"
  | "runtime-ambiguous";

export type SncApplyWorkerLaunchResultInput = {
  workerId: string;
  result: SncWorkerSpawnToolResult;
  now?: string;
};

export type SncApplyWorkerFollowUpResultInput = {
  workerId: string;
  result: SncWorkerFollowUpToolResult;
  now?: string;
};

export type SncParsedWorkerCompletionEvent = {
  source: "subagent" | "cron";
  childSessionKey: string;
  childSessionId?: string;
  announceType: string;
  taskLabel: string;
  statusLabel: string;
  inferredStatus: SncParsedCompletionStatus;
  resultText: string;
};

export type SncBuildWorkerResultFromEventInput = {
  workerId: string;
  event: SncParsedWorkerCompletionEvent;
  controllerSessionKey?: string;
  childSessionKey?: string;
  runId?: string;
  completedAt?: string;
  followUpMode?: SncWorkerFollowUpMode;
};

function normalizeText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = normalizeText(value);
  return trimmed.length > 0 ? trimmed : undefined;
}

function clampLabel(input: string, maxChars = MAX_LABEL_CHARS): string {
  const normalized = normalizeText(input);
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(1, maxChars - 3)).trimEnd()}...`;
}

function clampSnippet(input: string, maxChars = MAX_REPLY_SNIPPET_CHARS): string {
  const normalized = normalizeText(input);
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(1, maxChars - 3)).trimEnd()}...`;
}

function inferUnsupportedReason(contract: SncWorkerJobContract): string | undefined {
  if (contract.spawnMode !== "run") {
    return `Worker execution scaffold only supports spawnMode=run for now (got ${contract.spawnMode}).`;
  }
  if (contract.completionMode !== "one-shot") {
    return `Worker execution scaffold only supports completionMode=one-shot for now (got ${contract.completionMode}).`;
  }
  return undefined;
}

function buildWorkerLabel(brief: SncWorkerSpawnBrief): string {
  return clampLabel(`SNC ${brief.workerId}: ${brief.title}`);
}

function inferCompletionStatus(statusLabel: string): SncParsedCompletionStatus {
  const normalized = statusLabel.toLowerCase();
  if (
    normalized.includes("aborted") ||
    normalized.includes("cancelled") ||
    normalized.includes("canceled") ||
    normalized.includes("killed")
  ) {
    return "aborted";
  }
  if (normalized.includes("completed successfully") || normalized.includes("completed")) {
    return "complete";
  }
  return "failed";
}

function extractTextFromMessageContent(content: unknown): string {
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
      return (part as { type?: unknown }).type === "text" &&
        typeof (part as { text?: unknown }).text === "string"
        ? (part as { text: string }).text
        : "";
    })
    .filter(Boolean)
    .join("\n");
}

function extractStructuredToolResultPayload(message: AgentMessage): Record<string, unknown> | null {
  const details = (message as { details?: unknown }).details;
  if (details && typeof details === "object" && !Array.isArray(details)) {
    return details as Record<string, unknown>;
  }

  const text = extractTextFromMessageContent((message as { content?: unknown }).content).trim();
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function inferValidationFailure(error?: string): boolean {
  if (!error) {
    return false;
  }

  return [
    /does not support/i,
    /only supported for runtime=/i,
    /currently unsupported/i,
    /invalid agentid/i,
    /spawnmode=run/i,
    /completionmode=one-shot/i,
    /\bmode=session\b/i,
    /\bthread=true\b/i,
    /\bthinking\b/i,
  ].some((pattern) => pattern.test(error));
}

function classifySncWorkerLaunchFailure(params: {
  status?: string;
  error?: string;
  childSessionKey?: string;
  runId?: string;
}): SncWorkerLaunchFailureClass | null {
  if (params.status === "forbidden") {
    return "host-refused";
  }
  if (params.status !== "error" && params.status !== "accepted") {
    return null;
  }
  if (params.childSessionKey || params.runId) {
    return "runtime-ambiguous";
  }
  if (inferValidationFailure(params.error)) {
    return "validation";
  }
  return "runtime-clean";
}

function normalizeFollowUpStatus(
  value: unknown,
): SncWorkerFollowUpObservationStatus | undefined {
  return value === "accepted" || value === "ok" || value === "timeout" || value === "error"
    ? value
    : undefined;
}

function buildLaunchFailureSummary(params: {
  title: string;
  classification: SncWorkerLaunchFailureClass;
  error?: string;
}): string {
  const suffix = params.error ? ` ${params.error}` : "";
  switch (params.classification) {
    case "validation":
      return `${params.title}: launch request invalid; fix the helper brief or host arguments before retrying.${suffix}`;
    case "host-refused":
      return `${params.title}: host refused launch.${suffix}`;
    case "runtime-ambiguous":
      return `${params.title}: launch failed after worker identity was created; inspect the existing child session before retrying.${suffix}`;
    case "runtime-clean":
    default:
      return `${params.title}: launch failed before worker identity was established.${suffix}`;
  }
}

function buildLaunchFailureRecommendations(
  classification: SncWorkerLaunchFailureClass,
): string[] {
  switch (classification) {
    case "validation":
      return ["Fix the helper brief or host-facing launch arguments before retrying."];
    case "host-refused":
      return ["Change host policy, sandbox, or target conditions before retrying."];
    case "runtime-ambiguous":
      return ["Inspect the existing child session before launching another helper."];
    case "runtime-clean":
    default:
      return ["Inspect the host/runtime issue, then retry once the cause is fixed."];
  }
}

function buildLaunchFailureNextSteps(classification: SncWorkerLaunchFailureClass): string[] {
  switch (classification) {
    case "validation":
      return ["Adjust the generated worker launch request, then retry the helper once."];
    case "host-refused":
      return ["Decide whether the helper should be deferred or reissued under different host conditions."];
    case "runtime-ambiguous":
      return ["Use the existing child session or run identifiers to inspect state before retrying."];
    case "runtime-clean":
    default:
      return ["Retry only after the runtime or infrastructure issue is understood."];
  }
}

function parseCompletionBlock(block: string): SncParsedWorkerCompletionEvent | null {
  if (!block.includes(INTERNAL_EVENT_HEADER)) {
    return null;
  }

  const source = /source:\s*(subagent|cron)/i.exec(block)?.[1]?.toLowerCase();
  const childSessionKey = /session_key:\s*(.+)/i.exec(block)?.[1]?.trim();
  const childSessionId = /session_id:\s*(.+)/i.exec(block)?.[1]?.trim();
  const announceType = /type:\s*(.+)/i.exec(block)?.[1]?.trim();
  const taskLabel = /task:\s*(.+)/i.exec(block)?.[1]?.trim();
  const statusLabel = /status:\s*(.+)/i.exec(block)?.[1]?.trim();
  const resultMatch = new RegExp(
    `${BEGIN_UNTRUSTED_CHILD_RESULT}\\s*([\\s\\S]*?)\\s*${END_UNTRUSTED_CHILD_RESULT}`,
    "u",
  ).exec(block);
  const resultText = resultMatch?.[1]?.trim();

  if (
    (source !== "subagent" && source !== "cron") ||
    !childSessionKey ||
    !announceType ||
    !taskLabel ||
    !statusLabel
  ) {
    return null;
  }

  return {
    source,
    childSessionKey,
    ...(childSessionId && childSessionId !== "unknown" ? { childSessionId } : {}),
    announceType,
    taskLabel,
    statusLabel,
    inferredStatus: inferCompletionStatus(statusLabel),
    resultText: resultText && resultText !== "(no output)" ? resultText : "",
  };
}

function splitInternalEventBlocks(text: string): string[] {
  if (!text.includes(INTERNAL_EVENT_HEADER)) {
    return [];
  }

  const parts = text.split(/\n\s*---\s*\n/);
  return parts.filter((part) => part.includes(INTERNAL_EVENT_HEADER));
}

export function buildSncWorkerLaunchPlan(input: SncPrepareWorkerLaunchInput): SncWorkerLaunchPlan {
  const brief = buildSncWorkerSpawnBrief(input.contract, {
    workerId: input.workerId,
    controllerSessionKey: input.controllerSessionKey,
    now: input.now,
  });
  const reason = inferUnsupportedReason(input.contract);
  if (reason) {
    return {
      supported: false,
      workerId: brief.workerId,
      contract: input.contract,
      brief,
      reason,
    };
  }

  return {
    supported: true,
    workerId: brief.workerId,
    contract: input.contract,
    brief,
    toolName: "sessions_spawn",
    args: {
      task: renderSncWorkerSpawnBrief(brief),
      label: buildWorkerLabel(brief),
      runtime: DEFAULT_SUBAGENT_RUNTIME,
      mode: "run",
      thread: false,
      cleanup: input.cleanup ?? DEFAULT_SPAWN_CLEANUP,
      sandbox: input.sandbox ?? DEFAULT_SPAWN_SANDBOX,
      ...(typeof input.runTimeoutSeconds === "number" && Number.isFinite(input.runTimeoutSeconds)
        ? { runTimeoutSeconds: Math.max(0, Math.floor(input.runTimeoutSeconds)) }
        : {}),
      ...(normalizeOptionalString(input.agentId) ? { agentId: normalizeOptionalString(input.agentId) } : {}),
    },
  };
}

export function prepareSncWorkerLaunch(
  state: SncWorkerControllerState,
  input: SncPrepareWorkerLaunchInput,
): SncPreparedWorkerLaunch {
  const plan = buildSncWorkerLaunchPlan(input);
  if (!plan.supported) {
    return { state, plan };
  }

  const nextState = queueSncWorkerExpectation(state, {
    contract: input.contract,
    workerId: plan.workerId,
    controllerSessionKey: input.controllerSessionKey ?? state.controllerSessionKey,
    brief: plan.brief,
    now: input.now,
  });

  return {
    state: nextState,
    plan,
  };
}

export function parseSncWorkerSpawnToolResultFromMessage(
  message: AgentMessage,
): SncWorkerSpawnToolResult | null {
  const payload = extractStructuredToolResultPayload(message);
  if (!payload) {
    return null;
  }

  return {
    status: payload.status,
    childSessionKey: payload.childSessionKey,
    runId: payload.runId,
    mode: payload.mode,
    note: payload.note,
    error: payload.error,
  };
}

export function parseSncWorkerFollowUpToolResultFromMessage(
  message: AgentMessage,
): SncWorkerFollowUpToolResult | null {
  const payload = extractStructuredToolResultPayload(message);
  if (!payload) {
    return null;
  }

  return {
    status: payload.status,
    sessionKey: payload.sessionKey,
    reply: payload.reply,
    delivery: payload.delivery,
    error: payload.error,
    runId: payload.runId,
  };
}

export function applySncWorkerLaunchResult(
  state: SncWorkerControllerState,
  input: SncApplyWorkerLaunchResultInput,
): SncWorkerControllerState {
  const record = state.records.find((entry) => entry.workerId === input.workerId);
  const title = normalizeOptionalString(record?.contract.title) ?? `Worker ${input.workerId}`;
  const status = normalizeOptionalString(input.result.status);
  const childSessionKey = normalizeOptionalString(input.result.childSessionKey);
  const runId = normalizeOptionalString(input.result.runId);
  const error = normalizeOptionalString(input.result.error);

  if (status === "accepted" && childSessionKey) {
    return markSncWorkerSpawned(state, {
      workerId: input.workerId,
      childSessionKey,
      ...(runId ? { runId } : {}),
      now: input.now,
    });
  }

  const classification = classifySncWorkerLaunchFailure({
    status,
    error,
    childSessionKey,
    runId,
  });

  if (classification) {
    return recordSncWorkerResult(state, {
      workerId: input.workerId,
      status: "failed",
      summary: buildLaunchFailureSummary({
        title,
        classification,
        error,
      }),
      findings: error ? [error] : [],
      recommendations: buildLaunchFailureRecommendations(classification),
      evidence: [
        `launch class: ${classification}`,
        `launch status: ${status ?? "unknown"}`,
        ...(childSessionKey ? [`childSessionKey: ${childSessionKey}`] : []),
        ...(runId ? [`runId: ${runId}`] : []),
      ],
      nextSteps: buildLaunchFailureNextSteps(classification),
      followUpMode: "none",
      ...(runId ? { runId } : {}),
      ...(childSessionKey ? { childSessionKey } : {}),
      now: input.now,
    });
  }

  return state;
}

function buildFollowUpSummary(params: {
  status: SncWorkerFollowUpObservationStatus;
  replyObserved: boolean;
}): string {
  if (params.status === "accepted") {
    return "Follow-up accepted; reply has not been observed yet.";
  }
  if (params.status === "ok") {
    return params.replyObserved
      ? "Reply observed from worker."
      : "Follow-up wait window completed with no fresh visible reply.";
  }
  if (params.status === "timeout") {
    return "No reply was observed before timeout; inspect before retrying.";
  }
  return "Follow-up attempt failed; inspect current worker/session state.";
}

function buildFollowUpObservation(
  result: SncWorkerFollowUpToolResult,
  now: string,
): SncWorkerFollowUpObservation | null {
  const status = normalizeFollowUpStatus(result.status);
  if (!status) {
    return null;
  }

  const sessionKey = normalizeOptionalString(result.sessionKey);
  const reply = normalizeOptionalString(result.reply);
  const error = normalizeOptionalString(result.error);
  const delivery =
    result.delivery && typeof result.delivery === "object" && !Array.isArray(result.delivery)
      ? (result.delivery as Record<string, unknown>)
      : null;
  const deliveryStatus = normalizeOptionalString(delivery?.status);
  const deliveryMode = normalizeOptionalString(delivery?.mode);

  return {
    status,
    observedAt: now,
    summary: buildFollowUpSummary({
      status,
      replyObserved: Boolean(reply),
    }),
    replyObserved: Boolean(reply),
    ...(reply ? { replySnippet: clampSnippet(reply) } : {}),
    ...(sessionKey ? { sessionKey } : {}),
    ...(deliveryStatus ? { deliveryStatus } : {}),
    ...(deliveryMode ? { deliveryMode } : {}),
    ...(error ? { error } : {}),
  };
}

export function applySncWorkerFollowUpResult(
  state: SncWorkerControllerState,
  input: SncApplyWorkerFollowUpResultInput,
): SncWorkerControllerState {
  const record = state.records.find((entry) => entry.workerId === input.workerId);
  if (!record) {
    return state;
  }

  const now = input.now ?? new Date().toISOString();
  const observation = buildFollowUpObservation(input.result, now);
  if (!observation) {
    return state;
  }

  return {
    ...state,
    records: state.records.map((entry) =>
      entry.workerId === input.workerId
        ? {
            ...entry,
            updatedAt: now,
            ...(observation.sessionKey && !entry.childSessionKey
              ? { childSessionKey: observation.sessionKey }
              : {}),
            followUp: observation,
          }
        : entry,
    ),
  };
}

export function buildSncWorkerYieldToolArgs(
  state: SncWorkerControllerState,
  message = DEFAULT_YIELD_MESSAGE,
): SncWorkerYieldToolArgs | undefined {
  return state.activeWorkerIds.length > 0 ? { message } : undefined;
}

export function buildSncWorkerSubagentsToolArgs(
  record: Pick<SncWorkerTrackingRecord, "childSessionKey">,
  input: {
    action: SncSubagentsAction;
    message?: string;
    recentMinutes?: number;
  },
): SncWorkerSubagentsToolArgs | undefined {
  const childSessionKey = normalizeOptionalString(record.childSessionKey);
  if (!childSessionKey) {
    return undefined;
  }

  return {
    action: input.action,
    target: childSessionKey,
    ...(input.action === "steer" && normalizeOptionalString(input.message)
      ? { message: normalizeOptionalString(input.message) }
      : {}),
    ...(typeof input.recentMinutes === "number" && Number.isFinite(input.recentMinutes)
      ? { recentMinutes: Math.max(1, Math.floor(input.recentMinutes)) }
      : input.action === "kill"
        ? { recentMinutes: DEFAULT_RECENT_MINUTES }
        : {}),
  };
}

export function parseSncWorkerCompletionEventsFromText(
  text: string,
): SncParsedWorkerCompletionEvent[] {
  return splitInternalEventBlocks(text)
    .map((block) => parseCompletionBlock(block))
    .filter((event): event is SncParsedWorkerCompletionEvent => Boolean(event));
}

export function parseSncWorkerCompletionEventsFromMessages(
  messages: AgentMessage[],
): SncParsedWorkerCompletionEvent[] {
  const events: SncParsedWorkerCompletionEvent[] = [];
  for (const message of messages) {
    const text = extractTextFromMessageContent((message as { content?: unknown }).content);
    if (!text) {
      continue;
    }
    events.push(...parseSncWorkerCompletionEventsFromText(text));
  }
  return events;
}

export function buildSncWorkerResultFromCompletionEvent(
  input: SncBuildWorkerResultFromEventInput,
): SncWorkerResult {
  const findings =
    input.event.resultText.length > 0 ? [input.event.resultText] : [];
  const nextSteps =
    input.event.inferredStatus === "complete"
      ? []
      : ["Review the child result and decide whether to retry, steer, or narrow the brief."];
  const recommendations =
    input.event.inferredStatus === "complete"
      ? ["Fold the worker output back into the controller flow."]
      : ["Do not auto-retry blindly; inspect whether the worker contract was too broad."];

  return {
    workerId: input.workerId,
    status: input.event.inferredStatus,
    summary: `${input.event.taskLabel}: ${input.event.statusLabel}.`,
    findings,
    recommendations,
    evidence: [
      `source: ${input.event.source}`,
      `childSessionKey: ${input.childSessionKey ?? input.event.childSessionKey}`,
      `announceType: ${input.event.announceType}`,
    ],
    nextSteps,
    followUpMode: input.followUpMode ?? "none",
    ...(input.completedAt ? { completedAt: input.completedAt } : {}),
    ...(input.controllerSessionKey ? { controllerSessionKey: input.controllerSessionKey } : {}),
    ...(input.childSessionKey ?? input.event.childSessionKey
      ? { childSessionKey: input.childSessionKey ?? input.event.childSessionKey }
      : {}),
    ...(input.runId ? { runId: input.runId } : {}),
  };
}
