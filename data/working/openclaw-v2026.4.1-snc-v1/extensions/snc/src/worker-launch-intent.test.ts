import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applySncWorkerLaunchResult, prepareSncWorkerLaunch } from "./worker-execution.js";
import {
  applySncWorkerLaunchIntent,
  buildSncWorkerLaunchSection,
  deriveSncWorkerLaunchIntent,
} from "./worker-launch-intent.js";
import {
  buildSncWorkerJobContract,
  createSncWorkerControllerState,
  recordSncWorkerResult,
} from "./worker-policy.js";
import type { SncSessionState } from "./session-state.js";
import { loadSncWorkerState, persistSncWorkerState } from "./worker-state.js";

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "snc-worker-launch-test-"));
  tempDirs.push(dir);
  return dir;
}

function createSessionState(
  overrides: Partial<SncSessionState> = {},
): SncSessionState {
  return {
    version: 2,
    sessionId: "session-launch-1",
    sessionKey: "agent:main:story",
    updatedAt: "2026-04-04T10:00:00.000Z",
    turnCount: 3,
    recentMessages: [],
    storyLedger: {
      userDirectives: ["Please keep the chapter-seven reveal coherent and avoid flattening the mystery."],
      assistantPlans: [],
      continuityNotes: ["Keep the missing note and harbor debt threads aligned."],
      events: [],
    },
    chapterState: {
      focus: "chapter seven reveal timing",
      latestUserDirective:
        "Please keep the chapter-seven reveal coherent and avoid flattening the mystery.",
      latestAssistantPlan:
        "Next I will ask a helper to review the continuity anchors for chapter seven and report any conflicts.",
      constraints: ["Keep the mystery intact.", "Do not flatten the reveal."],
    },
    ...overrides,
  };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("SNC worker launch intent", () => {
  it("derives a bounded one-shot helper contract only from explicit helper cues", () => {
    const intent = deriveSncWorkerLaunchIntent(createSessionState());
    expect(intent).not.toBeNull();
    expect(intent?.contract.spawnMode).toBe("run");
    expect(intent?.contract.completionMode).toBe("one-shot");
    expect(intent?.contract.maxTurns).toBe(1);
    expect(intent?.contract.title).toContain("Continuity helper");
    expect(intent?.contract.deliverables).toEqual(
      expect.arrayContaining([
        "List the strongest continuity anchors.",
        "Flag any continuity conflicts or fragile links.",
      ]),
    );

    const none = deriveSncWorkerLaunchIntent(
      createSessionState({
        chapterState: {
          focus: "chapter seven reveal timing",
          latestUserDirective:
            "Please keep the chapter-seven reveal coherent and avoid flattening the mystery.",
          latestAssistantPlan:
            "Next I will tighten the reveal and preserve the missing-note callback.",
          constraints: ["Keep the mystery intact."],
        },
      }),
    );
    expect(none).toBeNull();
  });

  it("queues a single launch intent into persisted worker state and does not duplicate it", async () => {
    const root = createTempDir();
    const stateDir = path.join(root, ".snc-state");
    const sessionState = createSessionState();

    const first = await applySncWorkerLaunchIntent({
      stateDir,
      sessionId: sessionState.sessionId,
      sessionKey: sessionState.sessionKey,
      sessionState,
      now: "2026-04-04T10:00:00.000Z",
    });

    expect(first?.controllerState.queuedWorkerIds).toHaveLength(1);
    const firstRecord = first?.controllerState.records[0];
    expect(firstRecord?.status).toBe("queued");
    expect(firstRecord?.contract.title).toContain("Continuity helper");

    const second = await applySncWorkerLaunchIntent({
      stateDir,
      sessionId: sessionState.sessionId,
      sessionKey: sessionState.sessionKey,
      sessionState,
      now: "2026-04-04T10:01:00.000Z",
    });

    expect(second?.controllerState.records).toHaveLength(1);
    expect(second?.controllerState.queuedWorkerIds).toHaveLength(1);
  });

  it("holds identical helper relaunches for a cooldown window after a recent terminal result", async () => {
    const root = createTempDir();
    const stateDir = path.join(root, ".snc-state");
    const sessionState = createSessionState();

    const first = await applySncWorkerLaunchIntent({
      stateDir,
      sessionId: sessionState.sessionId,
      sessionKey: sessionState.sessionKey,
      sessionState,
      now: "2026-04-04T10:00:00.000Z",
    });
    expect(first?.controllerState.records).toHaveLength(1);

    const workerId = first?.controllerState.records[0]?.workerId;
    expect(workerId).toBeTruthy();

    const completedState = recordSncWorkerResult(
      first?.controllerState ?? createSncWorkerControllerState(),
      {
        workerId: workerId ?? "missing-worker",
        status: "complete",
        summary: "Continuity helper finished and found no new conflicts.",
        findings: ["No new continuity conflicts."],
        recommendations: ["Reuse the previous helper result unless the brief changes."],
        evidence: ["chapter seven reveal timing reviewed"],
        nextSteps: ["Continue with the main draft."],
        followUpMode: "none",
        completedAt: "2026-04-04T10:05:00.000Z",
        now: "2026-04-04T10:05:00.000Z",
      },
    );
    await persistSncWorkerState({
      stateDir,
      sessionId: sessionState.sessionId,
      sessionKey: sessionState.sessionKey,
      controllerState: completedState,
      recentFoldBacks: first?.recentFoldBacks ?? [],
      consumedCompletionEventKeys: first?.consumedCompletionEventKeys ?? [],
      updatedAt: "2026-04-04T10:05:00.000Z",
    });

    const second = await applySncWorkerLaunchIntent({
      stateDir,
      sessionId: sessionState.sessionId,
      sessionKey: sessionState.sessionKey,
      sessionState,
      now: "2026-04-04T10:20:00.000Z",
    });

    expect(second?.controllerState.records).toHaveLength(1);
    expect(second?.controllerState.queuedWorkerIds).toHaveLength(0);
    const section = second ? buildSncWorkerLaunchSection(second, sessionState) : undefined;
    expect(section).toContain("Recent launch replay holds:");
    expect(section).toContain("complete 15m ago");
    expect(section).toContain("Identical helper work completed recently.");
    expect(section).toContain("Continuity helper finished and found no new conflicts.");
  });

  it("allows identical helper relaunches again after the replay cooldown expires", async () => {
    const root = createTempDir();
    const stateDir = path.join(root, ".snc-state");
    const sessionState = createSessionState();

    const first = await applySncWorkerLaunchIntent({
      stateDir,
      sessionId: sessionState.sessionId,
      sessionKey: sessionState.sessionKey,
      sessionState,
      now: "2026-04-04T10:00:00.000Z",
    });
    const workerId = first?.controllerState.records[0]?.workerId;

    const completedState = recordSncWorkerResult(
      first?.controllerState ?? createSncWorkerControllerState(),
      {
        workerId: workerId ?? "missing-worker",
        status: "complete",
        summary: "Continuity helper finished once already.",
        findings: [],
        recommendations: [],
        evidence: [],
        nextSteps: [],
        followUpMode: "none",
        completedAt: "2026-04-04T10:05:00.000Z",
        now: "2026-04-04T10:05:00.000Z",
      },
    );
    await persistSncWorkerState({
      stateDir,
      sessionId: sessionState.sessionId,
      sessionKey: sessionState.sessionKey,
      controllerState: completedState,
      recentFoldBacks: first?.recentFoldBacks ?? [],
      consumedCompletionEventKeys: first?.consumedCompletionEventKeys ?? [],
      updatedAt: "2026-04-04T10:05:00.000Z",
    });

    const replayed = await applySncWorkerLaunchIntent({
      stateDir,
      sessionId: sessionState.sessionId,
      sessionKey: sessionState.sessionKey,
      sessionState,
      now: "2026-04-04T13:10:00.000Z",
    });

    expect(replayed?.controllerState.records).toHaveLength(1);
    expect(replayed?.controllerState.queuedWorkerIds).toHaveLength(1);
    expect(replayed?.controllerState.records[0]?.status).toBe("queued");
  });

  it("renders launch-ready and active-worker controller guidance from persisted worker state", async () => {
    const root = createTempDir();
    const stateDir = path.join(root, ".snc-state");
    const sessionState = createSessionState();

    const queued = await applySncWorkerLaunchIntent({
      stateDir,
      sessionId: sessionState.sessionId,
      sessionKey: sessionState.sessionKey,
      sessionState,
      now: "2026-04-04T10:00:00.000Z",
    });
    expect(queued).not.toBeNull();

    const contract = buildSncWorkerJobContract({
      jobId: "manual-active-worker",
      title: "Review helper: code path",
      kind: "review",
      objective: "Use a helper to review the code path for the latest regression.",
      spawnMode: "run",
      completionMode: "one-shot",
    });
    const prepared = prepareSncWorkerLaunch(
      queued?.controllerState ?? createSncWorkerControllerState(),
      {
        contract,
        workerId: "manual-active-worker",
        controllerSessionKey: sessionState.sessionKey,
        now: "2026-04-04T10:00:01.000Z",
      },
    );
    const spawned = applySncWorkerLaunchResult(prepared.state, {
      workerId: "manual-active-worker",
      result: {
        status: "accepted",
        childSessionKey: "agent:main:subagent:active-1",
        runId: "run-active-1",
      },
      now: "2026-04-04T10:00:02.000Z",
    });
    await persistSncWorkerState({
      stateDir,
      sessionId: sessionState.sessionId,
      sessionKey: sessionState.sessionKey,
      controllerState: spawned,
      recentFoldBacks: queued?.recentFoldBacks ?? [],
      consumedCompletionEventKeys: queued?.consumedCompletionEventKeys ?? [],
      updatedAt: "2026-04-04T10:00:02.000Z",
    });

    const state = await loadSncWorkerState({
      stateDir,
      sessionId: sessionState.sessionId,
      sessionKey: sessionState.sessionKey,
    });
    const section = state ? buildSncWorkerLaunchSection(state) : undefined;

    expect(section).toContain("Queued helper launches:");
    expect(section).toContain("tool: sessions_spawn");
    expect(section).toContain("runtime: subagent / mode: run / thread: false");
    expect(section).toContain("If you are waiting on pushed worker results:");
    expect(section).toContain("sessions_yield");
    expect(section).toContain("steer target: agent:main:subagent:active-1");
    expect(section).toContain("kill target: agent:main:subagent:active-1");
  });
});
