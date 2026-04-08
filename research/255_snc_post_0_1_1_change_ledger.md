# SNC Post-0.1.1 Change Ledger

## Purpose

Track the SNC changes that landed **after** the currently tested `0.1.1` line so validation and development do not get conflated.

This file is the canonical reminder for:

- what changed after `0.1.1`
- what the test team has **not** validated yet
- which changes belong to `Milestone 3`

## Base Line Still Under Test

- package line under active external testing: `0.1.1`
- baseline patch record:
  - `research/182_snc_0_1_1_bilingual_meta_and_docs_patch.md`
- formal validation archive:
  - `tmp/snc-validation/archive/2026-04-05-snc-0.1.1-package-validation.md`
- comparison history ledger:
  - `tmp/snc-validation/archive/validation-history.json`
- full arena comparison anchor:
  - `tmp/openclaw-arena/results/20260405-201456-snc-0.1.1-full-arena/arena-summary.md`

## Official 0.1.1 Validation Read

The `0.1.1` line should now be treated as a frozen external-test baseline.

Current baseline read:

- package validation archive exists
- history ledger exists
- arena comparison anchor exists

Operationally this means future SNC iterations can be compared directly against:

- packaged `0.1.1` behavior
- `0.1.1` arena suite deltas
- `0.1.1` pressure and effect probes

## Changes Landed After 0.1.1

### 1. M3 explicit-read / evidence-grounding posture

Record:

- `research/219_snc_m3_explicit_read_evidence_grounding_v1.md`

Runtime effect:

- explicit read / inspect / compare / list tasks now switch to evidence-first posture
- continuity state becomes secondary support in those turns
- durable-memory projection becomes more conservative on evidence-first turns

### 2. M3 long-horizon memory quality v1

Record:

- `research/220_snc_m3_long_horizon_memory_quality_v1.md`

Runtime effect:

- transient operational cues are suppressed across durable-memory harvest, persist, and projection
- mixed operational auto-compaction summaries no longer promote into cross-session durable memory
- old transient durable entries are removed on later writes

### 3. M3 durable-memory operator explainability v1

Record:

- `research/254_snc_m3_durable_memory_operator_explainability_v1.md`

Runtime effect:

- durable-memory diagnostics now show bounded reasons for projected cues
- diagnostics now show the strongest held-back cue when projection saturates
- diagnostics now show the closest miss when no cue clears the threshold

### 4. M3 writing output discipline and evidence-honesty v1

Record:

- `research/304_snc_m3_writing_output_discipline_v1.md`

Runtime effect:

- direct prose-drafting turns now get a dedicated writing-output discipline section
- direct drafting turns now demote assistant-plan state into a secondary cue instead of a primary active-state field
- evidence-first posture now explicitly requires honest disclosure of uncovered requested items

### 5. M3 multilingual entity memory stability v1

Record:

- `research/305_snc_m3_multilingual_entity_memory_stability_v1.md`

Runtime effect:

- session continuity keys now use Unicode normalization for dedupe
- durable-memory overlap now supports mixed-script and Han-character matching instead of staying ASCII-only
- visible transcript surface text remains readable while internal multilingual dedupe gets stronger

### 6. M3 long-horizon memory conflict suppression v1

Record:

- `research/306_snc_m3_long_horizon_memory_conflict_suppression_v1.md`

Runtime effect:

- contradicted durable cues can now be suppressed at projection time when fresher evidence explicitly corrects them
- suppression now stays separate from low-score misses and limit pressure
- durable-memory diagnostics now surface bounded conflict-suppression truth

### 7. M3 prompt-budget / section-ordering hardening v1

Record:

- `research/307_snc_m3_prompt_budget_section_ordering_v1.md`

Runtime effect:

- SNC context sections now have explicit budget priority classes and shrink groups
- packet-dir residue and diagnostics now shrink before higher-trust posture / session-state anchors
- truthful `SNC budget notes` can surface when optional context is trimmed
- UTF-8 truncation now respects the requested byte budget, preventing non-converging prompt-budget loops

### 8. M3 posture and guardrail hardening v1

Record:

- `research/308_snc_m3_posture_and_guardrail_hardening_v1.md`

Runtime effect:

- current-turn requests now outrank stale history for evidence and writing-mode detection
- stale evidence / outline requests no longer stick as easily into later turns
- evidence-grounding snapshots no longer expose `latestAssistantPlan:` as a top-level active-state field
- durable-memory correction suppression now keeps guardrails that prohibit the rejected alias

### 9. M3 evidence surface split v1

Record:

- `research/309_snc_m3_evidence_surface_split_v1.md`

Runtime effect:

- evidence-grounding turns now separate `Current-task support` from `Historical continuity support`
- current evidence cues and constraints now occupy the higher-trust lane
- historical continuity support now shrinks first under prompt pressure instead of competing as a flat session snapshot
- partial-coverage honesty is now reinforced by prompt structure, not only by wording

### 10. M3 multilingual correction carry-forward v1

Record:

- `research/311_snc_m3_multilingual_correction_carry_forward_v1.md`

Runtime effect:

- correction-supporting durable cues now get explicit ranking help
- evidence-mode historical support now filters stale rejected aliases while preserving correction guardrails
- recent-message carry-forward now follows the same correction-aware filtering for multilingual correction cases

### 11. M3 evidence truth and budget hardening v1

Record:

- `research/312_snc_m3_evidence_truth_and_budget_hardening_v1.md`

Runtime effect:

- `Current-task support` no longer renders merged historical directives as if they were current-turn support
- evidence-mode historical continuity now prefers the newest retained continuity cues instead of the oldest ones
- `Historical continuity support` remains shrink-first, but no longer gets prematurely truncated by the diagnostics group cap when the total prompt budget still has room

### 12. M3 writing prompt-surface suppression v1

Record:

- `research/313_snc_m3_release_candidate.md`

Runtime effect:

- writing-draft prompt surfaces now suppress report-style assistant residue instead of carrying it into direct drafting turns
- direct drafting wording now explicitly forbids status-report / handoff / checklist language in the draft itself
- evidence-first wording now explicitly calls out missing or inaccessible materials before partial-coverage fallback

### 13. M3 closeout gate and `0.2.0` candidate line

Record:

- `research/313_snc_m3_release_candidate.md`

Runtime effect:

- SNC now has a canonical `Milestone 3` validation gate at `scripts/validate_snc_milestone3.ps1`
- the current `M3` candidate package line is `data/releases/snc/openclaw-snc-0.2.0.tgz`
- root/plugin README install and validation instructions now point at the `0.2.0` / `M3` line instead of the `0.1.1` / `M2` line

### 14. M3 RC latestness and clean-host hardening v1

Record:

- `research/316_snc_m3_rc_latestness_and_clean_host_hardening_v1.md`

Runtime effect:

- same-turn latest user corrections now override earlier same-turn evidence / outline residue when posture and output discipline are resolved
- evidence historical support no longer over-prunes legitimate assistant continuity cues outside `writing-prose`
- standalone clean-host rehearsal now defaults to the `0.2.0` package line and no longer dies on a missing `config-file.stdout.txt` artifact

### 15. M3 agent-scoped durable-memory isolation and branch intake

Record:

- `research/319_snc_m3_agent_scoped_durable_memory_and_branch_intake.md`

Runtime effect:

- cross-session durable memory is now agent-family-scoped by default instead of sharing one flat catalog per `stateDir`
- operators can still opt into a shared durable-memory pool with `memoryNamespace`
- session continuity and worker state remain session-scoped, so the main remaining cross-agent contamination risk is now closed by default
- colleague branch intake was completed as a design read only; no early SNC runtime from that branch was merged into the current `M3` line

### 16. M3 evidence historical residue filtering v1

Record:

- `research/321_snc_m3_evidence_historical_residue_filtering_v1.md`

Runtime effect:

- `evidence-grounding` historical support no longer keeps pure process / checklist / completion residue just because it appears in `latestAssistantPlan` or `continuityNotes`
- legitimate continuity / evidence assistant cues still survive in historical support
- duplicated assistant cues no longer render twice when `latestAssistantPlan` and `continuityNotes` carry the same sentence
- assistant recent-message echoes that duplicate preserved secondary continuity cues are now suppressed to save budget and keep the truth surface cleaner

## What This Means Operationally

If the tester is still validating `0.1.1`, those runs do **not** yet cover:

- evidence-first posture
- M3 durable-memory trust tightening
- M3 durable-memory explainability improvements
- M3 writing-output discipline and partial-coverage honesty wording
- M3 multilingual entity memory stability improvements
- M3 long-horizon memory conflict-suppression behavior
- M3 prompt-budget / section-ordering hardening behavior

If a future package is produced, this ledger should be read together with the archived `0.1.1` validation record so we can separate:

- already-proven baseline gains
- new post-`0.1.1` gains
- regressions introduced after `0.1.1`

## Next Update Rule

Any new SNC behavior landed before the next packaged release should be appended here so:

- testing knows what changed after the frozen package line
- release notes do not need to reconstruct the delta from memory
