# SNC Durable Memory Integration V1

## Purpose

This packet lands the first bounded integration of the accepted durable-memory utility into SNC-owned runtime seams.

The integration stays host-safe:

- host memory-slot ownership is untouched
- compaction remains delegated to the OpenClaw runtime
- helper-tool registration is deferred
- durable memory stays plugin-local inside SNC

## Chosen Trigger

The safer v1 trigger is turn finalization in `afterTurn(...)`, not a new `session_end` harvest path.

Why this path was chosen:

1. `afterTurn(...)` already has the current turn messages and the resolved SNC session state boundary.
2. Durable harvesting can reuse the session snapshot SNC already persists, so the new layer does not depend on hook timing.
3. `session_end` is still useful for transient hook-scaffold cleanup, but it is not the best first write trigger for durable memory because it does not improve host safety over the existing turn-finalization seam.

## Integration Shape

### 1. Harvest

After SNC persists session state, it now harvests durable candidates from the same structured session artifacts:

- `storyLedger.userDirectives`
- `storyLedger.continuityNotes`
- `chapterState.constraints`
- `chapterState.focus`
- `chapterState.latestUserDirective`
- `autoCompactionSummary`

The harvest result is then merged into SNC-owned local durable-memory storage.

### 2. Store

Durable entries are written under the plugin-local state directory:

- `stateDir/durable-memory/catalog.json`
- `stateDir/durable-memory/entries/<entry-id>.json`

This keeps durable memory colocated with SNC state without claiming the OpenClaw memory slot.

### 3. Project

During `assemble(...)`, SNC now loads the durable-memory catalog and projects a bounded `Durable memory cues` section when the catalog has relevant matches.

The projection uses the accepted utility's scorer and remains intentionally small.

## What Was Not Added

- no memory-slot registration
- no tool exposure
- no MCP surface
- no helper-tool registration
- no host compaction ownership
- no broader OpenClaw memory pipeline changes

## Validation Intent

This integration is intentionally narrow enough to validate with focused SNC tests only.

The expected signal is:

1. session state is still persisted normally
2. durable entries are harvested into plugin-local storage
3. durable cues can be projected back into the next assembly
4. hook-scaffold behavior remains unrelated to durable-memory storage

## Follow-Up Boundary

If future evidence shows the durable catalog is too small or too lossy, the next change should still stay inside the SNC plugin boundary.

The next likely expansions would be:

- better promotion rules
- stronger relevance scoring
- optional companion adapter work

None of those are required for this v1 integration.
