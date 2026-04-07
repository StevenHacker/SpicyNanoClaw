# SNC M3 Evidence Truth And Budget Hardening V1

## Purpose

Close three review-exposed truth-surface bugs in M3 evidence mode:

1. old merged directives leaking into `Current-task support`
2. historical continuity support preferring older cues over newer ones
3. `Historical continuity support` being truncated early by the diagnostics group cap even when the overall prompt budget could still fit it

## Changes

### 1. Current-task support now reads from latest-turn user state

Files:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.test.ts`

Change:

- added latest-turn user extraction from `recentMessages`
- `buildSncEvidenceCurrentSupportSection(...)` no longer renders merged `storyLedger.userDirectives`
- evidence correction-pair extraction now also reads from the latest-turn directive lane instead of the merged directive ledger

Runtime effect:

- old directives no longer leak into the critical evidence lane just because they still live in the ledger window

### 2. Historical continuity support now prefers the newest cues

Files:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.test.ts`

Change:

- `collectEvidenceSecondaryContinuityCues(...)` now uses the newest continuity notes instead of the oldest retained notes

Runtime effect:

- evidence-mode secondary support is less stale
- bounded carry-forward now biases toward the freshest continuity residue

### 3. Historical continuity support is no longer pre-capped as diagnostics

Files:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.test.ts`

Change:

- removed `budgetGroup: "diagnostics"` from `Historical continuity support`

Runtime effect:

- it still remains `shrink-first`
- but it now competes in the global prompt-fit phase instead of being prematurely chopped by the diagnostics micro-budget

## Validation

Ran:

- targeted Vitest: `extensions/snc/src/session-state.test.ts` + `extensions/snc/src/engine.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_focus_v2.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_dispatcher.ps1`

Observed:

- targeted vitest: `31/31`
- shaping focus: `76/76`
- continuity baseline: `31/31`
- dispatcher focused vitest: `88/88`
- workspace `tsc`: pass

## Notes

This is not a feature-expansion slice. It is M3 truth-surface hardening.
