import { describe, expect, it } from "vitest";
import { resolveSncPluginConfig } from "./config.js";

describe("SNC config", () => {
  it("keeps hook shaping disabled by default while resolving bounded defaults", () => {
    const config = resolveSncPluginConfig(undefined, (input) => input);

    expect(config.specializationMode).toBe("auto");
    expect(config.durableMemory).toEqual({
      maxCatalogEntries: 64,
      staleEntryDays: 30,
      projectionLimit: 3,
      projectionMinimumScore: 3,
    });
    expect(config.style).toEqual({
      enabled: false,
      mode: "off",
      intensity: 0.72,
      strictness: 0.82,
      maxExamples: 1,
    });
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

  it("accepts bounded specialization modes and falls back to auto", () => {
    const general = resolveSncPluginConfig(
      {
        specializationMode: "general",
      },
      (input) => input,
    );
    const writing = resolveSncPluginConfig(
      {
        specializationMode: "writing",
      },
      (input) => input,
    );
    const fallback = resolveSncPluginConfig(
      {
        specializationMode: "else",
      } as never,
      (input) => input,
    );

    expect(general.specializationMode).toBe("general");
    expect(writing.specializationMode).toBe("writing");
    expect(fallback.specializationMode).toBe("auto");
  });

  it("resolves durable-memory controls with bounded defaults", () => {
    const config = resolveSncPluginConfig(
      {
        durableMemory: {
          maxCatalogEntries: 96.9,
          staleEntryDays: 14.4,
          projectionLimit: 5.8,
          projectionMinimumScore: 7.6,
        },
      },
      (input) => input,
    );

    expect(config.durableMemory).toEqual({
      maxCatalogEntries: 96,
      staleEntryDays: 14,
      projectionLimit: 5,
      projectionMinimumScore: 7,
    });
  });

  it("clamps invalid durable-memory controls to safe minimums", () => {
    const config = resolveSncPluginConfig(
      {
        durableMemory: {
          maxCatalogEntries: 0,
          staleEntryDays: -10,
          projectionLimit: 0,
          projectionMinimumScore: -3,
        },
      },
      (input) => input,
    );

    expect(config.durableMemory).toEqual({
      maxCatalogEntries: 1,
      staleEntryDays: 1,
      projectionLimit: 1,
      projectionMinimumScore: 0,
    });
  });

  it("resolves style-overlay defaults when style config is present", () => {
    const config = resolveSncPluginConfig(
      {
        style: {
          mode: "auto",
        },
      },
      (input) => `/abs/${input}`,
    );

    expect(config.style).toEqual({
      enabled: true,
      mode: "auto",
      intensity: 0.72,
      strictness: 0.82,
      maxExamples: 1,
    });
  });

  it("resolves explicit style profile config and clamps bounds", () => {
    const config = resolveSncPluginConfig(
      {
        style: {
          mode: "profile",
          profileId: "mist-suspense",
          profileFile: "./profiles/mist.json",
          intensity: 2,
          strictness: -1,
          maxExamples: 3.8,
        },
      },
      (input) => `/abs/${input}`,
    );

    expect(config.style).toEqual({
      enabled: true,
      mode: "profile",
      profileId: "mist-suspense",
      profileFile: "/abs/./profiles/mist.json",
      intensity: 1,
      strictness: 0,
      maxExamples: 3,
    });
  });
});
