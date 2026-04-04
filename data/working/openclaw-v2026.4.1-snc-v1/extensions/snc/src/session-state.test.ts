import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildSncSessionStateSection,
  loadSncSessionState,
  persistSncSessionState,
} from "./session-state.js";

function message(role: "user" | "assistant", content: unknown, timestamp = 1): AgentMessage {
  return { role, content, timestamp } as AgentMessage;
}

const tempDirs: string[] = [];

function createStateDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "snc-state-test-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("snc session state", () => {
  it("persists and reloads structured per-session state from bilingual cues", async () => {
    const stateDir = createStateDir();

    const userInstruction = "本章聚焦调查线索，请继续第一章，并保持 noir tone，避免 exposition 过多。";
    const assistantPlan = "Next I will outline the opening scene. Maintain continuity with the missing-ring clue.";

    const saved = await persistSncSessionState({
      stateDir,
      sessionId: "session-1",
      sessionKey: "agent:main:story",
      messages: [
        message("user", userInstruction, 100),
        message("assistant", assistantPlan, 101),
      ],
      prePromptMessageCount: 0,
      autoCompactionSummary: "compacted once",
    });

    expect(saved).not.toBeNull();
    expect(saved?.turnCount).toBe(1);
    expect(saved?.storyLedger.userDirectives).toContain(userInstruction);
    expect(saved?.storyLedger.assistantPlans).toContain("Next I will outline the opening scene.");
    expect(saved?.storyLedger.continuityNotes).toContain(
      "Maintain continuity with the missing-ring clue.",
    );
    expect(saved?.storyLedger.continuityNotes).toContain("compacted once");
    expect(saved?.chapterState.focus).toBe(userInstruction);
    expect(saved?.chapterState.latestUserDirective).toBe(userInstruction);
    expect(saved?.chapterState.latestAssistantPlan).toBe("Next I will outline the opening scene.");
    expect(saved?.chapterState.constraints).toContain(userInstruction);
    expect(saved?.recentMessages).toEqual([
      {
        role: "user",
        text: userInstruction,
        timestamp: 100,
      },
      {
        role: "assistant",
        text: assistantPlan,
        timestamp: 101,
      },
    ]);

    const reloaded = await loadSncSessionState({
      stateDir,
      sessionId: "session-1",
      sessionKey: "agent:main:story",
    });

    expect(reloaded).toMatchObject({
      version: 2,
      sessionId: "session-1",
      sessionKey: "agent:main:story",
      turnCount: 1,
      autoCompactionSummary: "compacted once",
    });
    expect(reloaded?.recentMessages).toHaveLength(2);
    expect(reloaded?.storyLedger.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "directive", text: userInstruction }),
        expect.objectContaining({ kind: "focus", text: userInstruction }),
        expect.objectContaining({
          kind: "assistant-plan",
          text: "Next I will outline the opening scene.",
        }),
        expect.objectContaining({ kind: "continuity", text: "compacted once" }),
      ]),
    );

    const files = readdirSync(path.join(stateDir, "sessions"));
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^agent-main-story-[a-f0-9]{10}\.json$/);
  });

  it("keeps focus and assistant-plan extraction conservative without explicit cues", async () => {
    const stateDir = createStateDir();

    const saved = await persistSncSessionState({
      stateDir,
      sessionId: "session-2",
      sessionKey: "agent:main:story",
      messages: [
        message("user", "第三章结构安排。", 1),
        message("assistant", "我再考虑一下。", 2),
      ],
      prePromptMessageCount: 0,
    });

    expect(saved?.storyLedger.userDirectives).toEqual([]);
    expect(saved?.storyLedger.assistantPlans).toEqual([]);
    expect(saved?.chapterState.focus).toBeUndefined();
    expect(saved?.chapterState.latestUserDirective).toBeUndefined();
    expect(saved?.chapterState.latestAssistantPlan).toBeUndefined();
    expect(saved?.chapterState.constraints).toEqual([]);
  });

  it("renders a prompt-ready session snapshot section", () => {
    const text = buildSncSessionStateSection({
      version: 2,
      sessionId: "session-3",
      sessionKey: "agent:main:story",
      updatedAt: "2026-04-03T10:00:00.000Z",
      turnCount: 3,
      autoCompactionSummary: "summary text",
      storyLedger: {
        userDirectives: ["Outline the conflict"],
        assistantPlans: ["Draft the confrontation scene"],
        continuityNotes: ["Keep the ring clue active"],
        events: [],
      },
      chapterState: {
        focus: "Chapter 3 confrontation",
        latestUserDirective: "Outline the conflict",
        latestAssistantPlan: "Draft the confrontation scene",
        constraints: ["Keep first-person POV"],
      },
      recentMessages: [
        { role: "user", text: "Outline the conflict" },
        { role: "assistant", text: "Conflict outlined" },
      ],
    });

    expect(text).toContain("updatedAt: 2026-04-03T10:00:00.000Z");
    expect(text).toContain("turnCount: 3");
    expect(text).toContain("autoCompactionSummary: summary text");
    expect(text).toContain("Story ledger:");
    expect(text).toContain("User directives:");
    expect(text).toContain("- Outline the conflict");
    expect(text).toContain("Assistant plans:");
    expect(text).toContain("- Draft the confrontation scene");
    expect(text).toContain("Continuity notes:");
    expect(text).toContain("- Keep the ring clue active");
    expect(text).toContain("Chapter state:");
    expect(text).toContain("- focus: Chapter 3 confrontation");
    expect(text).toContain("- latestUserDirective: Outline the conflict");
    expect(text).toContain("- latestAssistantPlan: Draft the confrontation scene");
    expect(text).toContain("- constraints:");
    expect(text).toContain("  - Keep first-person POV");
    expect(text).toContain("- USER: Outline the conflict");
    expect(text).toContain("- ASSISTANT: Conflict outlined");
  });
});
