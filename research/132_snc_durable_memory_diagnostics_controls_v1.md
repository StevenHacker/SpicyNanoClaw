# SNC Durable Memory Diagnostics And Controls V1

## Purpose

Close the first operator-grade gap in SNC durable memory without expanding SNC into a host-owned memory platform.

This slice is about:

- bounded diagnostics
- explainable catalog hygiene
- small operator controls

It is not about:

- generic recall tooling
- helper-surface expansion
- host memory-slot takeover

## What Landed

The SNC plugin now has a small `durableMemory` config surface:

- `maxCatalogEntries`
- `staleEntryDays`
- `projectionLimit`
- `projectionMinimumScore`

These controls are plugin-owned and only affect SNC durable-memory retention and projection behavior.

The runtime now uses them in two places:

1. `afterTurn(...)`
   durable-memory persistence now honors:
   - bounded catalog size
   - stale weak-entry pruning window

2. `assemble(...)`
   durable-memory projection now honors:
   - projection limit
   - projection minimum score

The runtime also projects a new bounded `Durable memory diagnostics` section when operator attention is actually useful.

## Diagnostics Contract

The diagnostics section is intentionally sparse.

It only appears when at least one of these conditions is true:

- weak single-signal entries exist
- stale weak entries are waiting for prune
- no current cue clears the configured projection score
- the projection window is saturated

When it appears, it reports:

- catalog size
- projected-now count vs qualified count
- category mix
- weak-entry hygiene pressure
- projection saturation / no-match guidance

This keeps durable memory explainable without turning the system prompt into a state dashboard.

## Why This Matters

Before this slice, durable memory was already useful, but operator feedback was weak:

- cues could appear without an explanation of catalog pressure
- stale weak entries only disappeared implicitly on write
- projection limits were active but not visible

Now the path is sharper:

- retention policy is configurable but still bounded
- pruning pressure is visible
- projection starvation or saturation is visible
- the defaults stay conservative

## Files

Primary implementation:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/config.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/openclaw.plugin.json`

Primary tests:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/config.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.test.ts`

## Validation

Validated with:

- targeted Vitest for config, durable-memory, engine, helper-tools, and hook-scaffold
- `scripts/validate_snc_focus_v2.ps1`
- `scripts/validate_snc_dispatcher.ps1`

Results:

- focused SNC shaping: `47/47`
- continuity baseline: `18/18`
- dispatcher gate: `36/36`
- workspace `tsc`: passed with `8GB` heap

## Architectural Read

This slice stays aligned with the broader doctrine:

- plugin-owned state
- host-safe seams
- bounded explainability
- no new mandatory runtime surface

It also aligns with the accepted CC donor read:

- memory quality should be inspectable
- hygiene policy should be explicit
- projection pressure should be understandable instead of magical

## Next Recommendation

The next engineering order should now be:

1. `SNC-Milestone2-01` Controller Launch Path follow-up
2. `SNC-Milestone2-02` follow-up only if new runtime evidence still sharpens worker diagnostics
3. `SNC-Milestone2-05` Helper-Tool Opt-In Pilot only if `Milestone 2` still benefits from a bounded optional helper surface

`Durable memory` should now return to refinement-only status unless later validation surfaces a real operator failure mode.
