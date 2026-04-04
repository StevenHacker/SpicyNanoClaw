import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { normalizeHyphenSlug } from "openclaw/plugin-sdk/core";
import {
  buildSncWorkerResultFromCompletionEvent,
  parseSncWorkerCompletionEventsFromMessages,
  type SncParsedWorkerCompletionEvent,
} from "./worker-execution.js";
import {
  createSncWorkerControllerState,
  foldSncWorkerResult,
  markSncWorkerRunning,
  markSncWorkerSpawned,
  recordSncWorkerResult,
  summarizeSncWorkerControllerState,
  type SncWorkerCompletionMode,
  type SncWorkerControllerState,
  type SncWorkerFoldBack,
  type SncWorkerFollowUpMode,
  type SncWorkerJobContract,
  type SncWorkerJobKind,
  type SncWorkerResult,
  type SncWorkerRole,
  type SncWorkerSpawnBrief,
  type SncWorkerSpawnMode,
  type SncWorkerStatus,
  type SncWorkerTrackingRecord,
} from "./worker-policy.js";

const WORKER_STATE_VERSION = 1;
const MAX_CONSUMED_EVENT_KEYS = 48;
const MAX_RECENT_FOLD_BACKS = 6;
const MAX_FOLD_BACK_NOTES = 3;
const MAX_FOLD_BACK_ACTIONS = 3;

export type SncWorkerState = {
  version: number;
  sessionId: string;
  sessionKey?: string;
  updatedAt: string;
  controllerState: SncWorkerControllerState;
  recentFoldBacks: SncWorkerFoldBack[];
  consumedCompletionEventKeys: string[];
};

export type SncPersistWorkerStateInput = {
  stateDir?: string;
  sessionId: string;
  sessionKey?: string;
  controllerState: SncWorkerControllerState;
  recentFoldBacks?: SncWorkerFoldBack[];
  consumedCompletionEventKeys?: string[];
  updatedAt?: string;
};

export type SncApplyWorkerCompletionEventsInput = {
  stateDir?: string;
  sessionId: string;
  sessionKey?: string;
  messages: AgentMessage[];
  updatedAt?: string;
};

export type SncApplyWorkerSpawnedLifecycleInput = {
  stateDir?: string;
  requesterSessionKey?: string;
  childSessionKey: string;
  runId?: string;
  updatedAt?: string;
};

export type SncApplyWorkerEndedLifecycleInput = {
  stateDir?: string;
  requesterSessionKey?: string;
  targetSessionKey: string;
  runId?: string;
  reason?: string;
  outcome?: string;
  error?: string;
  updatedAt?: string;
};

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeTextKey(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeStringArray(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const entries = new Map<string, string>();
  for (const item of value) {
    const normalized = normalizeOptionalString(item);
    if (!normalized) {
      continue;
    }
    entries.set(normalizeTextKey(normalized), normalized);
    if (entries.size >= limit) {
      break;
    }
  }
  return [...entries.values()];
}

function clampInteger(value: unknown, fallback: number, minimum: number, maximum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, Math.floor(value)));
}

function normalizeWorkerRole(value: unknown): SncWorkerRole | undefined {
  return value === "controller" || value === "helper" || value === "specialist" ? value : undefined;
}

function normalizeWorkerJobKind(value: unknown): SncWorkerJobKind | undefined {
  return value === "research" ||
    value === "continuity-check" ||
    value === "analysis" ||
    value === "draft-support" ||
    value === "review"
    ? value
    : undefined;
}

function normalizeWorkerSpawnMode(value: unknown): SncWorkerSpawnMode | undefined {
  return value === "run" || value === "session" ? value : undefined;
}

function normalizeWorkerCompletionMode(value: unknown): SncWorkerCompletionMode | undefined {
  return value === "one-shot" || value === "iterative" ? value : undefined;
}

function normalizeWorkerStatus(value: unknown): SncWorkerStatus | undefined {
  return value === "queued" ||
    value === "spawned" ||
    value === "running" ||
    value === "blocked" ||
    value === "complete" ||
    value === "failed" ||
    value === "aborted"
    ? value
    : undefined;
}

function normalizeWorkerFollowUpMode(value: unknown): SncWorkerFollowUpMode | undefined {
  return value === "none" || value === "steer" || value === "spawn" ? value : undefined;
}

function normalizeWorkerJobContract(value: unknown): SncWorkerJobContract | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const jobId = normalizeOptionalString((value as { jobId?: unknown }).jobId);
  const title = normalizeOptionalString((value as { title?: unknown }).title);
  const role = normalizeWorkerRole((value as { role?: unknown }).role);
  const kind = normalizeWorkerJobKind((value as { kind?: unknown }).kind);
  const objective = normalizeOptionalString((value as { objective?: unknown }).objective);
  const spawnMode = normalizeWorkerSpawnMode((value as { spawnMode?: unknown }).spawnMode);
  const completionMode = normalizeWorkerCompletionMode(
    (value as { completionMode?: unknown }).completionMode,
  );
  const allowFollowUp = (value as { allowFollowUp?: unknown }).allowFollowUp;
  const maxTurns = (value as { maxTurns?: unknown }).maxTurns;
  const focus = normalizeOptionalString((value as { focus?: unknown }).focus);

  if (!jobId || !title || !role || !kind || !objective || !spawnMode || !completionMode) {
    return undefined;
  }

  return {
    jobId,
    title,
    role,
    kind,
    objective,
    deliverables: normalizeStringArray((value as { deliverables?: unknown }).deliverables, 8),
    constraints: normalizeStringArray((value as { constraints?: unknown }).constraints, 8),
    spawnMode,
    completionMode,
    maxTurns: clampInteger(maxTurns, 1, 1, 12),
    allowFollowUp: allowFollowUp === true,
    ...(focus ? { focus } : {}),
    controllerNotes: normalizeStringArray(
      (value as { controllerNotes?: unknown }).controllerNotes,
      8,
    ),
  };
}

function normalizeWorkerSpawnBrief(value: unknown): SncWorkerSpawnBrief | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const workerId = normalizeOptionalString((value as { workerId?: unknown }).workerId);
  const jobId = normalizeOptionalString((value as { jobId?: unknown }).jobId);
  const title = normalizeOptionalString((value as { title?: unknown }).title);
  const role = normalizeWorkerRole((value as { role?: unknown }).role);
  const kind = normalizeWorkerJobKind((value as { kind?: unknown }).kind);
  const spawnMode = normalizeWorkerSpawnMode((value as { spawnMode?: unknown }).spawnMode);
  const completionMode = normalizeWorkerCompletionMode(
    (value as { completionMode?: unknown }).completionMode,
  );
  const prompt = normalizeOptionalString((value as { prompt?: unknown }).prompt);
  const resultContract = normalizeOptionalString(
    (value as { resultContract?: unknown }).resultContract,
  );

  if (
    !workerId ||
    !jobId ||
    !title ||
    !role ||
    !kind ||
    !spawnMode ||
    !completionMode ||
    !prompt ||
    !resultContract
  ) {
    return undefined;
  }

  return {
    workerId,
    jobId,
    title,
    role,
    kind,
    spawnMode,
    completionMode,
    prompt,
    checklist: normalizeStringArray((value as { checklist?: unknown }).checklist, 8),
    controllerNotes: normalizeStringArray(
      (value as { controllerNotes?: unknown }).controllerNotes,
      8,
    ),
    resultContract,
  };
}

function normalizeWorkerResult(value: unknown): SncWorkerResult | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const workerId = normalizeOptionalString((value as { workerId?: unknown }).workerId);
  const status = normalizeWorkerStatus((value as { status?: unknown }).status);
  const followUpMode = normalizeWorkerFollowUpMode(
    (value as { followUpMode?: unknown }).followUpMode,
  );
  if (
    !workerId ||
    (status !== "complete" && status !== "failed" && status !== "aborted") ||
    !followUpMode
  ) {
    return undefined;
  }

  const summary = normalizeOptionalString((value as { summary?: unknown }).summary);
  const completedAt = normalizeOptionalString((value as { completedAt?: unknown }).completedAt);
  const controllerSessionKey = normalizeOptionalString(
    (value as { controllerSessionKey?: unknown }).controllerSessionKey,
  );
  const childSessionKey = normalizeOptionalString(
    (value as { childSessionKey?: unknown }).childSessionKey,
  );
  const runId = normalizeOptionalString((value as { runId?: unknown }).runId);

  return {
    workerId,
    status,
    ...(summary ? { summary } : {}),
    findings: normalizeStringArray((value as { findings?: unknown }).findings, 8),
    recommendations: normalizeStringArray(
      (value as { recommendations?: unknown }).recommendations,
      8,
    ),
    evidence: normalizeStringArray((value as { evidence?: unknown }).evidence, 8),
    nextSteps: normalizeStringArray((value as { nextSteps?: unknown }).nextSteps, 8),
    followUpMode,
    ...(completedAt ? { completedAt } : {}),
    ...(controllerSessionKey ? { controllerSessionKey } : {}),
    ...(childSessionKey ? { childSessionKey } : {}),
    ...(runId ? { runId } : {}),
  };
}

function normalizeWorkerTrackingRecord(value: unknown): SncWorkerTrackingRecord | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const workerId = normalizeOptionalString((value as { workerId?: unknown }).workerId);
  const contract = normalizeWorkerJobContract((value as { contract?: unknown }).contract);
  const brief = normalizeWorkerSpawnBrief((value as { brief?: unknown }).brief);
  const status = normalizeWorkerStatus((value as { status?: unknown }).status);
  const spawnedAt = normalizeOptionalString((value as { spawnedAt?: unknown }).spawnedAt);
  const updatedAt = normalizeOptionalString((value as { updatedAt?: unknown }).updatedAt);
  const controllerSessionKey = normalizeOptionalString(
    (value as { controllerSessionKey?: unknown }).controllerSessionKey,
  );
  const childSessionKey = normalizeOptionalString(
    (value as { childSessionKey?: unknown }).childSessionKey,
  );
  const runId = normalizeOptionalString((value as { runId?: unknown }).runId);
  const completedAt = normalizeOptionalString((value as { completedAt?: unknown }).completedAt);
  const result = normalizeWorkerResult((value as { result?: unknown }).result);

  if (!workerId || !contract || !brief || !status || !spawnedAt || !updatedAt) {
    return undefined;
  }

  return {
    workerId,
    contract,
    brief,
    status,
    spawnedAt,
    updatedAt,
    ...(controllerSessionKey ? { controllerSessionKey } : {}),
    ...(childSessionKey ? { childSessionKey } : {}),
    ...(runId ? { runId } : {}),
    ...(completedAt ? { completedAt } : {}),
    ...(result ? { result } : {}),
  };
}

function normalizeControllerState(
  value: unknown,
  controllerSessionKey?: string,
): SncWorkerControllerState {
  const maxActiveWorkers =
    value && typeof value === "object" && !Array.isArray(value)
      ? clampInteger((value as { maxActiveWorkers?: unknown }).maxActiveWorkers, 2, 1, 8)
      : undefined;
  const baseState = createSncWorkerControllerState({
    controllerSessionKey,
    maxActiveWorkers,
  });

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return baseState;
  }

  const records = Array.isArray((value as { records?: unknown }).records)
    ? (value as { records: unknown[] }).records
        .map((record) => normalizeWorkerTrackingRecord(record))
        .filter((record): record is SncWorkerTrackingRecord => Boolean(record))
    : [];

  return {
    ...(normalizeOptionalString((value as { controllerSessionKey?: unknown }).controllerSessionKey) ??
    baseState.controllerSessionKey
      ? {
          controllerSessionKey:
            normalizeOptionalString((value as { controllerSessionKey?: unknown }).controllerSessionKey) ??
            baseState.controllerSessionKey,
        }
      : {}),
    maxActiveWorkers: baseState.maxActiveWorkers,
    queuedWorkerIds: records
      .filter((record) => record.status === "queued")
      .map((record) => record.workerId),
    activeWorkerIds: records
      .filter((record) => record.status === "spawned" || record.status === "running")
      .map((record) => record.workerId),
    completedWorkerIds: records
      .filter(
        (record) =>
          record.status === "complete" ||
          record.status === "failed" ||
          record.status === "aborted",
      )
      .map((record) => record.workerId),
    records,
  };
}

function normalizeFoldBack(value: unknown): SncWorkerFoldBack | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const workerId = normalizeOptionalString((value as { workerId?: unknown }).workerId);
  const status = normalizeWorkerStatus((value as { status?: unknown }).status);
  const summary = normalizeOptionalString((value as { summary?: unknown }).summary);
  const followUpMode = normalizeWorkerFollowUpMode(
    (value as { followUpMode?: unknown }).followUpMode,
  );
  const nextBrief = normalizeOptionalString((value as { nextBrief?: unknown }).nextBrief);
  if (
    !workerId ||
    (status !== "complete" && status !== "failed" && status !== "aborted") ||
    !summary ||
    !followUpMode
  ) {
    return undefined;
  }

  return {
    workerId,
    status,
    summary,
    controllerNotes: normalizeStringArray(
      (value as { controllerNotes?: unknown }).controllerNotes,
      8,
    ),
    controllerActions: normalizeStringArray(
      (value as { controllerActions?: unknown }).controllerActions,
      8,
    ),
    followUpMode,
    ...(nextBrief ? { nextBrief } : {}),
  };
}

function normalizeFoldBacks(value: unknown): SncWorkerFoldBack[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => normalizeFoldBack(entry))
    .filter((entry): entry is SncWorkerFoldBack => Boolean(entry))
    .slice(-MAX_RECENT_FOLD_BACKS);
}

function buildStateFilename(sessionId: string, sessionKey?: string): string {
  const rawLabel = sessionKey?.trim() || sessionId.trim() || "session";
  const slug = normalizeHyphenSlug(rawLabel) || "session";
  const hash = createHash("sha1").update(rawLabel).digest("hex").slice(0, 10);
  return `${slug}-${hash}.json`;
}

function buildStatePath(stateDir: string, sessionId: string, sessionKey?: string): string {
  return path.join(stateDir, "workers", buildStateFilename(sessionId, sessionKey));
}

function buildCompletionEventKey(event: SncParsedWorkerCompletionEvent): string {
  return createHash("sha1")
    .update(
      [
        event.source,
        event.childSessionKey,
        event.childSessionId ?? "",
        event.announceType,
        event.taskLabel,
        event.statusLabel,
        event.resultText,
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 16);
}

function mergeFoldBacks(existing: SncWorkerFoldBack[], incoming: SncWorkerFoldBack[]): SncWorkerFoldBack[] {
  const merged = new Map<string, SncWorkerFoldBack>();
  for (const entry of [...existing, ...incoming]) {
    merged.set(entry.workerId, entry);
  }
  return [...merged.values()].slice(-MAX_RECENT_FOLD_BACKS);
}

function resolveWorkerStateLookup(params: {
  sessionId?: string;
  sessionKey?: string;
}): { sessionId: string; sessionKey?: string } | null {
  const sessionKey = normalizeOptionalString(params.sessionKey);
  const sessionId = normalizeOptionalString(params.sessionId) ?? sessionKey;
  if (!sessionId) {
    return null;
  }
  return {
    sessionId,
    ...(sessionKey ? { sessionKey } : {}),
  };
}

function mergeConsumedKeys(existing: string[], incoming: string[]): string[] {
  const merged = new Map<string, string>();
  for (const entry of [...existing, ...incoming]) {
    const normalized = normalizeOptionalString(entry);
    if (!normalized) {
      continue;
    }
    merged.set(normalized, normalized);
  }
  return [...merged.values()].slice(-MAX_CONSUMED_EVENT_KEYS);
}

function buildEmptyWorkerState(params: {
  sessionId: string;
  sessionKey?: string;
  updatedAt?: string;
}): SncWorkerState {
  return {
    version: WORKER_STATE_VERSION,
    sessionId: params.sessionId,
    ...(params.sessionKey ? { sessionKey: params.sessionKey } : {}),
    updatedAt: params.updatedAt ?? new Date().toISOString(),
    controllerState: createSncWorkerControllerState({
      controllerSessionKey: params.sessionKey,
    }),
    recentFoldBacks: [],
    consumedCompletionEventKeys: [],
  };
}

function normalizeWorkerState(
  value: unknown,
  params: { sessionId: string; sessionKey?: string },
): SncWorkerState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return buildEmptyWorkerState(params);
  }

  const updatedAt =
    normalizeOptionalString((value as { updatedAt?: unknown }).updatedAt) ??
    new Date(0).toISOString();
  const sessionId =
    normalizeOptionalString((value as { sessionId?: unknown }).sessionId) ?? params.sessionId;
  const sessionKey =
    normalizeOptionalString((value as { sessionKey?: unknown }).sessionKey) ?? params.sessionKey;

  return {
    version:
      typeof (value as { version?: unknown }).version === "number"
        ? (value as { version: number }).version
        : WORKER_STATE_VERSION,
    sessionId,
    ...(sessionKey ? { sessionKey } : {}),
    updatedAt,
    controllerState: normalizeControllerState(
      (value as { controllerState?: unknown }).controllerState,
      sessionKey,
    ),
    recentFoldBacks: normalizeFoldBacks((value as { recentFoldBacks?: unknown }).recentFoldBacks),
    consumedCompletionEventKeys: normalizeStringArray(
      (value as { consumedCompletionEventKeys?: unknown }).consumedCompletionEventKeys,
      MAX_CONSUMED_EVENT_KEYS,
    ),
  };
}

export async function loadSncWorkerState(params: {
  stateDir?: string;
  sessionId: string;
  sessionKey?: string;
}): Promise<SncWorkerState | null> {
  if (!params.stateDir) {
    return null;
  }

  try {
    const raw = await readFile(buildStatePath(params.stateDir, params.sessionId, params.sessionKey), "utf8");
    return normalizeWorkerState(JSON.parse(raw) as unknown, params);
  } catch {
    return null;
  }
}

export async function persistSncWorkerState(
  input: SncPersistWorkerStateInput,
): Promise<SncWorkerState | null> {
  if (!input.stateDir) {
    return null;
  }

  const nextState: SncWorkerState = {
    version: WORKER_STATE_VERSION,
    sessionId: input.sessionId,
    ...(input.sessionKey ? { sessionKey: input.sessionKey } : {}),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    controllerState: normalizeControllerState(input.controllerState, input.sessionKey),
    recentFoldBacks: normalizeFoldBacks(input.recentFoldBacks ?? []),
    consumedCompletionEventKeys: mergeConsumedKeys([], input.consumedCompletionEventKeys ?? []),
  };

  const filePath = buildStatePath(input.stateDir, input.sessionId, input.sessionKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
  return nextState;
}

function findTrackedWorker(
  controllerState: SncWorkerControllerState,
  params: {
    childSessionKey?: string;
    runId?: string;
  },
): SncWorkerTrackingRecord | undefined {
  return controllerState.records.find((record) => {
    if (params.runId && record.runId === params.runId) {
      return true;
    }
    if (params.childSessionKey && record.childSessionKey === params.childSessionKey) {
      return true;
    }
    return false;
  });
}

function buildLifecycleFallbackResult(params: {
  record: SncWorkerTrackingRecord;
  requesterSessionKey?: string;
  targetSessionKey: string;
  runId?: string;
  reason?: string;
  outcome?: string;
  error?: string;
  completedAt: string;
}): SncWorkerResult {
  const outcome = normalizeOptionalString(params.outcome)?.toLowerCase();
  const reason = normalizeOptionalString(params.reason) ?? "subagent-ended";
  const error = normalizeOptionalString(params.error);

  let status: SncWorkerResult["status"] = "failed";
  if (outcome === "killed" || outcome === "reset" || outcome === "deleted") {
    status = "aborted";
  } else if (outcome === "ok") {
    status = "complete";
  }

  const summary =
    status === "complete"
      ? `${params.record.contract.title}: completed via host lifecycle hook.`
      : status === "aborted"
        ? `${params.record.contract.title}: ended before normal completion (${outcome ?? reason}).`
        : `${params.record.contract.title}: failed before normal completion (${outcome ?? reason}).`;

  const recommendations =
    status === "complete"
      ? ["If a richer child completion payload was expected, inspect the host announce path before trusting the generic lifecycle completion."]
      : ["Inspect whether the worker should be retried, narrowed, or explicitly abandoned."];
  const nextSteps =
    status === "complete"
      ? ["Decide whether this worker can be accepted as complete without a richer completion payload."]
      : ["Review the child session outcome and decide whether to retry or narrow the brief."];

  return {
    workerId: params.record.workerId,
    status,
    summary,
    findings: error ? [error] : [],
    recommendations,
    evidence: [
      `reason: ${reason}`,
      ...(outcome ? [`outcome: ${outcome}`] : []),
      `childSessionKey: ${params.targetSessionKey}`,
      ...(params.runId ? [`runId: ${params.runId}`] : []),
    ],
    nextSteps,
    followUpMode: "none",
    completedAt: params.completedAt,
    ...(params.requesterSessionKey ? { controllerSessionKey: params.requesterSessionKey } : {}),
    childSessionKey: params.targetSessionKey,
    ...(params.runId ? { runId: params.runId } : {}),
  };
}

export async function applySncWorkerSpawnedLifecycle(
  input: SncApplyWorkerSpawnedLifecycleInput,
): Promise<SncWorkerState | null> {
  if (!input.stateDir) {
    return null;
  }

  const lookup = resolveWorkerStateLookup({
    sessionId: input.requesterSessionKey,
    sessionKey: input.requesterSessionKey,
  });
  if (!lookup) {
    return null;
  }

  const existing = await loadSncWorkerState({
    stateDir: input.stateDir,
    sessionId: lookup.sessionId,
    sessionKey: lookup.sessionKey,
  });
  if (!existing) {
    return null;
  }

  const record = findTrackedWorker(existing.controllerState, {
    childSessionKey: input.childSessionKey,
    runId: input.runId,
  });
  if (!record) {
    return existing;
  }

  const now = input.updatedAt ?? new Date().toISOString();
  let controllerState = markSncWorkerSpawned(existing.controllerState, {
    workerId: record.workerId,
    controllerSessionKey: lookup.sessionKey,
    childSessionKey: input.childSessionKey,
    ...(input.runId ? { runId: input.runId } : {}),
    now,
  });
  controllerState = markSncWorkerRunning(controllerState, record.workerId, now);

  return await persistSncWorkerState({
    stateDir: input.stateDir,
    sessionId: existing.sessionId,
    sessionKey: existing.sessionKey,
    controllerState,
    recentFoldBacks: existing.recentFoldBacks,
    consumedCompletionEventKeys: existing.consumedCompletionEventKeys,
    updatedAt: now,
  });
}

export async function applySncWorkerEndedLifecycle(
  input: SncApplyWorkerEndedLifecycleInput,
): Promise<SncWorkerState | null> {
  if (!input.stateDir) {
    return null;
  }

  const lookup = resolveWorkerStateLookup({
    sessionId: input.requesterSessionKey,
    sessionKey: input.requesterSessionKey,
  });
  if (!lookup) {
    return null;
  }

  const existing = await loadSncWorkerState({
    stateDir: input.stateDir,
    sessionId: lookup.sessionId,
    sessionKey: lookup.sessionKey,
  });
  if (!existing) {
    return null;
  }

  const record = findTrackedWorker(existing.controllerState, {
    childSessionKey: input.targetSessionKey,
    runId: input.runId,
  });
  if (!record) {
    return existing;
  }

  if (
    record.status === "complete" ||
    record.status === "failed" ||
    record.status === "aborted"
  ) {
    return existing;
  }

  const result = buildLifecycleFallbackResult({
    record,
    requesterSessionKey: lookup.sessionKey,
    targetSessionKey: input.targetSessionKey,
    runId: input.runId,
    reason: input.reason,
    outcome: input.outcome,
    error: input.error,
    completedAt: input.updatedAt ?? new Date().toISOString(),
  });
  const controllerState = recordSncWorkerResult(existing.controllerState, {
    ...result,
    findings: [...result.findings],
    recommendations: [...result.recommendations],
    evidence: [...result.evidence],
    nextSteps: [...result.nextSteps],
    now: input.updatedAt,
  });

  return await persistSncWorkerState({
    stateDir: input.stateDir,
    sessionId: existing.sessionId,
    sessionKey: existing.sessionKey,
    controllerState,
    recentFoldBacks: mergeFoldBacks(existing.recentFoldBacks, [
      foldSncWorkerResult(result, {
        title: record.contract.title,
        objective: record.contract.objective,
        deliverables: [...record.contract.deliverables],
        constraints: [...record.contract.constraints],
      }),
    ]),
    consumedCompletionEventKeys: existing.consumedCompletionEventKeys,
    updatedAt: input.updatedAt,
  });
}

export async function applySncWorkerCompletionEvents(
  input: SncApplyWorkerCompletionEventsInput,
): Promise<SncWorkerState | null> {
  if (!input.stateDir) {
    return null;
  }

  const existing =
    (await loadSncWorkerState({
      stateDir: input.stateDir,
      sessionId: input.sessionId,
      sessionKey: input.sessionKey,
    })) ?? buildEmptyWorkerState(input);
  const controllerSessionKey =
    existing.controllerState.controllerSessionKey ?? input.sessionKey;
  const seenKeys = new Set(existing.consumedCompletionEventKeys);
  const foldBacks: SncWorkerFoldBack[] = [];
  let controllerState = existing.controllerState;
  let changed = false;

  for (const event of parseSncWorkerCompletionEventsFromMessages(input.messages)) {
    const eventKey = buildCompletionEventKey(event);
    if (seenKeys.has(eventKey)) {
      continue;
    }

    const record = controllerState.records.find(
      (entry) => normalizeOptionalString(entry.childSessionKey) === event.childSessionKey,
    );
    if (!record) {
      continue;
    }

    const result = buildSncWorkerResultFromCompletionEvent({
      workerId: record.workerId,
      event,
      controllerSessionKey,
      childSessionKey: record.childSessionKey ?? event.childSessionKey,
      runId: record.runId,
      completedAt: input.updatedAt ?? new Date().toISOString(),
      followUpMode: "none",
    });

    controllerState = recordSncWorkerResult(controllerState, {
      ...result,
      findings: [...result.findings],
      recommendations: [...result.recommendations],
      evidence: [...result.evidence],
      nextSteps: [...result.nextSteps],
      now: input.updatedAt,
    });

    foldBacks.push(
      foldSncWorkerResult(result, {
        title: record.contract.title,
        objective: record.contract.objective,
        deliverables: [...record.contract.deliverables],
        constraints: [...record.contract.constraints],
      }),
    );
    seenKeys.add(eventKey);
    changed = true;
  }

  if (!changed) {
    return existing;
  }

  return await persistSncWorkerState({
    stateDir: input.stateDir,
    sessionId: input.sessionId,
    sessionKey: input.sessionKey,
    controllerState,
    recentFoldBacks: mergeFoldBacks(existing.recentFoldBacks, foldBacks),
    consumedCompletionEventKeys: [...seenKeys],
    updatedAt: input.updatedAt,
  });
}

export function buildSncWorkerStateSection(state: SncWorkerState): string | undefined {
  if (
    state.controllerState.records.length === 0 &&
    state.recentFoldBacks.length === 0
  ) {
    return undefined;
  }

  const lines = [`updatedAt: ${state.updatedAt}`, summarizeSncWorkerControllerState(state.controllerState)];
  const liveRecords = state.controllerState.records.filter(
    (record) =>
      record.status === "queued" ||
      record.status === "spawned" ||
      record.status === "running" ||
      record.status === "blocked",
  );

  if (liveRecords.length > 0) {
    lines.push("", "Live workers:");
    for (const record of liveRecords.slice(0, 4)) {
      lines.push(
        `- ${record.workerId}: ${record.status} / ${record.contract.title}${
          record.childSessionKey ? ` / child=${record.childSessionKey}` : ""
        }`,
      );
    }
  }

  if (state.recentFoldBacks.length > 0) {
    lines.push("", "Recent worker fold-back:");
    for (const entry of state.recentFoldBacks.slice(-3)) {
      lines.push(`- [${entry.status}] ${entry.summary}`);
      for (const note of entry.controllerNotes.slice(0, MAX_FOLD_BACK_NOTES)) {
        lines.push(`  note: ${note}`);
      }
      for (const action of entry.controllerActions.slice(0, MAX_FOLD_BACK_ACTIONS)) {
        lines.push(`  action: ${action}`);
      }
    }
  }

  return lines.join("\n");
}
