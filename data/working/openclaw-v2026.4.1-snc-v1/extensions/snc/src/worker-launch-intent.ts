import { createHash } from "node:crypto";
import {
  buildSncWorkerLaunchPlan,
  buildSncWorkerSubagentsToolArgs,
  buildSncWorkerYieldToolArgs,
} from "./worker-execution.js";
import {
  buildSncWorkerJobContract,
  createSncWorkerControllerState,
  queueSncWorkerExpectation,
  type SncWorkerControllerState,
  type SncWorkerJobContract,
  type SncWorkerJobKind,
  type SncWorkerTrackingRecord,
} from "./worker-policy.js";
import type { SncSessionState } from "./session-state.js";
import {
  loadSncWorkerState,
  persistSncWorkerState,
  type SncWorkerState,
} from "./worker-state.js";

const HELPER_CUE_PATTERNS = [
  /\b(?:ask|use|have|send|launch|spawn|delegate(?:\s+to)?|hand off to|let)\s+(?:an?\s+)?(?:helper|subagent|worker|specialist|reviewer|researcher)\b/i,
  /\b(?:parallel(?:ize)?|offload)\b.*\b(?:helper|subagent|worker)\b/i,
  /(让|请|交给|委托|派|分给|用|开|起).{0,8}(?:helper|子助手|子代理|助手|worker|专员|审查助手|研究助手)/,
];

const CONTINUITY_KIND_PATTERNS = [
  /\b(?:continuity|canon|foreshadow|callback|payoff|consistency|anchor)\b/i,
  /(连贯|连续|设定|伏笔|呼应|回收|线索|一致性|锚点)/,
];
const REVIEW_KIND_PATTERNS = [
  /\b(?:review|audit|inspect|check|validate|regression|test|bug|patch|code)\b/i,
  /(审查|复查|检查|验证|回归|测试|补丁|代码|缺陷|问题)/,
];
const RESEARCH_KIND_PATTERNS = [
  /\b(?:research|investigate|gather|collect|find out|evidence)\b/i,
  /(调研|调查|搜集|收集|证据|查证|资料|信息)/,
];

const MAX_SECTION_TASK_BYTES = 420;
const MAX_LAUNCHES_IN_SECTION = 2;
const LAUNCH_REPLAY_COOLDOWN_MINUTES = 120;
const DEFAULT_STEER_MESSAGE =
  "Narrow the brief and continue with the bounded helper task only.";

export type SncWorkerLaunchIntent = {
  contract: SncWorkerJobContract;
  sourcePlan: string;
};

type SncWorkerLaunchReplayHold = {
  record: SncWorkerTrackingRecord;
  ageMinutes: number;
  reason: string;
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

function hasHelperCue(text: string): boolean {
  return HELPER_CUE_PATTERNS.some((pattern) => pattern.test(text));
}

function parseTimestamp(value?: string): number | null {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toReferenceTimestamp(now?: string): number {
  return parseTimestamp(now) ?? Date.now();
}

function toAgeMinutes(nowMs: number, record: SncWorkerTrackingRecord): number {
  const basis =
    parseTimestamp(record.completedAt) ??
    parseTimestamp(record.updatedAt) ??
    parseTimestamp(record.spawnedAt);
  if (basis === null) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, Math.floor((nowMs - basis) / 60_000));
}

function describeAgeMinutes(ageMinutes: number): string {
  if (ageMinutes < 60) {
    return `${ageMinutes}m ago`;
  }
  const hours = Math.floor(ageMinutes / 60);
  const minutes = ageMinutes % 60;
  return minutes === 0 ? `${hours}h ago` : `${hours}h ${minutes}m ago`;
}

function inferWorkerKind(text: string): SncWorkerJobKind {
  if (CONTINUITY_KIND_PATTERNS.some((pattern) => pattern.test(text))) {
    return "continuity-check";
  }
  if (REVIEW_KIND_PATTERNS.some((pattern) => pattern.test(text))) {
    return "review";
  }
  if (RESEARCH_KIND_PATTERNS.some((pattern) => pattern.test(text))) {
    return "research";
  }
  return "analysis";
}

function buildJobId(sourcePlan: string, sessionState: SncSessionState): string {
  const basis = [
    sourcePlan,
    sessionState.chapterState.focus ?? "",
    sessionState.chapterState.latestUserDirective ?? "",
  ].join("|");
  return `helper-${createHash("sha1").update(basis).digest("hex").slice(0, 10)}`;
}

function buildTitle(kind: SncWorkerJobKind, sessionState: SncSessionState): string {
  const focus = normalizeOptionalText(sessionState.chapterState.focus);
  const baseTitle =
    kind === "continuity-check"
      ? "Continuity helper"
      : kind === "review"
        ? "Review helper"
        : kind === "research"
          ? "Research helper"
          : "Analysis helper";
  return focus ? `${baseTitle}: ${focus}` : baseTitle;
}

function buildDeliverables(kind: SncWorkerJobKind): string[] {
  switch (kind) {
    case "continuity-check":
      return [
        "List the strongest continuity anchors.",
        "Flag any continuity conflicts or fragile links.",
      ];
    case "review":
      return [
        "Identify the highest-value issues or risks.",
        "Recommend the smallest safe next step.",
      ];
    case "research":
      return [
        "Summarize the strongest findings.",
        "Cite the concrete evidence that supports them.",
      ];
    default:
      return [
        "Summarize the key conclusions.",
        "Provide concrete evidence for those conclusions.",
      ];
  }
}

function buildControllerNotes(
  sourcePlan: string,
  sessionState: SncSessionState,
): string[] {
  const notes: string[] = [`Derived from assistant plan: ${sourcePlan}`];
  if (sessionState.chapterState.latestUserDirective) {
    notes.push(`Respect the latest user directive: ${sessionState.chapterState.latestUserDirective}`);
  }
  return notes.slice(0, 3);
}

function findRecentReplayHold(
  controllerState: SncWorkerControllerState,
  contract: SncWorkerJobContract,
  now?: string,
): SncWorkerLaunchReplayHold | null {
  const nowMs = toReferenceTimestamp(now);
  const matchingRecords = controllerState.records
    .filter(
      (record) =>
        record.contract.jobId === contract.jobId &&
        (record.status === "complete" ||
          record.status === "failed" ||
          record.status === "aborted"),
    )
    .map((record) => ({
      record,
      ageMinutes: toAgeMinutes(nowMs, record),
    }))
    .filter((entry) => entry.ageMinutes <= LAUNCH_REPLAY_COOLDOWN_MINUTES)
    .sort((left, right) => left.ageMinutes - right.ageMinutes);

  const latest = matchingRecords[0];
  if (!latest) {
    return null;
  }

  const reason =
    latest.record.status === "complete"
      ? "Identical helper work completed recently. Reuse the existing fold-back before relaunching."
      : latest.record.status === "aborted"
        ? "Identical helper work ended early recently. Narrow or restate the brief before relaunching."
        : "Identical helper work failed recently. Tighten the brief or host conditions before relaunching.";

  return {
    record: latest.record,
    ageMinutes: latest.ageMinutes,
    reason,
  };
}

function buildSncWorkerLaunchCandidate(
  sessionState: SncSessionState,
): SncWorkerLaunchIntent | null {
  const sourcePlan = normalizeOptionalText(sessionState.chapterState.latestAssistantPlan);
  if (!sourcePlan || !hasHelperCue(sourcePlan)) {
    return null;
  }

  const kind = inferWorkerKind(
    [
      sourcePlan,
      sessionState.chapterState.focus ?? "",
      sessionState.chapterState.latestUserDirective ?? "",
    ].join(" "),
  );
  const contract = buildSncWorkerJobContract({
    jobId: buildJobId(sourcePlan, sessionState),
    title: buildTitle(kind, sessionState),
    kind,
    objective: sourcePlan,
    deliverables: buildDeliverables(kind),
    constraints: [...sessionState.chapterState.constraints].slice(0, 4),
    spawnMode: "run",
    completionMode: "one-shot",
    maxTurns: 1,
    allowFollowUp: false,
    ...(sessionState.chapterState.focus ? { focus: sessionState.chapterState.focus } : {}),
    controllerNotes: buildControllerNotes(sourcePlan, sessionState),
  });

  return {
    contract,
    sourcePlan,
  };
}

export function deriveSncWorkerLaunchIntent(
  sessionState: SncSessionState,
  controllerState?: SncWorkerControllerState,
  now?: string,
): SncWorkerLaunchIntent | null {
  const candidate = buildSncWorkerLaunchCandidate(sessionState);
  if (!candidate) {
    return null;
  }

  if (
    controllerState &&
    controllerState.records.some(
      (record) =>
        record.status === "queued" ||
        record.status === "spawned" ||
        record.status === "running" ||
        record.status === "blocked",
    )
  ) {
    return null;
  }

  if (controllerState && findRecentReplayHold(controllerState, candidate.contract, now)) {
    return null;
  }

  return candidate;
}

export async function applySncWorkerLaunchIntent(params: {
  stateDir?: string;
  sessionId: string;
  sessionKey?: string;
  sessionState: SncSessionState;
  existingState?: SncWorkerState | null;
  now?: string;
}): Promise<SncWorkerState | null> {
  if (!params.stateDir) {
    return params.existingState ?? null;
  }

  const existing =
    params.existingState ??
    (await loadSncWorkerState({
      stateDir: params.stateDir,
      sessionId: params.sessionId,
      sessionKey: params.sessionKey,
    }));

  const baseControllerState =
    existing?.controllerState ??
    createSncWorkerControllerState({
      controllerSessionKey: params.sessionKey,
    });

  const candidate = buildSncWorkerLaunchCandidate(params.sessionState);
  if (!candidate) {
    return existing ?? null;
  }

  if (
    baseControllerState.records.some(
      (record) =>
        record.status === "queued" ||
        record.status === "spawned" ||
        record.status === "running" ||
        record.status === "blocked",
    )
  ) {
    return existing ?? null;
  }

  const replayHold = findRecentReplayHold(baseControllerState, candidate.contract, params.now);
  if (replayHold) {
    return await persistSncWorkerState({
      stateDir: params.stateDir,
      sessionId: params.sessionId,
      sessionKey: params.sessionKey,
      controllerState: baseControllerState,
      recentFoldBacks: existing?.recentFoldBacks ?? [],
      consumedCompletionEventKeys: existing?.consumedCompletionEventKeys ?? [],
      updatedAt: params.now,
    });
  }

  const intent = candidate;

  const nextControllerState = queueSncWorkerExpectation(baseControllerState, {
    contract: intent.contract,
    controllerSessionKey: params.sessionKey ?? baseControllerState.controllerSessionKey,
    now: params.now,
  });

  return await persistSncWorkerState({
    stateDir: params.stateDir,
    sessionId: params.sessionId,
    sessionKey: params.sessionKey,
    controllerState: nextControllerState,
    recentFoldBacks: existing?.recentFoldBacks ?? [],
    consumedCompletionEventKeys: existing?.consumedCompletionEventKeys ?? [],
    updatedAt: params.now,
  });
}

function listQueuedRecords(controllerState: SncWorkerControllerState): SncWorkerTrackingRecord[] {
  return controllerState.records.filter((record) => record.status === "queued");
}

function listActiveRecords(controllerState: SncWorkerControllerState): SncWorkerTrackingRecord[] {
  return controllerState.records.filter(
    (record) => record.status === "spawned" || record.status === "running",
  );
}

export function buildSncWorkerLaunchSection(
  state: SncWorkerState,
  sessionState?: SncSessionState | null,
): string | undefined {
  const queuedRecords = listQueuedRecords(state.controllerState).slice(0, MAX_LAUNCHES_IN_SECTION);
  const activeRecords = listActiveRecords(state.controllerState).slice(0, MAX_LAUNCHES_IN_SECTION);
  const replayHold =
    queuedRecords.length === 0 && activeRecords.length === 0
      ? (() => {
          const candidate = sessionState ? buildSncWorkerLaunchCandidate(sessionState) : null;
          return candidate
            ? findRecentReplayHold(state.controllerState, candidate.contract, state.updatedAt)
            : null;
        })()
      : null;

  if (
    queuedRecords.length === 0 &&
    activeRecords.length === 0 &&
    !replayHold
  ) {
    return undefined;
  }

  const lines = [
    "Use this lane only for bounded one-shot helper work. Do not turn it into recursive worker churn.",
  ];

  if (queuedRecords.length > 0) {
    lines.push("", "Queued helper launches:");
    for (const record of queuedRecords) {
      const plan = buildSncWorkerLaunchPlan({
        contract: record.contract,
        workerId: record.workerId,
        controllerSessionKey:
          record.controllerSessionKey ?? state.controllerState.controllerSessionKey,
      });

      if (!plan.supported) {
        lines.push(`- ${record.workerId}: blocked / ${plan.reason}`);
        continue;
      }

      lines.push(`- ${record.workerId}: ready / ${record.contract.title}`);
      lines.push(`  tool: ${plan.toolName}`);
      lines.push(`  runtime: ${plan.args.runtime} / mode: ${plan.args.mode} / thread: ${String(plan.args.thread)}`);
      lines.push(`  label: ${plan.args.label}`);
      lines.push(`  task: ${clampUtf8(plan.args.task, MAX_SECTION_TASK_BYTES)}`);
    }
  }

  if (activeRecords.length > 0) {
    const yieldArgs = buildSncWorkerYieldToolArgs(state.controllerState);
    if (yieldArgs) {
      lines.push("", "If you are waiting on pushed worker results:");
      lines.push(`- use sessions_yield with message: ${yieldArgs.message}`);
    }

    lines.push("", "Active worker control:");
    for (const record of activeRecords) {
      lines.push(
        `- ${record.workerId}: ${record.status} / ${record.contract.title}${
          record.childSessionKey ? ` / child=${record.childSessionKey}` : ""
        }`,
      );

      const steerArgs = buildSncWorkerSubagentsToolArgs(record, {
        action: "steer",
        message: DEFAULT_STEER_MESSAGE,
      });
      if (steerArgs) {
        lines.push(`  steer target: ${steerArgs.target}`);
      }

      const killArgs = buildSncWorkerSubagentsToolArgs(record, {
        action: "kill",
      });
      if (killArgs) {
        lines.push(`  kill target: ${killArgs.target}`);
      }
    }
  }

  if (replayHold) {
    const summary = replayHold.record.result?.summary;
    lines.push("", "Recent launch replay holds:");
    lines.push(
      `- ${replayHold.record.workerId}: ${replayHold.record.status} ${describeAgeMinutes(replayHold.ageMinutes)} / ${replayHold.record.contract.title}`,
    );
    lines.push(`  reason: ${replayHold.reason}`);
    if (summary) {
      lines.push(`  last result: ${clampUtf8(summary, MAX_SECTION_TASK_BYTES)}`);
    }
  }

  return lines.join("\n");
}
