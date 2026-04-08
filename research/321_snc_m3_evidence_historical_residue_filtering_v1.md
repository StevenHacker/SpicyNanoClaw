# SNC M3 Evidence Historical Residue Filtering V1

## Purpose

This round closes a truth-surface issue in `evidence-grounding` mode:

- pure process / checklist / completion residue could still leak into `Historical continuity support`
- duplicated assistant cues could consume budget twice when `latestAssistantPlan` and `continuityNotes` carried the same sentence

## What Changed

Updated files:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.test.ts`

## Runtime Effect

### 1. Evidence historical support is stricter now

`evidence-grounding` no longer keeps assistant residue just because it appears in:

- `latestAssistantPlan`
- `continuityNotes`

Pure process lines like checklist / completion / delivery residue are now removed unless they carry real continuity or evidence substance.

### 2. Legitimate continuity/evidence cues still survive

Assistant lines such as:

- verified state
- continuity facts
- evidence-bearing carry-forward

still remain available in `Historical continuity support`.

### 3. Duplicate cues are removed

If the same sentence appears in both:

- `latestAssistantPlan`
- `continuityNotes`

it now renders only once instead of consuming budget twice.

### 4. Secondary recent assistant messages do not re-echo the same cue

When an assistant cue is already preserved as a secondary continuity cue, the same assistant sentence is no longer repeated again in `Recent messages (secondary context)`.

## Validation

Validated with:

- targeted `session-state` vitest
- `scripts/validate_snc_focus_v2.ps1`
- `scripts/validate_snc_dispatcher.ps1`

Latest read after this fix:

- focused shaping: `79/79`
- continuity baseline: `37/37`
- dispatcher focused vitest: `97/97`
- workspace `tsc`: pass
