# SNC M3 Current Review Handoff

## Scope

This handoff covers the current local SNC development line only.

Working tree root:

- `C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1\extensions\snc`

Do **not** review unrelated workspace changes outside the SNC paths below.

## Highest-Priority Code Review Areas

### 1. Task posture and output discipline

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/task-posture.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/task-posture.test.ts`

Main changes:

- current-turn user text now outranks stale history for posture detection
- stale evidence / stale outline contamination should be reduced
- Chinese posture regexes were corrected to real UTF-8 strings

### 2. Evidence-mode prompt truth and support splitting

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.test.ts`

Main changes:

- evidence-grounding mode no longer exposes `latestAssistantPlan:` as a top-level active-state field
- evidence mode now splits prompt-facing support into:
  - `Current-task support`
  - `Historical continuity support`
- historical continuity is now shrink-first under prompt pressure
- current-task support now reads from latest-turn user support instead of merged directive ledger
- historical continuity support now prefers newest continuity notes
- historical continuity support is no longer pre-capped by the diagnostics group budget

### 3. Durable-memory correction and explainability

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.test.ts`

Main changes:

- correction suppression now preserves guardrails like `Do not write Sera`
- Unicode / Han overlap and conflict suppression logic have expanded
- correction-supporting preferred-form cues now get explicit ranking help
- durable-memory diagnostics now expose more projection and suppression truth

### 4. Evidence historical support and multilingual carry-forward

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.test.ts`

Main changes:

- evidence historical support now filters stale rejected aliases
- correction guardrails are preserved instead of being erased with the stale wrong form
- recent secondary messages now follow the same correction-aware filtering

### 5. Transcript shaping bilingual fixes

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/transcript-shaping.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/transcript-shaping.test.ts`

Main changes:

- Chinese shaping cues were repaired and expanded
- shared shaping utility is now more central to evidence / maintenance behavior

### 6. Writing-draft prompt-surface suppression and M3 release line

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/task-posture.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/package.json`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/README.md`
- `README.md`
- `scripts/validate_snc_milestone3.ps1`

Main changes:

- writing-draft prompt surfaces now suppress report-style assistant residue
- direct drafting wording now explicitly forbids status-report / handoff / checklist language
- package and engine version are now aligned to `0.2.0`
- `Milestone 3` now has one canonical closeout gate

### 7. Same-turn latestness, evidence historical support, and clean-host reproducibility

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/task-posture.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/task-posture.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.test.ts`
- `scripts/validate_snc_clean_host_rehearsal.ps1`

Main changes:

- same-turn user corrections now outrank earlier same-turn evidence / outline residue when the newest message is clearly authoritative
- evidence historical support no longer suppresses legitimate assistant continuity cues outside `writing-prose`
- standalone clean-host rehearsal now defaults to the `0.2.0` package line
- missing `config-file.stdout.txt` no longer breaks the clean-host gate

### 8. Agent-scoped durable-memory isolation

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/config.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/README.md`
- `README.md`

Main changes:

- cross-session durable memory is now isolated by agent-family namespace by default
- session continuity and worker state were already session-scoped; this round closes the remaining shared-catalog contamination path
- explicit shared durable pools now require `memoryNamespace`
- continuity tests were updated to assert namespace-aware behavior instead of the old flat-catalog assumption

### 9. Evidence historical residue filtering and dedupe

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.test.ts`

Main changes:

- `evidence-grounding` now drops pure process/checklist/completion residue from historical assistant support instead of letting it sneak in through `continuityNotes`
- legitimate evidence/continuity assistant cues still survive in historical support
- duplicate assistant cues no longer render twice when `latestAssistantPlan` and `continuityNotes` carry the same sentence
- assistant recent-message echoes that duplicate preserved secondary cues are filtered out

## Review Intent

The current review should prioritize:

1. regression risk
2. stale-state leakage
3. truth-surface honesty
4. multilingual handling correctness
5. prompt-budget side effects

Not the docs first.

## Validation Status

Current local validation already run:

- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_focus_v2.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_dispatcher.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_milestone3.ps1`

Observed latest results:

- shaping focus: `79/79`
- continuity baseline: `37/37`
- dispatcher focused vitest: `97/97`
- workspace `tsc`: pass
- standalone clean-host rehearsal: pass
- `Milestone 3` gate: pass

## Coordination Notes

- Reviewer tracker:
  - `tmp/codex-snc-review/snc-m3-issue-tracker.md`
- Current landed-dev notes:
- `research/308_snc_m3_posture_and_guardrail_hardening_v1.md`
- `research/309_snc_m3_evidence_surface_split_v1.md`
- `research/312_snc_m3_evidence_truth_and_budget_hardening_v1.md`
- `research/313_snc_m3_release_candidate.md`
- `research/316_snc_m3_rc_latestness_and_clean_host_hardening_v1.md`
- `research/319_snc_m3_agent_scoped_durable_memory_and_branch_intake.md`
- `research/321_snc_m3_evidence_historical_residue_filtering_v1.md`
- Post-`0.1.1` delta ledger:
  - `research/255_snc_post_0_1_1_change_ledger.md`
