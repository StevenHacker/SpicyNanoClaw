import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SncHookTarget, SncResolvedConfig } from "./config.js";
import { installSncHookScaffold } from "./hook-scaffold.js";
import { applySncWorkerLaunchResult, prepareSncWorkerLaunch } from "./worker-execution.js";
import {
  buildSncWorkerJobContract,
  createSncWorkerControllerState,
} from "./worker-policy.js";
import { loadSncWorkerState, persistSncWorkerState } from "./worker-state.js";

const tempDirs: string[] = [];

type RegisteredHook = {
  hookName: SncHookTarget;
  handler: (...args: unknown[]) => unknown;
  options: {
    name: string;
    description: string;
  };
};

function createConfig(overrides: Partial<SncResolvedConfig> = {}): SncResolvedConfig {
  const hooks = {
    enabled: false,
    targets: [] as SncHookTarget[],
    maxRewritesPerSession: 6,
    maxReplacementBytes: 768,
    maxToolResultBytes: 2048,
    ...(overrides.hooks ?? {}),
  };

  return {
    briefFile: undefined,
    ledgerFile: undefined,
    packetFiles: [],
    packetDir: undefined,
    stateDir: undefined,
    maxSectionBytes: 24_576,
    ...overrides,
    hooks,
  };
}

function createTempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "snc-hook-scaffold-test-"));
  tempDirs.push(dir);
  return dir;
}

function createRegisterHookRecorder() {
  const registered: RegisteredHook[] = [];
  const registerHook = vi.fn((events: string | string[], handler: unknown, options: unknown) => {
    const hookNames = Array.isArray(events) ? events : [events];
    for (const hookName of hookNames) {
      registered.push({
        hookName: hookName as SncHookTarget,
        handler: handler as (...args: unknown[]) => unknown,
        options: options as RegisteredHook["options"],
      });
    }
  });

  return { registerHook, registered };
}

function getRegisteredHook(registered: RegisteredHook[], hookName: SncHookTarget) {
  const hook = registered.find((entry) => entry.hookName === hookName);
  expect(hook).toBeDefined();
  return hook as RegisteredHook;
}

function createAssistantMessage(text: string, timestamp = 1): AgentMessage {
  return {
    role: "assistant",
    content: [{ type: "text", text }],
    timestamp,
  } as AgentMessage;
}

function createToolResultMessage(text: string, extra: Record<string, unknown> = {}): AgentMessage {
  return {
    role: "toolResult",
    toolCallId: "call_1",
    toolName: "read_file",
    content: [{ type: "text", text }],
    isError: false,
    timestamp: 1,
    ...extra,
  } as AgentMessage;
}

function extractText(message: AgentMessage | undefined): string | undefined {
  if (!message) {
    return undefined;
  }

  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return undefined;
  }

  const firstText = content.find(
    (part) =>
      Boolean(part) &&
      typeof part === "object" &&
      (part as { type?: unknown }).type === "text" &&
      typeof (part as { text?: unknown }).text === "string",
  ) as { text?: string } | undefined;

  return firstText?.text;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("SNC hook scaffold", () => {
  it("does not register hooks when disabled", () => {
    const { registerHook } = createRegisterHookRecorder();

    installSncHookScaffold(
      { registerHook },
      createConfig({
        hooks: {
          enabled: false,
          targets: ["before_message_write", "session_end"],
          maxRewritesPerSession: 6,
          maxReplacementBytes: 768,
          maxToolResultBytes: 2048,
        },
      }),
    );

    expect(registerHook).not.toHaveBeenCalled();
  });

  it("registers the selected SNC shaping hooks when enabled", () => {
    const { registerHook, registered } = createRegisterHookRecorder();

    installSncHookScaffold(
      { registerHook },
      createConfig({
        hooks: {
          enabled: true,
          targets: [
            "before_message_write",
            "tool_result_persist",
            "session_end",
            "subagent_spawned",
            "subagent_ended",
          ],
          maxRewritesPerSession: 6,
          maxReplacementBytes: 768,
          maxToolResultBytes: 2048,
        },
      }),
    );

    expect(registerHook).toHaveBeenCalledTimes(5);
    expect(getRegisteredHook(registered, "before_message_write").options.description).toContain(
      "bounded continuity notes",
    );
    expect(getRegisteredHook(registered, "tool_result_persist").options.description).toContain(
      "bounded tool-result previews",
    );
    expect(getRegisteredHook(registered, "session_end").options.description).toContain(
      "per-session shaping state",
    );
    expect(getRegisteredHook(registered, "subagent_spawned").options.description).toContain(
      "worker spawn bookkeeping",
    );
    expect(getRegisteredHook(registered, "subagent_ended").options.description).toContain(
      "worker lifecycle fallback",
    );
  });

  it("rewrites assistant planning chatter into a bounded SNC note", () => {
    const { registerHook, registered } = createRegisterHookRecorder();
    installSncHookScaffold(
      { registerHook },
      createConfig({
        hooks: {
          enabled: true,
          targets: ["before_message_write"],
          maxRewritesPerSession: 6,
          maxReplacementBytes: 120,
          maxToolResultBytes: 2048,
        },
      }),
    );

    const hook = getRegisteredHook(registered, "before_message_write");
    const result = hook.handler(
      {
        message: createAssistantMessage(
          "Plan: first preserve the callback between chapter two and chapter four. Next I will rewrite the bridge paragraph so the continuity thread stays explicit for later scenes.",
          100,
        ),
        sessionKey: "session-alpha",
        agentId: "agent-alpha",
      },
      {
        sessionKey: "session-alpha",
        agentId: "agent-alpha",
      },
    ) as { message?: AgentMessage } | undefined;

    expect(extractText(result?.message)).toContain("SNC planning note:");
    expect(extractText(result?.message)).toContain("preserve the callback");
    expect(extractText(result?.message)).not.toContain("later scenes");
  });

  it("rewrites Chinese assistant planning chatter through the shared transcript-shaping path", () => {
    const { registerHook, registered } = createRegisterHookRecorder();
    installSncHookScaffold(
      { registerHook },
      createConfig({
        hooks: {
          enabled: true,
          targets: ["before_message_write"],
          maxRewritesPerSession: 6,
          maxReplacementBytes: 160,
          maxToolResultBytes: 2048,
        },
      }),
    );

    const hook = getRegisteredHook(registered, "before_message_write");
    const result = hook.handler(
      {
        message: createAssistantMessage(
          "下一步我会先重写开场段落，再保持伏笔和线索的连贯。内部备注：还要比较两个收束方案。",
          110,
        ),
        sessionKey: "session-zh",
        agentId: "agent-zh",
      },
      {
        sessionKey: "session-zh",
        agentId: "agent-zh",
      },
    ) as { message?: AgentMessage } | undefined;

    expect(extractText(result?.message)).toContain("SNC planning note:");
    expect(extractText(result?.message)).toContain("下一步我会先重写开场段落");
    expect(extractText(result?.message)).toContain("保持伏笔和线索的连贯");
    expect(extractText(result?.message)).not.toContain("比较两个收束方案");
  });

  it("leaves story prose untouched even when hooks are enabled", () => {
    const { registerHook, registered } = createRegisterHookRecorder();
    installSncHookScaffold(
      { registerHook },
      createConfig({
        hooks: {
          enabled: true,
          targets: ["before_message_write"],
          maxRewritesPerSession: 6,
          maxReplacementBytes: 120,
          maxToolResultBytes: 2048,
        },
      }),
    );

    const hook = getRegisteredHook(registered, "before_message_write");
    const result = hook.handler(
      {
        message: createAssistantMessage(
          "\"I know,\" Mara said, looking at the broken bridge as the rain kept falling.",
          200,
        ),
        sessionKey: "session-alpha",
      },
      {
        sessionKey: "session-alpha",
      },
    );

    expect(result).toBeUndefined();
  });

  it("stops rewriting assistant planning notes after the session budget is exhausted", () => {
    const { registerHook, registered } = createRegisterHookRecorder();
    installSncHookScaffold(
      { registerHook },
      createConfig({
        hooks: {
          enabled: true,
          targets: ["before_message_write"],
          maxRewritesPerSession: 1,
          maxReplacementBytes: 120,
          maxToolResultBytes: 2048,
        },
      }),
    );

    const hook = getRegisteredHook(registered, "before_message_write");
    const first = hook.handler(
      {
        message: createAssistantMessage(
          "Plan: tighten the scene handoff so the promise from chapter one stays explicit. Next I will rewrite the ending beat and keep the callback visible.",
          300,
        ),
        sessionKey: "session-budget",
      },
      {
        sessionKey: "session-budget",
      },
    ) as { message?: AgentMessage } | undefined;
    const second = hook.handler(
      {
        message: createAssistantMessage(
          "Plan: keep track of the promise in chapter one and the lantern image from the midpoint. Next I will make the callback explicit in the exit paragraph.",
          301,
        ),
        sessionKey: "session-budget",
      },
      {
        sessionKey: "session-budget",
      },
    );

    expect(extractText(first?.message)).toContain("SNC planning note:");
    expect(second).toBeUndefined();
  });

  it("shapes oversized tool results and freezes the first decision for a tool call", () => {
    const { registerHook, registered } = createRegisterHookRecorder();
    installSncHookScaffold(
      { registerHook },
      createConfig({
        hooks: {
          enabled: true,
          targets: ["tool_result_persist"],
          maxRewritesPerSession: 6,
          maxReplacementBytes: 220,
          maxToolResultBytes: 80,
        },
      }),
    );

    const hook = getRegisteredHook(registered, "tool_result_persist");
    const first = hook.handler(
      {
        message: createToolResultMessage("alpha ".repeat(40), {
          details: {
            raw: "beta ".repeat(60),
          },
        }),
        toolCallId: "call_42",
        toolName: "read_file",
      },
      {
        sessionKey: "session-ledger",
        toolCallId: "call_42",
        toolName: "read_file",
      },
    ) as { message?: AgentMessage } | undefined;

    const second = hook.handler(
      {
        message: createToolResultMessage("gamma ".repeat(60), {
          toolCallId: "call_42",
        }),
        toolCallId: "call_42",
        toolName: "read_file",
      },
      {
        sessionKey: "session-ledger",
        toolCallId: "call_42",
        toolName: "read_file",
      },
    ) as { message?: AgentMessage } | undefined;

    expect(extractText(first?.message)).toContain("SNC stored tool result preview:");
    expect(extractText(second?.message)).toEqual(extractText(first?.message));
    expect("details" in ((first?.message ?? {}) as Record<string, unknown>)).toBe(false);
  });

  it("clears per-session shaping state on session_end", () => {
    const { registerHook, registered } = createRegisterHookRecorder();
    installSncHookScaffold(
      { registerHook },
      createConfig({
        hooks: {
          enabled: true,
          targets: ["before_message_write", "session_end"],
          maxRewritesPerSession: 1,
          maxReplacementBytes: 120,
          maxToolResultBytes: 2048,
        },
      }),
    );

    const beforeWrite = getRegisteredHook(registered, "before_message_write");
    const sessionEnd = getRegisteredHook(registered, "session_end");

    const first = beforeWrite.handler(
      {
        message: createAssistantMessage(
          "Plan: restore the clue trail between the checkpoint and the rooftop reveal. Next I will rewrite the checkpoint paragraph so the continuity thread stays visible.",
          400,
        ),
        sessionKey: "session-reset",
      },
      {
        sessionKey: "session-reset",
      },
    ) as { message?: AgentMessage } | undefined;

    const blocked = beforeWrite.handler(
      {
        message: createAssistantMessage(
          "Plan: keep the lantern motif visible from the midpoint through the reveal. Next I will sharpen the callback in the closing beat.",
          401,
        ),
        sessionKey: "session-reset",
      },
      {
        sessionKey: "session-reset",
      },
    );

    sessionEnd.handler(
      {
        sessionId: "session-reset",
        sessionKey: "session-reset",
        messageCount: 12,
      },
      {
        sessionId: "session-reset",
        sessionKey: "session-reset",
      },
    );

    const afterReset = beforeWrite.handler(
      {
        message: createAssistantMessage(
          "Plan: bring back the signal phrase from the opening scene and echo it in the final reveal. Next I will rewrite the reveal beat so the callback lands cleanly for the reader.",
          402,
        ),
        sessionKey: "session-reset",
      },
      {
        sessionKey: "session-reset",
      },
    ) as { message?: AgentMessage } | undefined;

    expect(extractText(first?.message)).toContain("SNC planning note:");
    expect(blocked).toBeUndefined();
    expect(extractText(afterReset?.message)).toContain("SNC planning note:");
  });

  it("syncs subagent_spawned into persisted SNC worker state", async () => {
    const root = createTempDir();
    const stateDir = path.join(root, ".snc-state");
    const contract = buildSncWorkerJobContract({
      jobId: "hook-worker-01",
      title: "Check continuity anchors",
      kind: "continuity-check",
      objective: "Verify continuity anchors for the chapter.",
    });
    const prepared = prepareSncWorkerLaunch(
      createSncWorkerControllerState({
        controllerSessionKey: "agent:main:story",
      }),
      {
        contract,
        workerId: "hook-worker-01",
        controllerSessionKey: "agent:main:story",
        now: "2026-04-04T10:00:00.000Z",
      },
    );
    const spawned = applySncWorkerLaunchResult(prepared.state, {
      workerId: "hook-worker-01",
      result: {
        status: "accepted",
        childSessionKey: "agent:main:subagent:child-hook-1",
        runId: "run-hook-worker-01",
      },
      now: "2026-04-04T10:00:01.000Z",
    });
    await persistSncWorkerState({
      stateDir,
      sessionId: "session-hook-worker-1",
      sessionKey: "agent:main:story",
      controllerState: spawned,
      updatedAt: "2026-04-04T10:00:01.000Z",
    });

    const { registerHook, registered } = createRegisterHookRecorder();
    installSncHookScaffold(
      { registerHook },
      createConfig({
        stateDir,
        hooks: {
          enabled: true,
          targets: ["subagent_spawned"],
          maxRewritesPerSession: 6,
          maxReplacementBytes: 768,
          maxToolResultBytes: 2048,
        },
      }),
    );

    const hook = getRegisteredHook(registered, "subagent_spawned");
    await hook.handler(
      {
        runId: "run-hook-worker-01",
        childSessionKey: "agent:main:subagent:child-hook-1",
      },
      {
        runId: "run-hook-worker-01",
        requesterSessionKey: "agent:main:story",
        childSessionKey: "agent:main:subagent:child-hook-1",
      },
    );

    const state = await loadSncWorkerState({
      stateDir,
      sessionId: "session-hook-worker-1",
      sessionKey: "agent:main:story",
    });
    const record = state?.controllerState.records.find((entry) => entry.workerId === "hook-worker-01");

    expect(record?.status).toBe("running");
    expect(record?.childSessionKey).toBe("agent:main:subagent:child-hook-1");
    expect(record?.runId).toBe("run-hook-worker-01");
  });

  it("records a bounded lifecycle fallback when subagent_ended arrives before a rich completion fold-back", async () => {
    const root = createTempDir();
    const stateDir = path.join(root, ".snc-state");
    const contract = buildSncWorkerJobContract({
      jobId: "hook-worker-02",
      title: "Review chapter pressure",
      kind: "analysis",
      objective: "Inspect where the chapter loses pressure.",
    });
    const prepared = prepareSncWorkerLaunch(
      createSncWorkerControllerState({
        controllerSessionKey: "agent:main:story",
      }),
      {
        contract,
        workerId: "hook-worker-02",
        controllerSessionKey: "agent:main:story",
        now: "2026-04-04T10:05:00.000Z",
      },
    );
    const spawned = applySncWorkerLaunchResult(prepared.state, {
      workerId: "hook-worker-02",
      result: {
        status: "accepted",
        childSessionKey: "agent:main:subagent:child-hook-2",
        runId: "run-hook-worker-02",
      },
      now: "2026-04-04T10:05:01.000Z",
    });
    await persistSncWorkerState({
      stateDir,
      sessionId: "session-hook-worker-2",
      sessionKey: "agent:main:story",
      controllerState: spawned,
      updatedAt: "2026-04-04T10:05:01.000Z",
    });

    const { registerHook, registered } = createRegisterHookRecorder();
    installSncHookScaffold(
      { registerHook },
      createConfig({
        stateDir,
        hooks: {
          enabled: true,
          targets: ["subagent_ended"],
          maxRewritesPerSession: 6,
          maxReplacementBytes: 768,
          maxToolResultBytes: 2048,
        },
      }),
    );

    const hook = getRegisteredHook(registered, "subagent_ended");
    await hook.handler(
      {
        targetSessionKey: "agent:main:subagent:child-hook-2",
        reason: "subagent-error",
        outcome: "timeout",
        error: "Worker hit the run timeout before returning a final answer.",
        runId: "run-hook-worker-02",
        endedAt: Date.parse("2026-04-04T10:06:00.000Z"),
      },
      {
        runId: "run-hook-worker-02",
        requesterSessionKey: "agent:main:story",
        childSessionKey: "agent:main:subagent:child-hook-2",
      },
    );

    const state = await loadSncWorkerState({
      stateDir,
      sessionId: "session-hook-worker-2",
      sessionKey: "agent:main:story",
    });
    const record = state?.controllerState.records.find((entry) => entry.workerId === "hook-worker-02");

    expect(record?.status).toBe("failed");
    expect(record?.result?.summary).toContain("failed before normal completion");
    expect(state?.recentFoldBacks[0]?.summary).toContain("Review chapter pressure");
    expect(state?.recentFoldBacks[0]?.controllerActions).toContain("mark work as failed");
  });
});
