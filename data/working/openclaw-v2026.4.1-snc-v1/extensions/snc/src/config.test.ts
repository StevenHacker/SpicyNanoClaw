import { describe, expect, it } from "vitest";
import { resolveSncPluginConfig } from "./config.js";

describe("SNC config", () => {
  it("keeps hook shaping disabled by default while resolving bounded defaults", () => {
    const config = resolveSncPluginConfig(undefined, (input) => input);

    expect(config.hooks).toEqual({
      enabled: false,
      targets: [],
      maxRewritesPerSession: 6,
      maxReplacementBytes: 768,
      maxToolResultBytes: 2048,
    });
  });

  it("enables the shaped hook set only when requested", () => {
    const config = resolveSncPluginConfig(
      {
        hooks: {
          enabled: true,
          targets: [
            "session_end",
            "before_message_write",
            "session_end",
            "tool_result_persist",
          ],
          maxRewritesPerSession: 9.9,
          maxReplacementBytes: 900.2,
          maxToolResultBytes: 4096.8,
        },
      },
      (input) => `/abs/${input}`,
    );

    expect(config.hooks).toEqual({
      enabled: true,
      targets: ["session_end", "before_message_write", "tool_result_persist"],
      maxRewritesPerSession: 9,
      maxReplacementBytes: 900,
      maxToolResultBytes: 4096,
    });
  });

  it("respects an explicit empty hook target list", () => {
    const config = resolveSncPluginConfig(
      {
        hooks: {
          enabled: true,
          targets: [],
        },
      },
      (input) => `/abs/${input}`,
    );

    expect(config.hooks).toEqual({
      enabled: true,
      targets: [],
      maxRewritesPerSession: 6,
      maxReplacementBytes: 768,
      maxToolResultBytes: 2048,
    });
  });

  it("clamps invalid hook shaping bounds to safe minimums", () => {
    const config = resolveSncPluginConfig(
      {
        hooks: {
          enabled: true,
          maxRewritesPerSession: 0,
          maxReplacementBytes: 32,
          maxToolResultBytes: 100,
        },
      },
      (input) => input,
    );

    expect(config.hooks).toEqual({
      enabled: true,
      targets: [
        "before_message_write",
        "tool_result_persist",
        "session_end",
        "subagent_spawned",
        "subagent_ended",
      ],
      maxRewritesPerSession: 1,
      maxReplacementBytes: 160,
      maxToolResultBytes: 256,
    });
  });
});
