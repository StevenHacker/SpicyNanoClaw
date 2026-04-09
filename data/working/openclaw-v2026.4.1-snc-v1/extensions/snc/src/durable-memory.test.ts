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
  resolveSncDurableMemoryNamespace,
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

function createTransientOperationalSessionState(): Pick<
  SncSessionState,
  "storyLedger" | "chapterState" | "autoCompactionSummary"
> {
  return {
    storyLedger: {
      userDirectives: [
        "Read brief.md and list today's top four priorities.",
        "Keep naming consistent across the project.",
      ],
      assistantPlans: [],
      continuityNotes: [
        "Inspect the report.md diff and summarize changes.",
        "Keep the character voice stable across chapter 5.",
      ],
      events: [],
    },
    chapterState: {
      focus: "Review the failing tests and config diff",
      latestUserDirective: "Read brief.md and list today's top four priorities.",
      latestAssistantPlan: undefined,
      constraints: ["Keep naming consistent across the project."],
    },
    autoCompactionSummary:
      "Inspect report.md, compare the config diff, and keep the character voice stable across chapter 5.",
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

  it("suppresses transient operational cues from cross-session durable harvest while keeping stable preferences", () => {
    const harvested = harvestSncDurableMemoryEntries({
      sessionId: "session-transient",
      sessionKey: "agent:main:mixed",
      now: "2026-04-05T00:00:00.000Z",
      sessionState: createTransientOperationalSessionState(),
    });

    expect(harvested.map((entry) => entry.text)).toEqual(
      expect.arrayContaining([
        "Keep naming consistent across the project.",
        "Keep the character voice stable across chapter 5.",
      ]),
    );
    expect(harvested.some((entry) => entry.text.includes("Read brief.md"))).toBe(false);
    expect(harvested.some((entry) => entry.text.includes("report.md"))).toBe(false);
    expect(harvested.some((entry) => entry.text.includes("failing tests"))).toBe(false);
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

  it("isolates durable-memory catalogs by namespace so different agents do not share the same catalog", async () => {
    const stateDir = createStateDir();
    const writerEntries = harvestSncDurableMemoryEntries({
      sessionId: "session-writer-1",
      sessionKey: "agent:writer:story",
      now: "2026-04-04T00:00:00.000Z",
      sessionState: createSessionState(),
    });
    const reviewerEntries = harvestSncDurableMemoryEntries({
      sessionId: "session-reviewer-1",
      sessionKey: "agent:reviewer:story",
      now: "2026-04-04T00:00:00.000Z",
      sessionState: {
        storyLedger: {
          userDirectives: ["Keep the review terse and evidence-backed"],
          assistantPlans: [],
          continuityNotes: ["Track unresolved contradictions across the manuscript"],
          events: [],
        },
        chapterState: {
          focus: "Continuity review packet",
          latestUserDirective: "Keep the review terse and evidence-backed",
          latestAssistantPlan: undefined,
          constraints: ["Do not draft new prose"],
        },
        autoCompactionSummary: undefined,
      },
    });

    const writerNamespace = resolveSncDurableMemoryNamespace({
      sessionId: "session-writer-1",
      sessionKey: "agent:writer:story",
    });
    const reviewerNamespace = resolveSncDurableMemoryNamespace({
      sessionId: "session-reviewer-1",
      sessionKey: "agent:reviewer:story",
    });

    await persistSncDurableMemoryStore({
      stateDir,
      namespace: writerNamespace,
      entries: writerEntries,
      now: "2026-04-04T00:00:00.000Z",
    });
    await persistSncDurableMemoryStore({
      stateDir,
      namespace: reviewerNamespace,
      entries: reviewerEntries,
      now: "2026-04-04T00:00:00.000Z",
    });

    const writerCatalog = await loadSncDurableMemoryCatalog({
      stateDir,
      namespace: writerNamespace,
    });
    const reviewerCatalog = await loadSncDurableMemoryCatalog({
      stateDir,
      namespace: reviewerNamespace,
    });

    expect(writerCatalog?.entries.some((entry) => entry.text.includes("Keep the noir tone"))).toBe(
      true,
    );
    expect(
      writerCatalog?.entries.some((entry) => entry.text.includes("Keep the review terse")),
    ).toBe(false);
    expect(
      reviewerCatalog?.entries.some((entry) => entry.text.includes("Keep the review terse")),
    ).toBe(true);
    expect(
      reviewerCatalog?.entries.some((entry) => entry.text.includes("Keep the noir tone")),
    ).toBe(false);
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

  it("removes transient operational entries from persisted catalog on the next durable write", async () => {
    const stateDir = createStateDir();
    const transientEntry = {
      version: 1,
      id: "dm-transient-op",
      category: "directive" as const,
      text: "Read brief.md and list today's top four priorities.",
      tags: ["directive"],
      strength: "explicit-user" as const,
      firstCapturedAt: "2026-04-04T00:00:00.000Z",
      lastConfirmedAt: "2026-04-04T00:00:00.000Z",
      confirmationCount: 1,
      evidence: [{ sessionId: "session-old", source: "story-ledger" as const }],
    };
    const stableEntry = {
      version: 1,
      id: "dm-stable-style",
      category: "directive" as const,
      text: "Keep naming consistent across the project.",
      tags: ["directive"],
      strength: "explicit-user" as const,
      firstCapturedAt: "2026-04-04T00:00:00.000Z",
      lastConfirmedAt: "2026-04-04T00:00:00.000Z",
      confirmationCount: 1,
      evidence: [{ sessionId: "session-old", source: "story-ledger" as const }],
    };

    await persistSncDurableMemoryStore({
      stateDir,
      entries: [transientEntry, stableEntry],
      now: "2026-04-04T00:00:00.000Z",
    });

    const catalog = await loadSncDurableMemoryCatalog({ stateDir });
    expect(catalog?.entries.map((entry) => entry.id)).toEqual(["dm-stable-style"]);
    expect(readdirSync(path.join(stateDir, "durable-memory", "entries"))).toEqual([
      "dm-stable-style.json",
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

  it("matches multilingual durable cues with mixed-script overlap instead of ASCII-only overlap", () => {
    const projected = projectSncDurableMemoryEntries({
      entries: [
        {
          version: 1,
          id: "dm-cn-name",
          category: "directive",
          text: "\u4FDD\u6301\u6797\u781A\u8FD9\u4E2A\u540D\u5B57\u4E00\u81F4\uff0c\u4E0D\u8981\u5199\u6210\u6797\u71D5\u3002",
          tags: ["directive", "character"],
          strength: "explicit-user",
          firstCapturedAt: "2026-04-06T00:00:00.000Z",
          lastConfirmedAt: "2026-04-06T00:00:00.000Z",
          confirmationCount: 1,
          evidence: [{ sessionId: "session-cn", source: "story-ledger" }],
        },
        {
          version: 1,
          id: "dm-en-style",
          category: "directive",
          text: "Keep the noir tone steady.",
          tags: ["directive", "tone"],
          strength: "explicit-user",
          firstCapturedAt: "2026-04-06T00:00:00.000Z",
          lastConfirmedAt: "2026-04-06T00:00:00.000Z",
          confirmationCount: 1,
          evidence: [{ sessionId: "session-en", source: "story-ledger" }],
        },
      ],
      currentText:
        "Continue the scene with Lin Yan (\u6797\u781A) speaking to Lu Chuan, and keep \u6797\u781A naming consistent.",
      currentFocus: "\u6797\u781A\u548C\u9646\u5DDD\u7684\u5BF9\u8BDD",
      limit: 1,
      minimumScore: 3,
    });

    expect(projected).toHaveLength(1);
    expect(projected[0]?.id).toBe("dm-cn-name");
  });

  it("suppresses contradicted durable cues when fresher evidence corrects the entity form", () => {
    const entries = [
      {
        version: 1,
        id: "dm-wrong-name",
        category: "directive" as const,
        text: "Keep the name 林燕 consistent in chapter four.",
        tags: ["directive", "character"],
        strength: "explicit-user" as const,
        firstCapturedAt: "2026-04-05T00:00:00.000Z",
        lastConfirmedAt: "2026-04-05T00:00:00.000Z",
        confirmationCount: 1,
        evidence: [{ sessionId: "session-old", source: "story-ledger" as const }],
      },
      {
        version: 1,
        id: "dm-tone",
        category: "directive" as const,
        text: "Keep the noir tone steady.",
        tags: ["directive", "tone"],
        strength: "explicit-user" as const,
        firstCapturedAt: "2026-04-05T00:00:00.000Z",
        lastConfirmedAt: "2026-04-05T00:00:00.000Z",
        confirmationCount: 1,
        evidence: [{ sessionId: "session-old", source: "story-ledger" as const }],
      },
    ];

    const projected = projectSncDurableMemoryEntries({
      entries,
      currentText: "Use 林砚, not 林燕, in this chapter, and keep the noir tone steady.",
      currentFocus: "林砚和陆川的对话",
      limit: 2,
      minimumScore: 3,
    });

    expect(projected.map((entry) => entry.id)).toEqual(["dm-tone"]);

    const diagnostics = buildSncDurableMemoryDiagnosticsSection({
      entries,
      currentText: "Use 林砚, not 林燕, in this chapter, and keep the noir tone steady.",
      currentFocus: "林砚和陆川的对话",
      limit: 2,
      minimumScore: 3,
      now: "2026-04-06T00:00:00.000Z",
      staleEntryDays: 30,
      maxBytes: 1_400,
    });

    expect(diagnostics).toContain("Conflict-suppressed cues: 1;");
    expect(diagnostics).toContain("Suppressed by fresher evidence:");
    expect(diagnostics).toContain("prefers 林砚 over 林燕");
  });

  it("keeps rejection guardrails that reinforce the current correction", () => {
    const entries = [
      {
        version: 1,
        id: "dm-avoid-sera",
        category: "constraint" as const,
        text: "Do not write Sera in this chapter.",
        tags: ["constraint", "character"],
        strength: "explicit-user" as const,
        firstCapturedAt: "2026-04-05T00:00:00.000Z",
        lastConfirmedAt: "2026-04-05T00:00:00.000Z",
        confirmationCount: 1,
        evidence: [{ sessionId: "session-old", source: "story-ledger" as const }],
      },
      {
        version: 1,
        id: "dm-tone",
        category: "directive" as const,
        text: "Keep the noir tone steady.",
        tags: ["directive", "tone"],
        strength: "explicit-user" as const,
        firstCapturedAt: "2026-04-05T00:00:00.000Z",
        lastConfirmedAt: "2026-04-05T00:00:00.000Z",
        confirmationCount: 1,
        evidence: [{ sessionId: "session-old", source: "story-ledger" as const }],
      },
    ];

    const projected = projectSncDurableMemoryEntries({
      entries,
      currentText: "Use Mira, not Sera, and keep the noir tone steady in this chapter.",
      currentFocus: "Mira enters the confrontation scene",
      limit: 3,
      minimumScore: 3,
    });

    expect(projected.map((entry) => entry.id)).toContain("dm-avoid-sera");

    const diagnostics = buildSncDurableMemoryDiagnosticsSection({
      entries,
      currentText: "Use Mira, not Sera, and keep the noir tone steady in this chapter.",
      currentFocus: "Mira enters the confrontation scene",
      limit: 3,
      minimumScore: 3,
      now: "2026-04-06T00:00:00.000Z",
      staleEntryDays: 30,
      maxBytes: 1_400,
    });

    expect(diagnostics).not.toContain("Suppressed by fresher evidence: Do not write Sera");
    expect(diagnostics).toContain("Do not write Sera in this chapter.");
  });

  it("boosts cues that carry the preferred corrected form forward", () => {
    const entries = [
      {
        version: 1,
        id: "dm-preferred-name",
        category: "directive" as const,
        text: "Keep 林砚 consistent in chapter four.",
        tags: ["directive", "character"],
        strength: "derived" as const,
        firstCapturedAt: "2026-04-05T00:00:00.000Z",
        lastConfirmedAt: "2026-04-05T00:00:00.000Z",
        confirmationCount: 1,
        evidence: [{ sessionId: "session-old", source: "chapter-state" as const }],
      },
      {
        version: 1,
        id: "dm-generic-tone",
        category: "directive" as const,
        text: "Keep the noir tone steady.",
        tags: ["directive", "tone"],
        strength: "explicit-user" as const,
        firstCapturedAt: "2026-04-05T00:00:00.000Z",
        lastConfirmedAt: "2026-04-05T00:00:00.000Z",
        confirmationCount: 1,
        evidence: [{ sessionId: "session-old", source: "story-ledger" as const }],
      },
    ];

    const projected = projectSncDurableMemoryEntries({
      entries,
      currentText: "Use 林砚, not 林燕, and keep the noir tone steady in this chapter.",
      currentFocus: "林砚和陆川的对话",
      limit: 1,
      minimumScore: 3,
    });

    expect(projected.map((entry) => entry.id)).toEqual(["dm-preferred-name"]);

    const diagnostics = buildSncDurableMemoryDiagnosticsSection({
      entries,
      currentText: "Use 林砚, not 林燕, and keep the noir tone steady in this chapter.",
      currentFocus: "林砚和陆川的对话",
      limit: 1,
      minimumScore: 3,
      now: "2026-04-06T00:00:00.000Z",
      staleEntryDays: 30,
      maxBytes: 1_400,
    });

    expect(diagnostics).toContain("supports current correction toward 林砚");
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
        {
          version: 1,
          id: "dm-transient-op",
          category: "directive",
          text: "Read brief.md and list today's top four priorities.",
          tags: ["directive"],
          strength: "explicit-user",
          firstCapturedAt: "2026-04-04T00:00:00.000Z",
          lastConfirmedAt: "2026-04-04T00:00:00.000Z",
          confirmationCount: 1,
          evidence: [{ sessionId: "session-1", source: "story-ledger" }],
        },
      ],
      currentText: "Please keep the noir tone and first-person POV.",
      currentConstraints: ["Keep first-person POV"],
      limit: 1,
      minimumScore: 3,
      now: "2026-04-04T00:00:00.000Z",
      staleEntryDays: 30,
      maxBytes: 1_200,
    });

    expect(diagnostics).toContain("Catalog: 4 entries; projected now 1/3 above score 3.");
    expect(diagnostics).toContain("Mix: directive 1, constraint 1, fact 1.");
    expect(diagnostics).toContain("Weak single-signal entries: 1;");
    expect(diagnostics).toContain("Stale weak entries waiting for prune: 1;");
    expect(diagnostics).toContain("Transient operational entries suppressed: 1;");
    expect(diagnostics).toContain("Projection is saturated at limit 1;");
    expect(diagnostics).toContain("Projected cue reasons:");
    expect(diagnostics).toContain(
      "Keep first-person POV -> explicit-user constraint; matches current turn; matches active constraints",
    );
    expect(diagnostics).toContain("Held back by limit: Keep the noir tone");
    expect(diagnostics).toContain("explicit-user directive; matches current turn");
  });
});
