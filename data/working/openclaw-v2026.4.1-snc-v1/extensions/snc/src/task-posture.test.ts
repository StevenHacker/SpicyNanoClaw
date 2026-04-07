import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { describe, expect, it } from "vitest";
import type { SncSessionState } from "./session-state.js";
import {
  buildSncOutputDisciplineSection,
  buildSncTaskPostureSection,
  detectSncOutputDiscipline,
  detectSncTaskPosture,
  resolveSncEvidenceAwareProjectionPolicy,
} from "./task-posture.js";

function message(role: "user" | "assistant", content: unknown): AgentMessage {
  return { role, content } as AgentMessage;
}

function sessionState(params: {
  recentMessages?: Array<{ role: "user" | "assistant"; text: string }>;
  latestUserDirective?: string;
  latestAssistantPlan?: string;
} = {}): Pick<SncSessionState, "recentMessages" | "chapterState"> {
  return {
    recentMessages: params.recentMessages ?? [],
    chapterState: {
      focus: undefined,
      latestUserDirective: params.latestUserDirective,
      latestAssistantPlan: params.latestAssistantPlan,
      constraints: [],
    },
  };
}

describe("SNC task posture", () => {
  it("detects evidence-grounding for explicit read/list requests", () => {
    const posture = detectSncTaskPosture({
      messages: [
        message(
          "user",
          "Read brief.md and ledger.md, then list the top four priorities according to those files only.",
        ),
      ],
    });

    expect(posture.posture).toBe("evidence-grounding");
    expect(posture.score).toBeGreaterThanOrEqual(4);
    expect(posture.matchedSignals).toContain("evidence-action");
    expect(posture.matchedSignals).toContain("evidence-source");
  });

  it("keeps continuity posture for ordinary continuation requests", () => {
    const posture = detectSncTaskPosture({
      messages: [message("user", "Continue chapter two and keep the noir tone consistent.")],
    });

    expect(posture.posture).toBe("continuity");
  });

  it("prioritizes the current evidence request over saturated historical continuity cues", () => {
    const posture = detectSncTaskPosture({
      messages: [
        message(
          "user",
          "Read brief.md and ledger.md, then list the top two continuity risks according to those files only.",
        ),
        message("assistant", "I will inspect the materials before answering."),
      ],
      sessionState: sessionState({
        recentMessages: [
          { role: "user", text: "Keep the ring clue active." },
          { role: "assistant", text: "Understood." },
          { role: "user", text: "Keep the noir tone steady." },
          { role: "assistant", text: "Understood." },
          { role: "user", text: "Continue chapter four in first person." },
        ],
        latestUserDirective: "Continue chapter four in first person.",
      }),
    });

    expect(posture.posture).toBe("evidence-grounding");
    expect(posture.matchedSignals).toContain("evidence-action");
  });

  it("drops stale evidence posture when the current turn returns to continuity", () => {
    const posture = detectSncTaskPosture({
      messages: [
        message("user", "Continue chapter four and keep the noir tone steady."),
        message("assistant", "I will continue the draft while preserving continuity."),
      ],
      sessionState: sessionState({
        recentMessages: [
          {
            role: "user",
            text: "Read brief.md and packet.md, then list the top four priorities according to those files only.",
          },
          { role: "assistant", text: "I will inspect the files first." },
        ],
        latestUserDirective:
          "Read brief.md and packet.md, then list the top four priorities according to those files only.",
      }),
    });

    expect(posture.posture).toBe("continuity");
  });

  it("tightens durable-memory projection in evidence-grounding mode", () => {
    const posture = detectSncTaskPosture({
      messages: [
        message(
          "user",
          "根据 brief.md 和 packet.md 核对内容，然后列出最高优先级事项。",
        ),
      ],
    });

    expect(buildSncTaskPostureSection(posture)).toContain("Current turn reads as evidence-first.");
    expect(buildSncTaskPostureSection(posture)).toContain("what remains uncovered");
    expect(
      resolveSncEvidenceAwareProjectionPolicy(posture, {
        limit: 3,
        minimumScore: 3,
      }),
    ).toEqual({
      limit: 2,
      minimumScore: 4,
    });
  });

  it("lets a same-turn prose correction override an earlier evidence request", () => {
    const messages = [
      message("user", "Read brief.md and packet-c.md, then list the top two risks."),
      message("user", "Actually ignore that and continue chapter three directly in prose."),
    ];

    const taskPosture = detectSncTaskPosture({
      messages,
    });

    const outputDiscipline = detectSncOutputDiscipline({
      messages,
      framingMode: "writing",
      taskPosture,
    });

    expect(taskPosture.posture).toBe("continuity");
    expect(outputDiscipline.mode).toBe("writing-prose");
  });

  it("detects direct writing output posture for prose drafting turns", () => {
    const taskPosture = detectSncTaskPosture({
      messages: [message("user", "Continue chapter three and write the confrontation scene directly in prose.")],
    });

    const outputDiscipline = detectSncOutputDiscipline({
      messages: [message("user", "Continue chapter three and write the confrontation scene directly in prose.")],
      framingMode: "writing",
      taskPosture,
    });

    expect(outputDiscipline.mode).toBe("writing-prose");
    expect(buildSncOutputDisciplineSection(outputDiscipline)).toContain(
      "Current turn looks like direct drafting.",
    );
  });

  it("does not force prose output when the user explicitly asks for an outline", () => {
    const taskPosture = detectSncTaskPosture({
      messages: [message("user", "Outline chapter three as six beats before drafting.")],
    });

    const outputDiscipline = detectSncOutputDiscipline({
      messages: [message("user", "Outline chapter three as six beats before drafting.")],
      framingMode: "writing",
      taskPosture,
    });

    expect(outputDiscipline.mode).toBe("neutral");
  });

  it("prefers the current prose request over an older outline turn", () => {
    const priorState = sessionState({
      recentMessages: [
        { role: "user", text: "Outline chapter three as six beats before drafting." },
        { role: "assistant", text: "I will outline the beats first." },
      ],
      latestUserDirective: "Outline chapter three as six beats before drafting.",
    });

    const taskPosture = detectSncTaskPosture({
      messages: [message("user", "Continue chapter three and write the confrontation scene directly in prose.")],
      sessionState: priorState,
    });

    const outputDiscipline = detectSncOutputDiscipline({
      messages: [message("user", "Continue chapter three and write the confrontation scene directly in prose.")],
      sessionState: priorState,
      framingMode: "writing",
      taskPosture,
    });

    expect(outputDiscipline.mode).toBe("writing-prose");
  });

  it("lets a same-turn prose correction override an earlier outline request", () => {
    const messages = [
      message("user", "Outline chapter two as six beats and a short checklist."),
      message("user", "Actually just continue chapter two directly in prose."),
    ];

    const taskPosture = detectSncTaskPosture({
      messages,
    });

    const outputDiscipline = detectSncOutputDiscipline({
      messages,
      framingMode: "writing",
      taskPosture,
    });

    expect(taskPosture.posture).toBe("continuity");
    expect(outputDiscipline.mode).toBe("writing-prose");
  });
});
