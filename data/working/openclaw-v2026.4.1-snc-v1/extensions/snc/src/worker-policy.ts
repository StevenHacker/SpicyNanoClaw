import { createHash } from "node:crypto";

const DEFAULT_MAX_ACTIVE_WORKERS = 2;
const DEFAULT_MAX_DELIVERABLES = 4;
const DEFAULT_MAX_CONSTRAINTS = 6;
const DEFAULT_MAX_NOTES = 4;
const DEFAULT_MAX_FINDINGS = 6;

export type SncWorkerRole = "controller" | "helper" | "specialist";
export type SncWorkerJobKind =
  | "research"
  | "continuity-check"
  | "analysis"
  | "draft-support"
  | "review";
export type SncWorkerSpawnMode = "run" | "session";
export type SncWorkerCompletionMode = "one-shot" | "iterative";
export type SncWorkerStatus = "queued" | "spawned" | "running" | "blocked" | "complete" | "failed" | "aborted";
export type SncWorkerResultStatus = "complete" | "failed" | "aborted";
export type SncWorkerFollowUpMode = "none" | "steer" | "spawn";
export type SncWorkerFollowUpObservationStatus = "accepted" | "ok" | "timeout" | "error";

export type SncWorkerFollowUpObservation = {
  status: SncWorkerFollowUpObservationStatus;
  observedAt: string;
  summary: string;
  replyObserved: boolean;
  replySnippet?: string;
  sessionKey?: string;
  deliveryStatus?: string;
  deliveryMode?: string;
  error?: string;
};

export type SncWorkerJobContract = {
  jobId: string;
  title: string;
  role: SncWorkerRole;
  kind: SncWorkerJobKind;
  objective: string;
  deliverables: string[];
  constraints: string[];
  spawnMode: SncWorkerSpawnMode;
  completionMode: SncWorkerCompletionMode;
  maxTurns: number;
  allowFollowUp: boolean;
  focus?: string;
  controllerNotes: string[];
};

export type SncWorkerSpawnBrief = {
  workerId: string;
  jobId: string;
  title: string;
  role: SncWorkerRole;
  kind: SncWorkerJobKind;
  spawnMode: SncWorkerSpawnMode;
  completionMode: SncWorkerCompletionMode;
  prompt: string;
  checklist: string[];
  controllerNotes: string[];
  resultContract: string;
};

export type SncWorkerTrackingRecord = {
  workerId: string;
  contract: SncWorkerJobContract;
  brief: SncWorkerSpawnBrief;
  status: SncWorkerStatus;
  spawnedAt: string;
  updatedAt: string;
  controllerSessionKey?: string;
  childSessionKey?: string;
  runId?: string;
  completedAt?: string;
  result?: SncWorkerResult;
  followUp?: SncWorkerFollowUpObservation;
};

export type SncWorkerControllerState = {
  controllerSessionKey?: string;
  maxActiveWorkers: number;
  queuedWorkerIds: string[];
  activeWorkerIds: string[];
  completedWorkerIds: string[];
  records: SncWorkerTrackingRecord[];
};

export type SncWorkerResult = {
  workerId: string;
  status: SncWorkerResultStatus;
  summary?: string;
  findings: string[];
  recommendations: string[];
  evidence: string[];
  nextSteps: string[];
  followUpMode: SncWorkerFollowUpMode;
  completedAt?: string;
  controllerSessionKey?: string;
  childSessionKey?: string;
  runId?: string;
};

export type SncWorkerFoldBack = {
  workerId: string;
  status: SncWorkerResultStatus;
  summary: string;
  controllerNotes: string[];
  controllerActions: string[];
  followUpMode: SncWorkerFollowUpMode;
  nextBrief?: string;
};

export type SncWorkerJobContractInput = {
  jobId: string;
  title: string;
  role?: SncWorkerRole;
  kind: SncWorkerJobKind;
  objective: string;
  deliverables?: string[];
  constraints?: string[];
  spawnMode?: SncWorkerSpawnMode;
  completionMode?: SncWorkerCompletionMode;
  maxTurns?: number;
  allowFollowUp?: boolean;
  focus?: string;
  controllerNotes?: string[];
};

export type SncWorkerSpawnBriefInput = {
  workerId?: string;
  controllerSessionKey?: string;
  runId?: string;
  now?: string;
};

export type SncWorkerExpectationInput = {
  controllerSessionKey?: string;
  now?: string;
  workerId?: string;
  brief?: SncWorkerSpawnBrief;
  contract: SncWorkerJobContract;
};

export type SncWorkerSpawnedInput = {
  workerId: string;
  controllerSessionKey?: string;
  childSessionKey?: string;
  runId?: string;
  now?: string;
};

export type SncWorkerResultInput = SncWorkerResult & {
  now?: string;
};

function normalizeText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function normalizeOptionalText(input: unknown): string | undefined {
  if (typeof input !== "string") {
    return undefined;
  }
  const trimmed = normalizeText(input);
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeList(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const entries = new Map<string, string>();
  for (const item of value) {
    const text = normalizeOptionalText(item);
    if (!text) {
      continue;
    }
    entries.set(text.toLowerCase(), text);
  }

  return [...entries.values()].slice(0, limit);
}

function clampInteger(value: unknown, fallback: number, minimum: number, maximum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, Math.floor(value)));
}

function clampActiveWorkers(value: unknown): number {
  return clampInteger(value, DEFAULT_MAX_ACTIVE_WORKERS, 1, 8);
}

function toStableId(parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 12);
}

function ensureWorkerId(contract: SncWorkerJobContract, workerId?: string): string {
  const provided = normalizeOptionalText(workerId);
  if (provided) {
    return provided;
  }
  return `worker-${contract.jobId}-${toStableId([
    contract.jobId,
    contract.title,
    contract.kind,
    contract.objective,
  ])}`;
}

function compactList(value: string[], maxEntries: number): string[] {
  return normalizeList(value, maxEntries);
}

function buildDeliverablesSection(deliverables: string[]): string {
  if (deliverables.length === 0) {
    return "No explicit deliverables beyond the summary callout.";
  }
  return deliverables.map((entry) => `- ${entry}`).join("\n");
}

function buildConstraintsSection(constraints: string[]): string {
  if (constraints.length === 0) {
    return "No extra constraints.";
  }
  return constraints.map((entry) => `- ${entry}`).join("\n");
}

function buildNotesSection(notes: string[]): string {
  if (notes.length === 0) {
    return "None.";
  }
  return notes.map((entry) => `- ${entry}`).join("\n");
}

export function buildSncWorkerJobContract(input: SncWorkerJobContractInput): SncWorkerJobContract {
  const role = input.role ?? "helper";
  const spawnMode = input.spawnMode ?? "run";
  const completionMode = input.completionMode ?? "one-shot";

  return {
    jobId: normalizeText(input.jobId),
    title: normalizeText(input.title),
    role,
    kind: input.kind,
    objective: normalizeText(input.objective),
    deliverables: compactList(input.deliverables ?? [], DEFAULT_MAX_DELIVERABLES),
    constraints: compactList(input.constraints ?? [], DEFAULT_MAX_CONSTRAINTS),
    spawnMode,
    completionMode,
    maxTurns: clampInteger(input.maxTurns, 1, 1, 12),
    allowFollowUp: input.allowFollowUp ?? spawnMode === "session",
    ...(input.focus ? { focus: normalizeText(input.focus) } : {}),
    controllerNotes: compactList(input.controllerNotes ?? [], DEFAULT_MAX_NOTES),
  };
}

export function buildSncWorkerSpawnBrief(
  contract: SncWorkerJobContract,
  input: SncWorkerSpawnBriefInput = {},
): SncWorkerSpawnBrief {
  const workerId = ensureWorkerId(contract, input.workerId);
  const promptLines = [
    `Worker role: ${contract.role}`,
    `Job kind: ${contract.kind}`,
    `Objective: ${contract.objective}`,
    contract.focus ? `Focus: ${contract.focus}` : undefined,
    `Completion mode: ${contract.completionMode}`,
    `Spawn mode: ${contract.spawnMode}`,
    `Maximum turns: ${contract.maxTurns}`,
    "",
    "Deliverables:",
    buildDeliverablesSection(contract.deliverables),
    "",
    "Constraints:",
    buildConstraintsSection(contract.constraints),
    "",
    "Controller notes:",
    buildNotesSection(contract.controllerNotes),
    "",
    "Result contract:",
    `Return a bounded summary plus findings, recommendations, and evidence.`,
    `Do not exceed the assigned turn budget.`,
    contract.allowFollowUp
      ? "If more work is needed, ask the controller for a follow-up instead of expanding scope."
      : "Treat this as a one-shot helper job unless the controller explicitly reassigns you.",
  ].filter((line): line is string => Boolean(line));

  return {
    workerId,
    jobId: contract.jobId,
    title: contract.title,
    role: contract.role,
    kind: contract.kind,
    spawnMode: contract.spawnMode,
    completionMode: contract.completionMode,
    prompt: promptLines.join("\n"),
    checklist: [...contract.deliverables],
    controllerNotes: [...contract.controllerNotes],
    resultContract: [
      `Summarize the result in one compact controller-ready paragraph.`,
      contract.deliverables.length > 0
        ? `Make sure the answer covers: ${contract.deliverables.join(", ")}.`
        : "If no deliverables were supplied, emphasize the key conclusion and any safety constraints.",
    ].join(" "),
  };
}

export function renderSncWorkerSpawnBrief(brief: SncWorkerSpawnBrief): string {
  return [
    `Worker ${brief.workerId}`,
    `Title: ${brief.title}`,
    `Role: ${brief.role}`,
    `Kind: ${brief.kind}`,
    `Prompt:`,
    brief.prompt,
    "",
    `Checklist:`,
    brief.checklist.length > 0 ? brief.checklist.map((entry) => `- ${entry}`).join("\n") : "- None.",
    "",
    `Controller notes:`,
    brief.controllerNotes.length > 0
      ? brief.controllerNotes.map((entry) => `- ${entry}`).join("\n")
      : "- None.",
    "",
    `Result contract: ${brief.resultContract}`,
  ].join("\n");
}

export function createSncWorkerControllerState(input: {
  controllerSessionKey?: string;
  maxActiveWorkers?: number;
} = {}): SncWorkerControllerState {
  return {
    ...(normalizeOptionalText(input.controllerSessionKey)
      ? { controllerSessionKey: normalizeOptionalText(input.controllerSessionKey) }
      : {}),
    maxActiveWorkers: clampActiveWorkers(input.maxActiveWorkers),
    queuedWorkerIds: [],
    activeWorkerIds: [],
    completedWorkerIds: [],
    records: [],
  };
}

function cloneState(state: SncWorkerControllerState): SncWorkerControllerState {
  return {
    ...(state.controllerSessionKey ? { controllerSessionKey: state.controllerSessionKey } : {}),
    maxActiveWorkers: clampActiveWorkers(state.maxActiveWorkers),
    queuedWorkerIds: [...state.queuedWorkerIds],
    activeWorkerIds: [...state.activeWorkerIds],
    completedWorkerIds: [...state.completedWorkerIds],
    records: state.records.map((record) => ({
      ...record,
      contract: {
        ...record.contract,
        deliverables: [...record.contract.deliverables],
        constraints: [...record.contract.constraints],
        controllerNotes: [...record.contract.controllerNotes],
      },
      brief: {
        ...record.brief,
        checklist: [...record.brief.checklist],
        controllerNotes: [...record.brief.controllerNotes],
      },
      ...(record.result
        ? {
            result: {
              ...record.result,
              findings: [...record.result.findings],
              recommendations: [...record.result.recommendations],
              evidence: [...record.result.evidence],
              nextSteps: [...record.result.nextSteps],
            },
          }
        : {}),
      ...(record.followUp
        ? {
            followUp: {
              ...record.followUp,
            },
          }
        : {}),
    })),
  };
}

function findRecordIndex(state: SncWorkerControllerState, workerId: string): number {
  return state.records.findIndex((record) => record.workerId === workerId);
}

function replaceRecord(
  state: SncWorkerControllerState,
  workerId: string,
  nextRecord: SncWorkerTrackingRecord,
): SncWorkerControllerState {
  const records = state.records.map((record) => (record.workerId === workerId ? nextRecord : record));
  return {
    ...state,
    records,
    queuedWorkerIds: records.filter((record) => record.status === "queued").map((record) => record.workerId),
    activeWorkerIds: records
      .filter((record) => record.status === "spawned" || record.status === "running")
      .map((record) => record.workerId),
    completedWorkerIds: records
      .filter((record) => record.status === "complete" || record.status === "failed" || record.status === "aborted")
      .map((record) => record.workerId),
  };
}

export function canScheduleSncWorker(state: SncWorkerControllerState): boolean {
  return state.activeWorkerIds.length < state.maxActiveWorkers;
}

export function queueSncWorkerExpectation(
  state: SncWorkerControllerState,
  input: SncWorkerExpectationInput,
): SncWorkerControllerState {
  const nextState = cloneState(state);
  const workerId = ensureWorkerId(input.contract, input.workerId);
  const brief =
    input.brief ??
    buildSncWorkerSpawnBrief(input.contract, {
      workerId,
      controllerSessionKey: input.controllerSessionKey ?? state.controllerSessionKey,
      now: input.now,
    });

  const record: SncWorkerTrackingRecord = {
    workerId,
    contract: input.contract,
    brief,
    status: "queued",
    spawnedAt: input.now ?? new Date().toISOString(),
    updatedAt: input.now ?? new Date().toISOString(),
    ...(input.controllerSessionKey || state.controllerSessionKey
      ? { controllerSessionKey: input.controllerSessionKey ?? state.controllerSessionKey }
      : {}),
  };

  if (findRecordIndex(nextState, workerId) >= 0) {
    return replaceRecord(nextState, workerId, record);
  }

  return {
    ...nextState,
    queuedWorkerIds: [...nextState.queuedWorkerIds, workerId],
    records: [...nextState.records, record],
  };
}

export function markSncWorkerSpawned(
  state: SncWorkerControllerState,
  input: SncWorkerSpawnedInput,
): SncWorkerControllerState {
  const index = findRecordIndex(state, input.workerId);
  if (index < 0) {
    return state;
  }

  const record = state.records[index];
  const nextRecord: SncWorkerTrackingRecord = {
    ...record,
    status: canScheduleSncWorker(state) ? "spawned" : "blocked",
    updatedAt: input.now ?? new Date().toISOString(),
    ...(input.controllerSessionKey || record.controllerSessionKey
      ? { controllerSessionKey: input.controllerSessionKey ?? record.controllerSessionKey }
      : {}),
    ...(input.childSessionKey ? { childSessionKey: input.childSessionKey } : {}),
    ...(input.runId ? { runId: input.runId } : {}),
  };

  return replaceRecord(state, input.workerId, nextRecord);
}

export function markSncWorkerRunning(
  state: SncWorkerControllerState,
  workerId: string,
  now = new Date().toISOString(),
): SncWorkerControllerState {
  const index = findRecordIndex(state, workerId);
  if (index < 0) {
    return state;
  }

  return replaceRecord(state, workerId, {
    ...state.records[index],
    status: "running",
    updatedAt: now,
  });
}

export function recordSncWorkerResult(
  state: SncWorkerControllerState,
  input: SncWorkerResultInput,
): SncWorkerControllerState {
  const index = findRecordIndex(state, input.workerId);
  if (index < 0) {
    return state;
  }

  const now = input.now ?? input.completedAt ?? new Date().toISOString();
  const record = state.records[index];
  const nextRecord: SncWorkerTrackingRecord = {
    ...record,
    status: input.status,
    updatedAt: now,
    ...(input.completedAt ? { completedAt: input.completedAt } : { completedAt: now }),
    result: {
      workerId: input.workerId,
      status: input.status,
      summary: normalizeOptionalText(input.summary),
      findings: compactList(input.findings, DEFAULT_MAX_FINDINGS),
      recommendations: compactList(input.recommendations, DEFAULT_MAX_FINDINGS),
      evidence: compactList(input.evidence, DEFAULT_MAX_FINDINGS),
      nextSteps: compactList(input.nextSteps, DEFAULT_MAX_FINDINGS),
      followUpMode: input.followUpMode,
      ...(input.completedAt ? { completedAt: input.completedAt } : {}),
      ...(input.controllerSessionKey || record.controllerSessionKey
        ? { controllerSessionKey: input.controllerSessionKey ?? record.controllerSessionKey }
        : {}),
      ...(input.childSessionKey ? { childSessionKey: input.childSessionKey } : {}),
      ...(input.runId ? { runId: input.runId } : {}),
    },
  };

  return replaceRecord(state, input.workerId, nextRecord);
}

export function foldSncWorkerResult(
  result: SncWorkerResult,
  contract?: Pick<SncWorkerJobContract, "title" | "objective" | "deliverables" | "constraints">,
): SncWorkerFoldBack {
  const summary =
    normalizeOptionalText(result.summary) ??
    `${result.status === "complete" ? "Completed" : result.status === "aborted" ? "Aborted" : "Failed"} worker ${result.workerId}.`;
  const controllerNotes = [
    summary,
    ...(result.findings.length > 0 ? [`Findings: ${result.findings.join(" | ")}`] : []),
    ...(result.recommendations.length > 0
      ? [`Recommendations: ${result.recommendations.join(" | ")}`]
      : []),
    ...(result.evidence.length > 0 ? [`Evidence: ${result.evidence.join(" | ")}`] : []),
    ...(result.nextSteps.length > 0 ? [`Next steps: ${result.nextSteps.join(" | ")}`] : []),
  ];
  const controllerActions: string[] = [];

  if (result.status === "complete") {
    controllerActions.push("accept result");
    if (result.followUpMode === "spawn") {
      controllerActions.push("queue follow-up worker");
    } else if (result.followUpMode === "steer") {
      controllerActions.push("steer controller flow");
    }
  } else if (result.status === "aborted") {
    controllerActions.push("record interruption");
    if (result.followUpMode !== "none") {
      controllerActions.push("decide whether to retry with a narrower brief");
    }
  } else {
    controllerActions.push("mark work as failed");
    controllerActions.push("inspect whether the next attempt needs a stricter contract");
  }

  const nextBrief =
    result.followUpMode === "spawn" && contract
      ? renderSncWorkerSpawnBrief(
          buildSncWorkerSpawnBrief(
            {
              jobId: `follow-up-${result.workerId}`,
              title: `Follow-up for ${contract.title}`,
              role: "helper",
              kind: "analysis",
              objective: `Continue from the result of ${contract.title}.`,
              deliverables: contract.deliverables.length > 0 ? [...contract.deliverables] : ["Summarize the key follow-up question."],
              constraints: [...contract.constraints],
              spawnMode: "run",
              completionMode: "one-shot",
              maxTurns: 1,
              allowFollowUp: false,
              ...(contract.title ? { focus: contract.title } : {}),
              controllerNotes: [`Continue from the previous worker result for ${contract.title}.`],
            },
            { workerId: `follow-up-${result.workerId}` },
          ),
        )
      : undefined;

  return {
    workerId: result.workerId,
    status: result.status,
    summary,
    controllerNotes,
    controllerActions,
    followUpMode: result.followUpMode,
    ...(nextBrief ? { nextBrief } : {}),
  };
}

export function summarizeSncWorkerControllerState(state: SncWorkerControllerState): string {
  const lines = [
    `maxActiveWorkers: ${state.maxActiveWorkers}`,
    `queued: ${state.queuedWorkerIds.length}`,
    `active: ${state.activeWorkerIds.length}`,
    `completed: ${state.completedWorkerIds.length}`,
  ];

  for (const record of state.records) {
    lines.push(`- ${record.workerId}: ${record.status} / ${record.contract.title}`);
  }

  return lines.join("\n");
}
