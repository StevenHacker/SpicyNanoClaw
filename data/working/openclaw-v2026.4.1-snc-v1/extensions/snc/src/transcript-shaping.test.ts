import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { describe, expect, it } from "vitest";
import {
  SNC_META_NOTE_PREFIX,
  SNC_PLAN_NOTE_PREFIX,
  analyzeSncTranscriptMessage,
  shapeSncTranscriptMessage,
} from "./transcript-shaping.js";

function message(role: AgentMessage["role"], content: unknown): AgentMessage {
  return { role, content } as AgentMessage;
}

describe("SNC transcript shaping utility", () => {
  it("classifies and rewrites assistant planning chatter into a bounded plan note", () => {
    const result = shapeSncTranscriptMessage(
      message("assistant", [
        {
          type: "text",
          text: "Next I will outline the opening scene and draft the confrontation beat.",
        },
        {
          type: "text",
          text: "Scratch note: consider three alternate phrasings for the argument.",
        },
        {
          type: "text",
          text: "Maintain continuity with the missing-ring clue and chapter-three payoff.",
        },
      ]),
      {
        maxSegments: 2,
        maxSummaryBytes: 220,
      },
    );

    expect(result.classification).toBe("assistant-plan");
    expect(result.shouldRewrite).toBe(true);
    expect(result.rewriteKind).toBe("plan-note");
    expect(result.summary).toContain(SNC_PLAN_NOTE_PREFIX);
    expect(result.summary).toContain("outline the opening scene");
    expect(result.summary).toContain("Maintain continuity with the missing-ring clue");
    expect(result.summary).not.toContain("alternate phrasings");
    expect(Buffer.byteLength(result.summary ?? "", "utf8")).toBeLessThanOrEqual(220);
    expect(
      Array.isArray((result.replacementMessage as { content?: unknown } | undefined)?.content),
    ).toBe(true);
  });

  it("classifies assistant process chatter as a meta note", () => {
    const result = shapeSncTranscriptMessage(
      message(
        "assistant",
        "Internal note: I am considering two ways to compress the recap. Maintain continuity with the harbor debt thread.",
      ),
      {
        maxSegments: 2,
      },
    );

    expect(result.classification).toBe("assistant-meta");
    expect(result.shouldRewrite).toBe(true);
    expect(result.summary).toContain(SNC_META_NOTE_PREFIX);
    expect(result.summary).toContain("considering two ways to compress the recap");
    expect(result.summary).toContain("harbor debt thread");
    expect(
      typeof (result.replacementMessage as { content?: unknown } | undefined)?.content,
    ).toBe("string");
  });

  it("classifies and rewrites Chinese planning chatter into a bounded plan note", () => {
    const result = shapeSncTranscriptMessage(
      message(
        "assistant",
        "下一步我会先重写开场段落，再保持伏笔和线索的连贯。内部备注：还要比较两个收束方案。",
      ),
      {
        maxSegments: 2,
        maxSummaryBytes: 220,
      },
    );

    expect(result.classification).toBe("assistant-plan");
    expect(result.shouldRewrite).toBe(true);
    expect(result.summary).toContain(SNC_PLAN_NOTE_PREFIX);
    expect(result.summary).toContain("下一步我会先重写开场段落");
    expect(result.summary).toContain("保持伏笔和线索的连贯");
    expect(result.summary).not.toContain("比较两个收束方案");
  });

  it("classifies Chinese process chatter as a meta note", () => {
    const result = shapeSncTranscriptMessage(
      message(
        "assistant",
        "内部备注：我在比较两个方案，看看哪种收束更稳。需要保持前文线索的呼应。",
      ),
      {
        maxSegments: 2,
      },
    );

    expect(result.classification).toBe("assistant-meta");
    expect(result.shouldRewrite).toBe(true);
    expect(result.summary).toContain(SNC_META_NOTE_PREFIX);
    expect(result.summary).toContain("内部备注：我在比较两个方案");
    expect(result.summary).toContain("保持前文线索的呼应");
  });

  it("protects likely story prose from shaping", () => {
    const analysis = analyzeSncTranscriptMessage(
      message(
        "assistant",
        '"I will return before the rain stops," Mira said, stepping into the station light.',
      ),
    );
    const shaped = shapeSncTranscriptMessage(
      message(
        "assistant",
        '"I will return before the rain stops," Mira said, stepping into the station light.',
      ),
    );

    expect(analysis.classification).toBe("assistant-story");
    expect(shaped.shouldRewrite).toBe(false);
    expect(shaped.summary).toBeUndefined();
  });

  it("leaves already-shaped SNC notes alone", () => {
    const shaped = shapeSncTranscriptMessage(
      message(
        "assistant",
        `${SNC_PLAN_NOTE_PREFIX} Next I will outline the opening scene; maintain continuity with the ring clue.`,
      ),
    );

    expect(shaped.classification).toBe("already-shaped");
    expect(shaped.shouldRewrite).toBe(false);
  });

  it("ignores non-assistant messages", () => {
    const shaped = shapeSncTranscriptMessage(
      message("user", "Please keep the noir tone and continue chapter three."),
    );

    expect(shaped.classification).toBe("non-assistant");
    expect(shaped.shouldRewrite).toBe(false);
  });
});
