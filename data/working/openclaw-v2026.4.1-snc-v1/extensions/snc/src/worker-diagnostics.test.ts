import { describe, expect, it } from "vitest";
import { buildSncWorkerDiagnosticsSection } from "./worker-diagnostics.js";
import {
  buildSncWorkerJobContract,
  createSncWorkerControllerState,
  markSncWorkerRunning,
  markSncWorkerSpawned,
  queueSncWorkerExpectation,
} from "./worker-policy.js";
import type { SncWorkerState } from "./worker-state.js";

function createState(): SncWorkerState {
  const queuedContract = buildSncWorkerJobContract({
    jobId: "diag-queued",
    title: "Continuity helper",
    kind: "continuity-check",
    objective: "Review the continuity anchors for chapter seven.",
    spawnMode: "run",
    completionMode: "one-shot",
  });
  const blockedContract = buildSncWorkerJobContract({
    jobId: "diag-blocked",
    title: "Review helper",
    kind: "review",
    objective: "Review the current patch and list the highest-value issues.",
    spawnMode: "session",
    completionMode: "iterative",
    allowFollowUp: true,
  });
  const activeContract = buildSncWorkerJobContract({
    jobId: "diag-running",
    title: "Research helper",
    kind: "research",
    objective: "Collect the strongest evidence for the current regression.",
    spawnMode: "run",
    completionMode: "one-shot",
  });

  let controllerState = createSncWorkerControllerState({
    controllerSessionKey: "agent:main:mixed",
    maxActiveWorkers: 1,
  });
  controllerState = queueSncWorkerExpectation(controllerState, {
    contract: queuedContract,
    workerId: "diag-queued",
    now: "2026-04-04T09:00:00.000Z",
  });
  controllerState = queueSncWorkerExpectation(controllerState, {
    contract: activeContract,
    workerId: "diag-running",
    now: "2026-04-04T09:01:00.000Z",
  });
  controllerState = markSncWorkerSpawned(controllerState, {
    workerId: "diag-running",
    childSessionKey: "agent:main:subagent:diag-running",
    now: "2026-04-04T09:01:10.000Z",
  });
  controllerState = markSncWorkerRunning(
    controllerState,
    "diag-running",
    "2026-04-04T09:01:30.000Z",
  );
  controllerState = queueSncWorkerExpectation(controllerState, {
    contract: blockedContract,
    workerId: "diag-blocked",
    now: "2026-04-04T09:02:00.000Z",
  });
  controllerState = markSncWorkerSpawned(controllerState, {
    workerId: "diag-blocked",
    now: "2026-04-04T09:02:10.000Z",
  });

  return {
    version: 2,
    sessionId: "session-diagnostics-1",
    sessionKey: "agent:main:mixed",
    agentScopeKey: "agent:main:mixed#session-diagnostics-1",
    agentKey: "agent:main:mixed",
    agentFamilyKey: "agent:main",
    agentRole: "primary",
    updatedAt: "2026-04-04T10:00:00.000Z",
    controllerState,
    recentFoldBacks: [],
    consumedCompletionEventKeys: [],
  };
}

describe("SNC worker diagnostics", () => {
  it("surfaces stale queued, blocked, and active workers as bounded diagnostics", () => {
    const section = buildSncWorkerDiagnosticsSection(
      createState(),
      "2026-04-04T10:00:00.000Z",
    );

    expect(section).toContain("controller-side diagnostics");
    expect(section).toContain("diag-queued: queued for 60m old");
    expect(section).toContain("sessions_spawn");
    expect(section).toContain("diag-blocked: blocked for 57m old");
    expect(section).toContain("clear the stale worker");
    expect(section).toContain("diag-running: running for 58m old");
    expect(section).toContain("sessions_yield");
  });

  it("returns nothing when no live worker needs operator attention", () => {
    const cleanState: SncWorkerState = {
      version: 2,
      sessionId: "session-diagnostics-2",
      agentScopeKey: "session-diagnostics-2",
      agentKey: "session-diagnostics-2",
      agentFamilyKey: "session-diagnostics-2",
      agentRole: "primary",
      updatedAt: "2026-04-04T10:00:00.000Z",
      controllerState: createSncWorkerControllerState(),
      recentFoldBacks: [],
      consumedCompletionEventKeys: [],
    };

    expect(buildSncWorkerDiagnosticsSection(cleanState)).toBeUndefined();
  });
});
