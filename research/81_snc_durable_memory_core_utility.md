# SNC Durable Memory Core Utility

## Purpose

This packet lands the first plugin-local durable-memory utility for SNC.

It stays bounded and hot-pluggable:

- harvests durable candidates from SNC-owned session artifacts
- stores them under SNC-owned local state
- reloads the same store later
- projects only a few relevant cues back out

It does not claim the OpenClaw memory slot and it does not wire into `engine.ts` or `config.ts`.

## Public Shape

The utility is implemented in:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.ts`

The main exported helpers are:

- `harvestSncDurableMemoryEntries(...)`
- `persistSncDurableMemoryStore(...)`
- `loadSncDurableMemoryCatalog(...)`
- `loadSncDurableMemoryEntry(...)`
- `mergeSncDurableMemoryEntries(...)`
- `projectSncDurableMemoryEntries(...)`
- `buildSncDurableMemorySection(...)`

The on-disk layout is:

- `stateDir/durable-memory/catalog.json`
- `stateDir/durable-memory/entries/<entry-id>.json`

## What It Harvests

v1 harvests only from structured SNC artifacts:

- `storyLedger.userDirectives`
- `storyLedger.continuityNotes`
- `chapterState.constraints`
- `chapterState.focus`
- `chapterState.latestUserDirective` as a fallback evidence source
- `autoCompactionSummary`

It does not harvest raw transcript text and it does not try to become a general memory extractor.

## Projection Rule

Projection is intentionally small:

- score against the current turn text, current focus, and current constraints
- keep only the top few entries
- suppress weak matches instead of dumping the full store

The recommended use is to build a short `Durable memory cues` section during `assemble(...)` later, not to expose a new tool lane.

## Assumptions

1. The plugin can write to its resolved `stateDir`.
2. `session_end` or a similar bounded lifecycle point will be used later as the main harvest trigger.
3. SNC keeps local durable memory plugin-owned in v1 and does not take host memory-slot ownership.
4. The durable store is allowed to be lossy in the sense that it prefers confirmed, repeated, or clearly user-authored cues over speculative recall.

## Usage Sketch

```ts
const harvested = harvestSncDurableMemoryEntries({
  sessionId,
  sessionKey,
  sessionState,
  now: new Date().toISOString(),
});

await persistSncDurableMemoryStore({
  stateDir,
  entries: harvested,
});

const catalog = await loadSncDurableMemoryCatalog({ stateDir });
const section = buildSncDurableMemorySection({
  entries: catalog ?? [],
  currentText,
  currentFocus,
  currentConstraints,
});
```

## SNC Relevance

This utility gives SNC a real durable-memory base without forcing the host into a memory fork.

It strengthens the current ladder:

1. session-local continuity
2. plugin-local durable continuity
3. bounded projection into future turns

That is the right v1 shape because it preserves host safety while proving whether durable memory is useful before any broader OpenClaw integration.

## Modification Guidance

### Wrap

- harvest from existing SNC session artifacts
- store under SNC-owned local paths
- project only a few relevant cues

### Extend

- evidence merging
- tag derivation
- projection scoring

### Keep Hot-Pluggable

- no host memory-slot claim
- no engine integration in this packet
- no tool exposure in this packet
- no global memory schema imposed on OpenClaw

### Explicitly Deferred

- engine wiring
- config wiring
- host memory runtime registration
- helper-tool or MCP exposure
- sync with host memory plugins
- remote or shared durable memory

