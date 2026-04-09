import { describe, expect, it } from "vitest";
import {
  buildSncWorkerJobContract,
  buildSncWorkerSpawnBrief,
  canScheduleSncWorker,
  createSncWorkerControllerState,
  foldSncWorkerResult,
  markSncWorkerRunning,
  markSncWorkerSpawned,
  queueSncWorkerExpectation,
  recordSncWorkerResult,
  renderSncWorkerSpawnBrief,
  summarizeSncWorkerControllerState,
} from "./worker-policy.js";

describe("SNC multi-worker policy utility", () => {
  it("builds a bounded spawn brief that spells out the controller contract", () => {
    const contract = buildSncWorkerJobContract({
      jobId: "wc-01",
      title: "Gather continuity evidence",
      kind: "research",
      objective: "Collect the strongest continuity facts for chapter four.",
      deliverables: [
        "List the top three continuity anchors.",
        "Highlight any conflicting evidence.",
      ],
      constraints: [
        "Stay within the requested chapter.",
        "Do not expand into broad scene drafting.",
      ],
      maxTurns: 2,
      controllerNotes: ["Prefer direct evidence over speculation."],
      focus: "chapter four continuity",
    });

    const brief = buildSncWorkerSpawnBrief(contract, {
      workerId: "worker-wc-01",
      controllerSessionKey: "agent:main:story",
    });

    expect(brief.workerId).toBe("worker-wc-01");
    expect(brief.prompt).toContain("Worker role: helper");
    expect(brief.prompt).toContain("Job kind: research");
    expect(brief.prompt).toContain("Objective: Collect the strongest continuity facts for chapter four.");
    expect(brief.prompt).toContain("Deliverables:");
    expect(brief.prompt).toContain("- List the top three continuity anchors.");
    expect(brief.prompt).toContain("Constraints:");
    expect(brief.prompt).toContain("- Stay within the requested chapter.");
    expect(brief.prompt).toContain("Maximum turns: 2");
    expect(brief.prompt).toContain("Result contract:");
    expect(renderSncWorkerSpawnBrief(brief)).toContain("Checklist:");
  });

  it("tracks active workers against the controller budget", () => {
    let state = createSncWorkerControllerState({
      controllerSessionKey: "agent:main:story",
      maxActiveWorkers: 1,
    });

    const contract = buildSncWorkerJobContract({
      jobId: "wc-02",
      title: "Check the timeline",
      role: "specialist",
      kind: "continuity-check",
      objective: "Verify the sequence of events around the reveal.",
      deliverables: ["Confirm the reveal timing."],
      constraints: ["Do not rewrite the scene."],
      spawnMode: "session",
      completionMode: "iterative",
      allowFollowUp: true,
    });

    state = queueSncWorkerExpectation(state, {
      contract,
      workerId: "worker-wc-02",
      now: "2026-04-04T01:00:00.000Z",
    });

    expect(state.queuedWorkerIds).toEqual(["worker-wc-02"]);
    expect(canScheduleSncWorker(state)).toBe(true);

    state = markSncWorkerSpawned(state, {
      workerId: "worker-wc-02",
      childSessionKey: "child:session-2",
      runId: "run-2",
      now: "2026-04-04T01:00:01.000Z",
    });

    expect(state.activeWorkerIds).toEqual(["worker-wc-02"]);
    expect(state.records[0]?.status).toBe("spawned");

    state = queueSncWorkerExpectation(state, {
      contract: buildSncWorkerJobContract({
        jobId: "wc-03",
        title: "Second helper",
        kind: "analysis",
        objective: "Try to schedule one more worker.",
      }),
      workerId: "worker-wc-03",
      now: "2026-04-04T01:00:02.000Z",
    });

    state = markSncWorkerSpawned(state, {
      workerId: "worker-wc-03",
      now: "2026-04-04T01:00:03.000Z",
    });

    expect(state.records.find((record) => record.workerId === "worker-wc-03")?.status).toBe("blocked");
    expect(summarizeSncWorkerControllerState(state)).toContain("active: 1");
  });

  it("folds child results back into a controller-ready summary", () => {
    const contract = buildSncWorkerJobContract({
      jobId: "wc-04",
      title: "Find the best evidence",
      kind: "analysis",
      objective: "Summarize the strongest evidence and suggest the next step.",
      deliverables: ["Summarize the strongest evidence.", "Recommend the next step."],
      constraints: ["Stay concise."],
    });

    let state = queueSncWorkerExpectation(createSncWorkerControllerState(), {
      contract,
      workerId: "worker-wc-04",
      now: "2026-04-04T01:10:00.000Z",
    });
    state = markSncWorkerSpawned(state, {
      workerId: "worker-wc-04",
      childSessionKey: "child:session-4",
      now: "2026-04-04T01:10:01.000Z",
    });
    state = markSncWorkerRunning(state, "worker-wc-04", "2026-04-04T01:10:02.000Z");
    state = recordSncWorkerResult(state, {
      workerId: "worker-wc-04",
      status: "complete",
      summary: "The chapter conflict hinges on a broken promise and a missing message.",
      findings: ["Broken promise is the key anchor.", "The missing message is the immediate hook."],
      recommendations: ["Open with the promise beat.", "Use the missing message as the transition."],
      evidence: ["Scene notes from chapter three.", "Controller brief constraints."],
      nextSteps: ["Draft the opening paragraph."],
      followUpMode: "spawn",
      completedAt: "2026-04-04T01:10:03.000Z",
      childSessionKey: "child:session-4",
    });

    const record = state.records.find((entry) => entry.workerId === "worker-wc-04");
    expect(record?.status).toBe("complete");
    expect(state.completedWorkerIds).toEqual(["worker-wc-04"]);

    const foldBack = foldSncWorkerResult(record?.result ?? {
      workerId: "worker-wc-04",
      status: "complete",
      summary: "The chapter conflict hinges on a broken promise and a missing message.",
      findings: ["Broken promise is the key anchor.", "The missing message is the immediate hook."],
      recommendations: ["Open with the promise beat.", "Use the missing message as the transition."],
      evidence: ["Scene notes from chapter three.", "Controller brief constraints."],
      nextSteps: ["Draft the opening paragraph."],
      followUpMode: "spawn",
    }, contract);

    expect(foldBack.summary).toContain("broken promise");
    expect(foldBack.controllerNotes).toContain("Findings: Broken promise is the key anchor. | The missing message is the immediate hook.");
    expect(foldBack.controllerActions).toContain("accept result");
    expect(foldBack.controllerActions).toContain("queue follow-up worker");
    expect(foldBack.nextBrief).toContain("Follow-up for Find the best evidence");
  });
});

