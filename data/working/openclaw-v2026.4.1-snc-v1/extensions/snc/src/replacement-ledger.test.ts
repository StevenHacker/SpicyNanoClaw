import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { describe, expect, it } from "vitest";
import {
  buildSncReplacementLedgerKey,
  createSncReplacementLedger,
  findSncReplacementDecision,
  parseSncReplacementLedger,
  recordSncReplacementDecision,
  serializeSncReplacementLedger,
} from "./replacement-ledger.js";

function message(role: AgentMessage["role"], content: unknown): AgentMessage {
  return { role, content } as AgentMessage;
}

describe("SNC replacement ledger utility", () => {
  it("falls back to session and message fingerprint keys when toolCallId is absent", () => {
    const firstKey = buildSncReplacementLedgerKey({
      channel: "before_message_write",
      sessionKey: "agent:main:story",
      agentId: "writer-1",
      message: message("assistant", "Next I will outline the opening scene."),
    });
    const secondKey = buildSncReplacementLedgerKey({
      channel: "before_message_write",
      sessionKey: "agent:main:story",
      agentId: "writer-1",
      message: message("assistant", "Next I will outline the opening scene."),
    });
    const otherSessionKey = buildSncReplacementLedgerKey({
      channel: "before_message_write",
      sessionKey: "agent:other:story",
      agentId: "writer-1",
      message: message("assistant", "Next I will outline the opening scene."),
    });

    expect(firstKey).toBe(secondKey);
    expect(firstKey).not.toBe(otherSessionKey);
    expect(firstKey.startsWith("message:assistant:")).toBe(true);
  });

  it("prefers toolCallId-based keys for tool_result persistence decisions", () => {
    const ledger = recordSncReplacementDecision(createSncReplacementLedger("2026-04-04T00:00:00.000Z"), {
      channel: "tool_result_persist",
      sessionKey: "agent:main:story",
      agentId: "writer-1",
      toolName: "web_search",
      toolCallId: "call-123",
      message: message("toolResult", "raw tool payload"),
      replacementMessage: message("toolResult", "condensed tool payload"),
      classification: "tool-result-condensed",
      action: "replace",
      now: "2026-04-04T00:00:01.000Z",
    });

    expect(ledger.entries).toHaveLength(1);
    expect(ledger.entries[0]?.key).toContain("tool:web_search:call-123");
    expect(
      findSncReplacementDecision(ledger, {
        channel: "tool_result_persist",
        sessionKey: "agent:main:story",
        agentId: "writer-1",
        toolName: "web_search",
        toolCallId: "call-123",
        message: message("toolResult", "raw tool payload"),
      }),
    ).toMatchObject({
      action: "replace",
      classification: "tool-result-condensed",
      replacementPreview: "condensed tool payload",
    });
  });

  it("treats changed original content as a miss even when the scope key matches", () => {
    const ledger = recordSncReplacementDecision(createSncReplacementLedger("2026-04-04T00:00:00.000Z"), {
      channel: "tool_result_persist",
      sessionKey: "agent:main:story",
      agentId: "writer-1",
      toolName: "web_search",
      toolCallId: "call-123",
      message: message("toolResult", "raw tool payload"),
      replacementMessage: message("toolResult", "condensed tool payload"),
      action: "replace",
      now: "2026-04-04T00:00:01.000Z",
    });

    expect(
      findSncReplacementDecision(ledger, {
        channel: "tool_result_persist",
        sessionKey: "agent:main:story",
        agentId: "writer-1",
        toolName: "web_search",
        toolCallId: "call-123",
        message: message("toolResult", "different payload"),
      }),
    ).toBeUndefined();
  });

  it("updates an existing decision in place and increments hit count", () => {
    const baseLedger = recordSncReplacementDecision(
      createSncReplacementLedger("2026-04-04T00:00:00.000Z"),
      {
        channel: "before_message_write",
        sessionKey: "agent:main:story",
        agentId: "writer-1",
        message: message("assistant", "Next I will outline the opening scene."),
        replacementMessage: message(
          "assistant",
          "Planning note preserved by SNC: Next I will outline the opening scene.",
        ),
        classification: "assistant-plan",
        action: "replace",
        now: "2026-04-04T00:00:01.000Z",
      },
    );

    const updatedLedger = recordSncReplacementDecision(baseLedger, {
      channel: "before_message_write",
      sessionKey: "agent:main:story",
      agentId: "writer-1",
      message: message("assistant", "Next I will outline the opening scene."),
      replacementMessage: message(
        "assistant",
        "Planning note preserved by SNC: Next I will outline the opening scene.",
      ),
      classification: "assistant-plan",
      action: "replace",
      now: "2026-04-04T00:00:02.000Z",
    });

    expect(updatedLedger.entries).toHaveLength(1);
    expect(updatedLedger.entries[0]).toMatchObject({
      hitCount: 2,
      createdAt: "2026-04-04T00:00:01.000Z",
      updatedAt: "2026-04-04T00:00:02.000Z",
    });
  });

  it("serializes, reconstructs, and trims the ledger window", () => {
    let ledger = createSncReplacementLedger("2026-04-04T00:00:00.000Z");
    ledger = recordSncReplacementDecision(ledger, {
      channel: "before_message_write",
      sessionKey: "agent:main:story",
      agentId: "writer-1",
      message: message("assistant", "Plan A"),
      action: "keep",
      now: "2026-04-04T00:00:01.000Z",
      maxEntries: 2,
    });
    ledger = recordSncReplacementDecision(ledger, {
      channel: "before_message_write",
      sessionKey: "agent:main:story",
      agentId: "writer-1",
      message: message("assistant", "Plan B"),
      action: "replace",
      replacementMessage: message("assistant", "Planning note preserved by SNC: Plan B"),
      now: "2026-04-04T00:00:02.000Z",
      maxEntries: 2,
    });
    ledger = recordSncReplacementDecision(ledger, {
      channel: "before_message_write",
      sessionKey: "agent:main:story",
      agentId: "writer-1",
      message: message("assistant", "Plan C"),
      action: "block",
      now: "2026-04-04T00:00:03.000Z",
      maxEntries: 2,
    });

    const serialized = serializeSncReplacementLedger(ledger);
    const reconstructed = parseSncReplacementLedger(serialized);

    expect(reconstructed.entries).toHaveLength(2);
    expect(reconstructed.entries.map((entry) => entry.originalPreview)).toEqual(["Plan B", "Plan C"]);
    expect(reconstructed.updatedAt).toBe("2026-04-04T00:00:03.000Z");
  });
});
