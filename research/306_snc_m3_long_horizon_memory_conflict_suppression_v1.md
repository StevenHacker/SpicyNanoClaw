# SNC M3 Long-Horizon Memory Conflict Suppression V1

## Purpose

Land a bounded `Milestone 3` slice that makes long-horizon memory behave more honestly when current evidence corrects older memory.

This slice does not try to build a contradiction engine.
It only makes one rule first-class:

- fresher evidence wins by suppressing contradicted durable cues from projection

## What Landed

### 1. Correction-aware suppression

`durable-memory.ts` now detects bounded correction patterns from:

- current turn text
- current focus
- active constraints

If current evidence says the effective truth is:

- `use X, not Y`
- `把 Y 改为 X`
- similar bounded correction forms

then a durable-memory entry that still carries `Y` is suppressed from projection.

This is projection-time suppression, not destructive deletion.

### 2. Projection stays bounded

Suppressed entries are:

- still inspectable through diagnostics
- no longer eligible for projection in the current turn
- not treated as if they were merely below threshold

This preserves the distinction between:

- held back by limit
- below threshold
- suppressed because fresher evidence wins

### 3. Diagnostics tell the truth

`Durable memory diagnostics` now surfaces:

- aggregate `Conflict-suppressed cues: N`
- a strongest `Suppressed by fresher evidence: ...` line

That makes contradiction handling legible without turning SNC into a memory console.

## Why It Matters

Before this patch, SNC could rank multilingual and long-horizon cues better, but it still lacked a first-class way to step old memory aside when the user corrected it now.

That mattered most in:

- multilingual name corrections
- canon correction turns
- explicit wording repairs

This patch hardens the real trust contract:

- current evidence
- same-session continuity
- then durable memory

instead of letting durable memory continue to compete on equal footing after correction.

## Validation

Validated with:

- focused SNC validation
- dispatcher validation
- workspace typecheck

Current outcome:

- shaping focus: green
- continuity baseline: green
- dispatcher focused vitest: green
- workspace `tsc`: green

Additional regression coverage now includes:

- contradicted durable cue suppression
- multilingual correction wording feeding durable suppression

## Carry-Forward

This slice should be read together with:

- `research/220_snc_m3_long_horizon_memory_quality_v1.md`
- `research/254_snc_m3_durable_memory_operator_explainability_v1.md`
- `research/305_snc_m3_multilingual_entity_memory_stability_v1.md`

The next likely `M3` pressure is:

- richer same-session correction carry-forward
- explicit-read partial-coverage and recovery
- prompt-budget / section-ordering hardening
