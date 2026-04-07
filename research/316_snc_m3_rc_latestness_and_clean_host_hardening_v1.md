# SNC M3 RC Latestness And Clean-Host Hardening V1

## Purpose

Close the remaining M3 RC issues around:

- same-turn latestness
- evidence historical support over-filtering
- standalone clean-host rehearsal reproducibility

## Changes

### 1. Same-turn latestness now respects the latest user correction

Files:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/task-posture.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/task-posture.test.ts`

What changed:

- same-turn user messages no longer always use max-over-window scoring
- if the latest same-turn user message is an explicit override, a strong evidence request, or a stronger direct-drafting request, posture detection now treats that latest message as authoritative
- this closes the RC cases where an earlier read/outline request still overrode a later same-turn prose correction

### 2. Evidence historical support no longer over-filters report-style continuity cues

Files:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.test.ts`

What changed:

- prompt-facing assistant report-style suppression is now limited to `writing-prose`
- evidence-grounding historical support can retain legitimate assistant continuity/evidence cues again
- this closes the RC case where a useful cue such as `Verified the missing-ring clue remains visible in chapter three.` disappeared entirely

### 3. Standalone clean-host rehearsal now defaults to the M3 package line and survives missing stdout artifacts

Files:

- `scripts/validate_snc_clean_host_rehearsal.ps1`

What changed:

- default package path now points to `data/releases/snc/openclaw-snc-0.2.0.tgz`
- missing `config-file.stdout.txt` no longer crashes the clean-host validation path
- when the stdout artifact is absent or empty, the script now falls back to the known config path and writes the artifact explicitly

## Verification

Validated with:

- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_focus_v2.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_dispatcher.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_clean_host_rehearsal.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_milestone3.ps1`

Observed results:

- shaping focus: `78/78`
- continuity baseline: `34/34`
- dispatcher focused vitest: `93/93`
- workspace `tsc`: pass
- standalone clean-host rehearsal: pass
- full `Milestone 3` gate: pass

## Outcome

These fixes remove the last RC issues that were still blocking a trustworthy M3 closeout:

- latest-turn corrections now beat stale same-turn residue
- evidence support is more truthful without becoming over-pruned
- the clean-host gate is reproducible both as part of `validate_snc_milestone3.ps1` and when run standalone
