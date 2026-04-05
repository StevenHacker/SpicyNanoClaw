# SNC Acceptance Matrix V2

## Purpose

Define a narrower acceptance and benchmark harness companion for SNC without replacing the existing dispatcher validation helper.

This matrix is intentionally focused on:

- transcript shaping
- state continuity
- no-regression basics

It is the companion gate, not the broad gate.

## Companion Script

- `scripts/validate_snc_focus_v2.ps1`

Recommended use:

- run this for shaping and continuity checks
- run `scripts/validate_snc_dispatcher.ps1` for the broader dispatcher baseline, including workspace typecheck

## Acceptance Tiers

| Tier | Files / checks | What it proves | Pass rule |
| --- | --- | --- | --- |
| Shaping focus | `extensions/snc/src/config.test.ts`, `extensions/snc/src/hook-scaffold.test.ts`, `extensions/snc/src/transcript-shaping.test.ts`, `extensions/snc/src/replacement-ledger.test.ts` | config-gated hook shaping, transcript-note shaping, and stable replacement decisions | pass if the focused tests exist and succeed |
| Continuity baseline | `extensions/snc/src/session-state.test.ts`, `extensions/snc/src/engine.test.ts` | session-state extraction, compaction guidance, and engine-level continuity still hold | required for the companion gate |
| Dispatcher baseline | `scripts/validate_snc_dispatcher.ps1` | focused SNC tests plus full workspace typecheck | separate broader gate, not replaced here |

## Benchmark Shape

The companion script should report:

- host copy path
- Node home path
- per-step success or failure
- elapsed time for each step
- a final success line when all required checks pass

That output is enough for a quick acceptance read without turning this into a full performance harness.

## Acceptance Criteria

1. Shaping tests validate the first bounded SNC shaping slice, including the standalone transcript-shaping utility.
2. Continuity tests keep the session-state and engine contract stable.
3. The companion remains narrow and does not take over workspace typecheck duties.
4. Missing shaping tests do not force the broad dispatcher helper to change.
5. The dispatcher helper remains the broader acceptance gate for the host copy.

## No-Regression Basics

The companion should catch regressions in:

- persisted session continuity
- compaction guidance shaping
- baseline engine behavior
- newly added hook-shaping, transcript-shaping, and replacement-ledger utilities

It should not be used as a substitute for:

- full workspace typecheck
- host-wide acceptance
- unrelated package regression coverage

## Use In Cycle 003

Best reading for this cycle:

1. validate the new shaping, transcript-shaping, and replacement utilities when they land
2. keep session-state and engine regressions visible
3. use the dispatcher helper only when the broader baseline is needed

## Summary

This matrix intentionally narrows SNC acceptance to the slices most likely to move during cycle 003:

- shaping
- transcript-note shaping
- continuity
- the simplest no-regression checks

That keeps the feedback loop tight while preserving the existing dispatcher helper as the broader validation path.
