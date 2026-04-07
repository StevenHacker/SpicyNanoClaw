# SNC M3 Writing Output Discipline V1

## Purpose

Land a bounded `Milestone 3` slice that improves direct-drafting behavior without expanding SNC into a style platform.

This slice is driven by the `0.1.1` multimodel retest signal:

- SNC still has real writing gains
- some models still leak process language, outline posture, or cross-language preambles
- the next useful fix is to make direct drafting turns cleaner, not to grow memory again

## What Landed

The runtime now distinguishes between:

- ordinary SNC continuity turns
- evidence-first turns
- direct writing-output turns

When a turn reads like direct prose drafting in writing mode:

- SNC emits a dedicated `Writing output discipline` section
- the intro framing now tells the model to deliver clean prose first
- the `Session snapshot` shifts into `Writing-draft mode`
- the latest assistant plan is no longer projected as a primary active-state field
- the latest assistant plan is demoted to a secondary cue instead of a front-facing plan anchor

## Why It Matters

This improves the exact failure shape seen in multimodel retest:

- reduce outline/process leakage in prose turns
- reduce meta preambles before story text
- avoid letting SNC's own assistant-plan state accidentally invite more planning chatter

It is intentionally bounded:

- no host changes
- no new worker behavior
- no larger memory surface

## Evidence-First Honesty Follow-Up

This patch also tightens the evidence-first wording:

- evidence-first posture now explicitly tells the model to say what remains uncovered when it cannot inspect everything requested

This keeps `Milestone 3` aligned with explicit-read honesty instead of only reading-order control.

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

## Carry-Forward

This should be read together with:

- `research/219_snc_m3_explicit_read_evidence_grounding_v1.md`
- `research/220_snc_m3_long_horizon_memory_quality_v1.md`
- `research/254_snc_m3_durable_memory_operator_explainability_v1.md`

The next bounded `Milestone 3` pressure is still:

- explicit-read failure / partial-coverage handling
- multilingual entity integrity
- long-horizon memory conflict and explainability follow-up
