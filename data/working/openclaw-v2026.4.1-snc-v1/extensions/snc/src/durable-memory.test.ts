import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { SncSessionState } from "./session-state.js";
import {
  buildSncDurableMemoryDiagnosticsSection,
  buildSncDurableMemorySection,
  harvestSncDurableMemoryEntries,
  loadSncDurableMemoryCatalog,
  loadSncDurableMemoryEntry,
  persistSncDurableMemoryStore,
  projectSncDurableMemoryEntries,
} from "./durable-memory.js";

const tempDirs: string[] = [];

function createStateDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "snc-durable-memory-test-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function createSessionState(): Pick<
  SncSessionState,
  "storyLedger" | "chapterState" | "autoCompactionSummary"
> {
  return {
    storyLedger: {
      userDirectives: ["Keep the noir tone", "Keep the noir tone"],
      assistantPlans: ["Draft the confrontation beat"],
      continuityNotes: ["Keep the ring clue active"],
      events: [],
    },
    chapterState: {
      focus: "Chapter 3 confrontation",
      latestUserDirective: "Keep the noir tone",
      latestAssistantPlan: "Draft the confrontation beat",
      constraints: ["Keep first-person POV"],
    },
    autoCompactionSummary: "Preserve the ring clue and the chapter three payoff.",
  };
}

function createFallbackDirectiveSessionState(): Pick<
  SncSessionState,
  "storyLedger" | "chapterState" | "autoCompactionSummary"
> {
  return {
    storyLedger: {
      userDirectives: [],
      assistantPlans: [],
      continuityNotes: ["Keep the ring clue active"],
      events: [],
    },
    chapterState: {
      focus: "Chapter 4 bridge scene",
      latestUserDirective: "Keep the noir tone",
      latestAssistantPlan: undefined,
      constraints: ["Keep first-person POV"],
    },
    autoCompactionSummary: undefined,
  };
}

describe("snc durable memory utility", () => {
  it("harvests bounded durable entries from SNC session artifacts", () => {
    const harvested = harvestSncDurableMemoryEntries({
      sessionId: "session-1",
      sessionKey: "agent:main:story",
      now: "2026-04-04T00:00:00.000Z",
      sessionState: createSessionState(),
    });

    expect(harvested).toHaveLength(5);

    const directive = harvested.find((entry) => entry.category === "directive");
    const constraint = harvested.find((entry) => entry.category === "constraint");
    const continuity = harvested.find((entry) => entry.category === "continuity");
    const fact = harvested.find((entry) => entry.category === "fact");

    expect(directive).toMatchObject({
      text: "Keep the noir tone",
      strength: "explicit-user",
      confirmationCount: 1,
    });
    expect(directive?.evidence).toEqual([expect.objectContaining({ source: "story-ledger" })]);
    expect(directive?.tags).toEqual(expect.arrayContaining(["directive", "tone"]));

    expect(constraint).toMatchObject({
      text: "Keep first-person POV",
      category: "constraint",
    });
    expect(continuity).toMatchObject({
      text: "Keep the ring clue active",
      category: "continuity",
      strength: "repeated",
    });
    expect(fact).toMatchObject({
      text: "Chapter 3 confrontation",
      category: "fact",
      strength: "derived",
    });
  });

  it("uses chapter-state latestUserDirective as a fallback only when story-ledger does not already confirm it", () => {
    const harvested = harvestSncDurableMemoryEntries({
      sessionId: "session-1b",
      sessionKey: "agent:main:story",
      now: "2026-04-04T00:00:00.000Z",
      sessionState: createFallbackDirectiveSessionState(),
    });

    expect(harvested.find((entry) => entry.category === "directive")).toMatchObject({
      text: "Keep the noir tone",
      strength: "derived",
      evidence: [expect.objectContaining({ source: "chapter-state" })],
    });
  });

  it("stores and reloads the durable-memory catalog and entry files", async () => {
    const stateDir = createStateDir();
    const harvested = harvestSncDurableMemoryEntries({
      sessionId: "session-1",
      sessionKey: "agent:main:story",
      now: "2026-04-04T00:00:00.000Z",
      sessionState: createSessionState(),
    });

    const saved = await persistSncDurableMemoryStore({
      stateDir,
      entries: harvested,
      now: "2026-04-04T00:00:00.000Z",
    });

    expect(saved?.entries).toHaveLength(5);
    expect(readdirSync(path.join(stateDir, "durable-memory", "entries"))).toHaveLength(5);

    const catalog = await loadSncDurableMemoryCatalog({ stateDir });
    expect(catalog?.entries).toHaveLength(5);
    expect(catalog?.entries[0]).toMatchObject({
      version: 1,
    });

    const entry = harvested.find((item) => item.category === "directive");
    expect(entry).toBeDefined();
    const loadedEntry = await loadSncDurableMemoryEntry({
      stateDir,
      entryId: entry?.id ?? "",
    });

    expect(loadedEntry).toMatchObject({
      id: entry?.id,
      text: "Keep the noir tone",
      confirmationCount: 1,
    });
  });

  it("prunes weak stale derived entries and removes their files on later persists", async () => {
    const stateDir = createStateDir();
    const oldWeakEntry = {
      version: 1,
      id: "dm-old-weak",
      category: "fact" as const,
      text: "Chapter 1 bridge note",
      tags: ["fact"],
      strength: "derived" as const,
      firstCapturedAt: "2026-01-01T00:00:00.000Z",
      lastConfirmedAt: "2026-01-01T00:00:00.000Z",
      confirmationCount: 1,
      evidence: [{ sessionId: "session-old", source: "chapter-state" as const }],
    };
    const oldStrongEntry = {
      version: 1,
      id: "dm-old-strong",
      category: "directive" as const,
      text: "Keep the noir tone",
      tags: ["directive", "tone"],
      strength: "explicit-user" as const,
      firstCapturedAt: "2026-01-01T00:00:00.000Z",
      lastConfirmedAt: "2026-01-01T00:00:00.000Z",
      confirmationCount: 1,
      evidence: [{ sessionId: "session-old", source: "story-ledger" as const }],
    };

    await persistSncDurableMemoryStore({
      stateDir,
      entries: [oldWeakEntry, oldStrongEntry],
      now: "2026-01-01T00:00:00.000Z",
    });

    await persistSncDurableMemoryStore({
      stateDir,
      entries: [],
      now: "2026-04-04T00:00:00.000Z",
      staleEntryDays: 30,
    });

    const catalog = await loadSncDurableMemoryCatalog({ stateDir });
    expect(catalog?.entries.map((entry) => entry.id)).toEqual(["dm-old-strong"]);
    expect(readdirSync(path.join(stateDir, "durable-memory", "entries"))).toEqual([
      "dm-old-strong.json",
    ]);
  });

  it("projects only the most relevant durable cues back into context", () => {
    const entries = harvestSncDurableMemoryEntries({
      sessionId: "session-2",
      now: "2026-04-04T00:00:00.000Z",
      sessionState: {
        storyLedger: {
          userDirectives: ["Keep the noir tone"],
          assistantPlans: [],
          continuityNotes: ["Keep the ring clue active"],
          events: [],
        },
        chapterState: {
          focus: "Chapter 3 confrontation",
          latestUserDirective: "Keep the noir tone",
          latestAssistantPlan: undefined,
          constraints: ["Keep first-person POV"],
        },
        autoCompactionSummary: undefined,
      },
    });

    const projected = projectSncDurableMemoryEntries({
      entries,
      currentText: "Please keep the noir tone and first-person POV in chapter three.",
      currentFocus: "Chapter 3 confrontation",
      currentConstraints: ["Keep first-person POV"],
      limit: 2,
      minimumScore: 3,
    });

    expect(projected).toHaveLength(2);
    expect(projected.map((entry) => entry.text)).toEqual(
      expect.arrayContaining(["Keep the noir tone", "Keep first-person POV"]),
    );
    expect(projected.some((entry) => entry.text === "Keep the ring clue active")).toBe(false);

    const section = buildSncDurableMemorySection({
      entries,
      currentText: "Please keep the noir tone and first-person POV in chapter three.",
      currentFocus: "Chapter 3 confrontation",
      currentConstraints: ["Keep first-person POV"],
      limit: 2,
      minimumScore: 3,
      maxBytes: 400,
    });

    expect(section).toContain("Durable memory cues:");
    expect(section).toContain("[directive]");
    expect(section).toContain("Keep the noir tone");
    expect(section).toContain("[constraint]");
    expect(section).toContain("Keep first-person POV");
  });

  it("builds bounded durable-memory diagnostics when hygiene or projection limits need operator attention", () => {
    const diagnostics = buildSncDurableMemoryDiagnosticsSection({
      entries: [
        {
          version: 1,
          id: "dm-old-weak",
          category: "fact",
          text: "Chapter 1 bridge note",
          tags: ["fact"],
          strength: "derived",
          firstCapturedAt: "2026-01-01T00:00:00.000Z",
          lastConfirmedAt: "2026-01-01T00:00:00.000Z",
          confirmationCount: 1,
          evidence: [{ sessionId: "session-old", source: "chapter-state" }],
        },
        {
          version: 1,
          id: "dm-directive",
          category: "directive",
          text: "Keep the noir tone",
          tags: ["directive", "tone"],
          strength: "explicit-user",
          firstCapturedAt: "2026-04-04T00:00:00.000Z",
          lastConfirmedAt: "2026-04-04T00:00:00.000Z",
          confirmationCount: 1,
          evidence: [{ sessionId: "session-1", source: "story-ledger" }],
        },
        {
          version: 1,
          id: "dm-constraint",
          category: "constraint",
          text: "Keep first-person POV",
          tags: ["constraint", "pov"],
          strength: "explicit-user",
          firstCapturedAt: "2026-04-04T00:00:00.000Z",
          lastConfirmedAt: "2026-04-04T00:00:00.000Z",
          confirmationCount: 1,
          evidence: [{ sessionId: "session-1", source: "chapter-state" }],
        },
      ],
      currentText: "Please keep the noir tone and first-person POV.",
      currentConstraints: ["Keep first-person POV"],
      limit: 1,
      minimumScore: 3,
      now: "2026-04-04T00:00:00.000Z",
      staleEntryDays: 30,
      maxBytes: 700,
    });

    expect(diagnostics).toContain("Catalog: 3 entries; projected now 1/3 above score 3.");
    expect(diagnostics).toContain("Mix: directive 1, constraint 1, fact 1.");
    expect(diagnostics).toContain("Weak single-signal entries: 1;");
    expect(diagnostics).toContain("Stale weak entries waiting for prune: 1;");
    expect(diagnostics).toContain("Projection is saturated at limit 1;");
  });
});
