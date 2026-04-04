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

export type SncApplyWorkerLaunchResultInput = {
  workerId: string;
  result: SncWorkerSpawnToolResult;
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

export function applySncWorkerLaunchResult(
  state: SncWorkerControllerState,
  input: SncApplyWorkerLaunchResultInput,
): SncWorkerControllerState {
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

  if (status === "forbidden" || status === "error") {
    return recordSncWorkerResult(state, {
      workerId: input.workerId,
      status: "failed",
      summary: error ?? `Worker launch failed with status=${status}.`,
      findings: error ? [error] : [],
      recommendations: ["Narrow the brief or adjust host-facing launch parameters before retrying."],
      evidence: [runId ? `runId: ${runId}` : `launch status: ${status ?? "unknown"}`],
      nextSteps: ["Decide whether this worker should be retried, deferred, or replaced."],
      followUpMode: "none",
      ...(runId ? { runId } : {}),
      ...(childSessionKey ? { childSessionKey } : {}),
      now: input.now,
    });
  }

  return state;
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
