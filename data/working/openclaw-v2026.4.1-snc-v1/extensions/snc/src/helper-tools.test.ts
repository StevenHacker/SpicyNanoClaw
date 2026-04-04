import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildSncArtifactTool,
  buildSncHelperTools,
  buildSncSessionStateTool,
  collectSncOwnedArtifactSources,
} from "./helper-tools.js";
import type { SncResolvedConfig } from "./config.js";
import { persistSncSessionState } from "./session-state.js";

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "snc-helper-tools-test-"));
  tempDirs.push(dir);
  return dir;
}

function createConfig(overrides: Partial<SncResolvedConfig> = {}): SncResolvedConfig {
  return {
    packetFiles: [],
    maxSectionBytes: 24_576,
    hooks: {
      enabled: false,
      targets: [],
      maxRewritesPerSession: 6,
      maxReplacementBytes: 768,
      maxToolResultBytes: 2_048,
    },
    ...overrides,
  };
}

function message(role: "user" | "assistant", content: unknown, timestamp = 1): AgentMessage {
  return { role, content, timestamp } as AgentMessage;
}

function toolText(result: { content: Array<{ type: string; text?: string }> }): string {
  const first = result.content[0];
  return first && first.type === "text" && typeof first.text === "string" ? first.text : "";
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("snc helper tools", () => {
  it("collects SNC-owned artifact sources in stable order", async () => {
    const root = createTempDir();
    const briefFile = path.join(root, "brief.md");
    const ledgerFile = path.join(root, "ledger.md");
    const packetFile = path.join(root, "packets", "scene.md");
    const packetDir = path.join(root, "packet-dir");

    mkdirSync(path.dirname(packetFile), { recursive: true });
    mkdirSync(packetDir, { recursive: true });
    writeFileSync(briefFile, "Project brief", "utf8");
    writeFileSync(ledgerFile, "Ledger entry", "utf8");
    writeFileSync(packetFile, "Scene packet", "utf8");
    writeFileSync(path.join(packetDir, "b.txt"), "Packet B", "utf8");
    writeFileSync(path.join(packetDir, "a.md"), "Packet A", "utf8");

    const sources = await collectSncOwnedArtifactSources(
      createConfig({
        briefFile,
        ledgerFile,
        packetFiles: [packetFile],
        packetDir,
      }),
    );

    expect(sources.map((source) => source.kind)).toEqual([
      "brief",
      "ledger",
      "packet",
      "packet-dir",
      "packet-dir",
    ]);
    expect(sources.map((source) => source.title)).toEqual([
      "brief",
      "ledger",
      "scene",
      "a",
      "b",
    ]);
  });

  it("builds a bounded artifact lookup tool that stays read-only", async () => {
    const root = createTempDir();
    const briefFile = path.join(root, "brief.md");
    const packetFile = path.join(root, "packet-one.md");
    writeFileSync(briefFile, "Project brief with chapter one focus", "utf8");
    writeFileSync(packetFile, "Packet one covers the missing ring clue.", "utf8");

    const artifactTool = buildSncArtifactTool({
      briefFile,
      ledgerFile: undefined,
      packetFiles: [packetFile],
      packetDir: undefined,
      maxSectionBytes: 4_096,
    });

    const result = await artifactTool.execute(
      "tool-1",
      {
        query: "ring",
        includeBodies: true,
        maxItems: 1,
      } as never,
      undefined,
      undefined,
      {} as never,
    );

    expect(artifactTool.name).toBe("snc_artifact_lookup");
    expect(artifactTool.label).toContain("artifact");
    expect(toolText(result)).toContain("SNC artifact lookup");
    expect(toolText(result)).toContain("sourceCount: 2");
    expect(toolText(result)).toContain("matchCount: 1");
    expect(toolText(result)).toContain("Packet one covers the missing ring clue.");
    expect(result.details.ok).toBe(true);
    expect(result.details.artifacts).toHaveLength(1);
    expect(result.details.artifacts[0]?.path).toBe(packetFile);
  });

  it("projects persisted session state without mutating it", async () => {
    const root = createTempDir();
    const stateDir = path.join(root, ".snc-state");
    const sessionStateTool = buildSncSessionStateTool({
      stateDir,
    });

    await persistSncSessionState({
      stateDir,
      sessionId: "session-1",
      sessionKey: "agent:main:story",
      messages: [
        message("user", "Please continue chapter one and keep the noir tone.", 1),
        message(
          "assistant",
          "Next I will draft the opening scene and maintain continuity with the missing-ring clue.",
          2,
        ),
      ],
      prePromptMessageCount: 0,
      autoCompactionSummary: "keep the ring clue active",
    });

    const result = await sessionStateTool.execute(
      "tool-2",
      {
        sessionId: "session-1",
        sessionKey: "agent:main:story",
        includeRecentMessages: true,
        maxRecentMessages: 2,
      } as never,
      undefined,
      undefined,
      {} as never,
    );

    expect(sessionStateTool.name).toBe("snc_session_state_projection");
    expect(toolText(result)).toContain("Session snapshot");
    expect(toolText(result)).toContain("latestUserDirective");
    expect(toolText(result)).toContain("latestAssistantPlan");
    expect(toolText(result)).toContain("keep the ring clue active");
    expect(result.details.ok).toBe(true);
    expect(result.details.found).toBe(true);
    expect(result.details.sessionId).toBe("session-1");
    expect(result.details.sessionKey).toBe("agent:main:story");
    expect(result.details.sessionState?.turnCount).toBe(1);
  });

  it("returns a bounded missing-state response when no projection exists", async () => {
    const root = createTempDir();
    const sessionStateTool = buildSncHelperTools(
      createConfig({
        stateDir: path.join(root, ".snc-state"),
      }),
    ).sessionStateTool;

    const result = await sessionStateTool.execute(
      "tool-3",
      {
        sessionId: "missing-session",
      } as never,
      undefined,
      undefined,
      {} as never,
    );

    expect(toolText(result)).toContain("No SNC session state found");
    expect(result.details.found).toBe(false);
    expect(result.details.sessionId).toBe("missing-session");
  });
});
