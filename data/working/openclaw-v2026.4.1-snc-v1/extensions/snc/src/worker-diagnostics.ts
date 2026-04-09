import type { SncWorkerState } from "./worker-state.js";
import type { SncWorkerTrackingRecord } from "./worker-policy.js";

const MAX_DIAGNOSTIC_LINES = 6;
const STALE_QUEUED_MINUTES = 30;
const STALE_BLOCKED_MINUTES = 20;
const STALE_ACTIVE_MINUTES = 45;

type SncWorkerDiagnostic = {
  severity: "warn" | "note";
  line: string;
};

function parseTime(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function ageMinutes(record: SncWorkerTrackingRecord, nowMs: number): number | null {
  const updatedAtMs = parseTime(record.updatedAt);
  if (updatedAtMs === null) {
    return null;
  }
  return Math.max(0, Math.floor((nowMs - updatedAtMs) / 60_000));
}

function formatAge(age: number | null): string {
  return age === null ? "unknown age" : `${age}m old`;
}

function buildDiagnosticForRecord(
  record: SncWorkerTrackingRecord,
  nowMs: number,
): SncWorkerDiagnostic | null {
  const age = ageMinutes(record, nowMs);
  const ageLabel = formatAge(age);

  if (record.status === "queued" && age !== null && age >= STALE_QUEUED_MINUTES) {
    return {
      severity: "warn",
      line: `${record.workerId}: queued for ${ageLabel}; either launch it now with sessions_spawn or tighten/remove the helper plan.`,
    };
  }

  if (record.status === "blocked" && age !== null && age >= STALE_BLOCKED_MINUTES) {
    return {
      severity: "warn",
      line: `${record.workerId}: blocked for ${ageLabel}; inspect the contract or clear the stale worker before queueing another helper.`,
    };
  }

  if (
    (record.status === "spawned" || record.status === "running") &&
    age !== null &&
    age >= STALE_ACTIVE_MINUTES
  ) {
    return {
      severity: "warn",
      line: `${record.workerId}: ${record.status} for ${ageLabel}; use sessions_yield first, then decide whether steer/kill is safer than waiting longer.`,
    };
  }

  if (record.status === "blocked") {
    return {
      severity: "note",
      line: `${record.workerId}: blocked; do not queue more helpers until the current worker budget clears or the brief is narrowed.`,
    };
  }

  return null;
}

export function buildSncWorkerDiagnosticsSection(
  state: SncWorkerState,
  now = new Date().toISOString(),
): string | undefined {
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) {
    return undefined;
  }

  const diagnostics = state.controllerState.records
    .filter(
      (record) =>
        record.status === "queued" ||
        record.status === "blocked" ||
        record.status === "spawned" ||
        record.status === "running",
    )
    .map((record) => buildDiagnosticForRecord(record, nowMs))
    .filter((entry): entry is SncWorkerDiagnostic => Boolean(entry))
    .sort((left, right) => {
      if (left.severity === right.severity) {
        return 0;
      }
      return left.severity === "warn" ? -1 : 1;
    })
    .slice(0, MAX_DIAGNOSTIC_LINES);

  if (diagnostics.length === 0) {
    return undefined;
  }

  return [
    "Treat these as controller-side diagnostics, not as permission to broaden delegation scope.",
    ...diagnostics.map((entry) => `- [${entry.severity}] ${entry.line}`),
  ].join("\n");
}
