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
- package and engine version were first aligned to `0.2.0`
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
- standalone clean-host rehearsal first moved to the `0.2.0` package line
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

- cross-session durable memory is now isolated by exact agent namespace by default
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
- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_v1.ps1`

Observed latest results:

- shaping focus: `88/88`
- continuity baseline: `41/41`
- dispatcher focused vitest: `107/107`
- workspace `tsc`: pass

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
- `research/322_snc_post_m3_style_overlay_v1.md`
- `research/323_snc_v1_0_0_release_line_and_post_v1_implementation_read.md`
- Post-`0.1.1` delta ledger:
  - `research/255_snc_post_0_1_1_change_ledger.md`
## Current Review Focus

This handoff now includes the post-`v1` style-overlay and agent-isolation slice.

### Primary runtime files

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/config.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/style-overlay.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`

### Primary test files

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/config.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/style-overlay.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.test.ts`

### Secondary type-only fallout fixes

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/helper-tools.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/hook-scaffold.test.ts`

### Review Questions

1. Does style activation stay correctly bounded to `writing-prose` turns?
2. Does any style residue leak into truth, evidence, memory, or worker surfaces?
3. Are built-in profile prompts concise enough to improve prose without dominating prompt budget?

### 11. Formal v1 release-line reset

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/package.json`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
- `scripts/validate_snc_clean_host_rehearsal.ps1`
- `scripts/validate_snc_milestone3.ps1`
- `scripts/validate_snc_v1.ps1`
- `README.md`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/README.md`

Main changes:

- formal user-facing package line moved from milestone numbering onto the `v1` semver line
- a formal `validate_snc_v1.ps1` entry point now exists for release validation
- stale active release artifacts `0.1.0` and `0.2.0` were removed from the release directory

### 12. v1 release-line CR fix: external profile desensitization contract

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/style-overlay.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/style-overlay.test.ts`
- `README.md`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/README.md`

Main changes:

- external style profiles now require the desensitized profile contract instead of loading as weak structure JSON
- raw-source profiles and profiles without valid prompt-field guardrails are rejected
- live prompt projection now obeys `copyright_guardrails.operational_prompt_fields` instead of assuming every parsed field is safe
- root/plugin README now explain external profile safety requirements, design intent, and post-`v1` TODO direction

### 13. Post-v1 style inspiration, exact agent isolation, and helper bounded lane

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/agent-scope.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/config.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/hook-scaffold.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/style-overlay.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-state.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/hook-scaffold.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/style-overlay.test.ts`

Main changes:

- style overlay now pulls more of its writing guidance from anti-AI-writing reference docs instead of only from abstract cleanliness rules
- style overlay adds explicit anti-quota / anti-checklist guidance so prose does not satisfy the overlay mechanically
- session state and worker state now persist under exact `sessionKey#sessionId` scope files, preventing sibling session summaries and compaction artifacts from colliding
- durable memory now defaults to exact agent-key isolation instead of broader family sharing
- helper sessions run in a bounded lane by default:
  - no style overlay
  - brief / ledger still available
  - broad packet fan-out suppressed by default
- worker hook seams now keep a host-compatible exact-scope index so OpenClaw events that only surface `sessionKey` can resolve against candidate exact scopes instead of silently following last-writer-wins alias behavior

### 14. Post-v1 peer-agent role truth and worker exact-scope disambiguation

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/agent-scope.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/agent-scope.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-state.test.ts`

Main changes:

- peer agent keys such as `agent:main:reviewer` no longer get downgraded into the helper lane just because they contain reviewer-like words
- helper scope now keys off explicit structural helper markers instead of free-form role words
- worker state compatibility no longer depends on a single `sessionKey -> latest exact scope` alias
- sessionKey-only worker tool-result and lifecycle updates now resolve against all candidate exact scopes and only mutate when there is a unique match
- this closes the main remaining same-agent, same-sessionKey fold-back contamination seam instead of masking it with latest-writer-wins behavior

### 15. v1.0.1 hook ambiguity regression coverage and release patch

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/hook-scaffold.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/package.json`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
- `scripts/validate_snc_clean_host_rehearsal.ps1`
- `scripts/validate_snc_milestone3.ps1`
- `README.md`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/README.md`

Main changes:

- hook-layer regression coverage now proves `tool_result_persist` does not guess a target when `sessions_spawn` or `sessions_send` arrives with only `sessionKey` and multiple exact scopes coexist
- the public release line is now patched to `v1.0.1`
- install and rehearsal docs now point at `openclaw-snc-1.0.1.tgz`
- the full release gate was rerun green on the `v1.0.1` package line

### Current CR Focus

1. exact agent-scope isolation correctness
2. worker exact-scope disambiguation safety
3. helper bounded-lane behavior
4. style overlay “human texture” guidance remaining prompt-safe and non-mechanical

Also keep checking:

1. external profile rejection correctness
2. prompt-safe field projection correctness
3. README accuracy for OpenClaw usage and release-line truth
