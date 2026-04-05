# Dispatch Cycle 003

## Mode

Focused implementation cycle under dispatcher control.

Shape:

- `2` bounded SNC implementation workers
- `1` acceptance/support worker
- `1` design/synthesis worker
- dispatcher thread owns integration, docs, and merge judgment

## Slot W1

Type:

- `implementation`

Theme:

- `SNC-07 Transcript Shaping Utility`

Write scope:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/transcript-shaping.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/transcript-shaping.test.ts`
- `research/64_snc_transcript_shaping_utility.md`

Objective:

- extract the first bounded transcript-shaping utility from current SNC engine heuristics into its own reusable module

Acceptance:

- do not wire hooks yet
- keep write scope bounded to new files
- tests required

## Slot W2

Type:

- `implementation`

Theme:

- `SNC-08 Replacement Ledger Utility`

Write scope:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/replacement-ledger.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/replacement-ledger.test.ts`
- `research/65_snc_replacement_ledger_utility.md`

Objective:

- build a plugin-owned replacement ledger utility that can later freeze shaping decisions across turns

Acceptance:

- no hook wiring yet
- bounded utility only
- tests required

## Slot W3

Type:

- `implementation/support`

Theme:

- `SNC-11 Acceptance / Benchmark Harness V2`

Write scope:

- `scripts/validate_snc_focus_v2.ps1`
- `research/68_snc_acceptance_matrix.md`

Objective:

- add a narrower acceptance gate focused on shaping/state continuity without replacing the existing dispatcher validation helper

Acceptance:

- companion helper only
- do not delete or replace existing validation scripts

## Slot W4

Type:

- `research/design`

Theme:

- `SYN-02 Hook Shaping Integration Spec`

Write scope:

- `research/70_snc_hook_shaping_spec.md`

Objective:

- turn the current migration frontier into a bounded integration spec for `before_message_write` and `tool_result_persist`

Inputs:

- `research/45_snc_hook_scaffold_v1.md`
- `research/49_cc01_agent_orchestration_donor.md`
- `research/51_cc02_harness_pressure_tool_exposure.md`
- `research/52_openclaw_cc_migration_matrix.md`
- current SNC source in `extensions/snc/src/*`

Acceptance:

- must stay implementation-facing
- must not broaden into durable memory
- must explicitly list integration order and no-go zones

## Dispatcher Acceptance Rules

1. Only dispatcher marks cycle outputs accepted.
2. Utility packets must remain bounded and not pre-merge into hook ownership.
3. Research/design packets must be directly useful for the next integration step.
4. Cycle 003 should leave external-thread research claims available wherever possible.

## Active Assignments

- `Einstein` (`019d56c0-f9e9-73d2-96d6-5d728f35cb16`) -> `SNC-07 Transcript Shaping Utility`
- `Boole` (`019d56c0-fa08-7871-a727-ac0241435073`) -> `SNC-08 Replacement Ledger Utility`
- `Franklin` (`019d56c0-fa1d-7980-87a1-17d63f6ae748`) -> `SNC-11 Acceptance / Benchmark Harness V2`
- `Kepler` (`019d56c0-fa2f-7a90-9f61-80717aa8f700`) -> `SYN-02 Hook Shaping Integration Spec`

## Acceptance Progress

- `SNC-07` accepted into `research/64_snc_transcript_shaping_utility.md`
- `SNC-08` accepted into `research/65_snc_replacement_ledger_utility.md`
- `SNC-11` accepted into `research/68_snc_acceptance_matrix.md`
- `SYN-02` accepted into `research/70_snc_hook_shaping_spec.md`

## Cycle Outcome

Cycle 003 is now closed as an accepted dispatcher cycle.

Accepted outputs:

- `research/64_snc_transcript_shaping_utility.md`
- `research/65_snc_replacement_ledger_utility.md`
- `research/68_snc_acceptance_matrix.md`
- `research/70_snc_hook_shaping_spec.md`

Validation status:

- `scripts/validate_snc_focus_v2.ps1` passed
- `scripts/validate_snc_dispatcher.ps1` passed

Dispatcher integration note:

- main-thread compatibility fixes were required to bring the worker outputs onto the current host baseline
- the next implementation frontier is now `SNC-09 Hook Shaping Integration`
- post-acceptance hardening found one real regression once `transcript-shaping.test.ts` was promoted into the focus gate:
  - tool-result replacement replay was not preserving the first formatted replacement for the same `toolCallId`
  - dispatcher fixed that by using stable tool-call lookup in `hook-scaffold.ts` and preserving newline-bearing previews in `replacement-ledger.ts`
  - focused SNC validation and dispatcher validation were rerun green after the fix
