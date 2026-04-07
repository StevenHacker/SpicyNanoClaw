# SNC M3 Multilingual Correction Carry-Forward V1

## Purpose

Strengthen `Milestone 3` multilingual continuity by making corrected entity forms easier to carry forward while forcing stale wrong forms further into the background.

This slice stays bounded:

- no alias platform
- no entity graph
- no new host ownership

## Scope

Files touched:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.test.ts`

## What Landed

### 1. Correction-supporting durable cues now get real ranking help

Durable-memory ranking no longer only knows how to suppress the wrong old form.

It now also boosts entries that reinforce the currently preferred corrected form, for example:

- `Use 林砚, not 林燕`
- older durable cue: `Keep 林砚 consistent`

That means current correction can now actively pull the right cue upward, instead of only pushing the wrong cue downward.

### 2. Evidence-mode historical support is now correction-aware

`Historical continuity support` no longer blindly replays older continuity residue.

When current support contains a live correction pair:

- stale secondary cues that only reinforce the rejected form are filtered out
- correction guardrails such as `Do not write 林燕 ...` are preserved
- correction-supporting cues are sorted ahead of weaker historical residue

This makes evidence-first turns structurally safer for multilingual continuity.

### 3. Recent secondary messages also honor current correction

Secondary recent-message carry-forward now follows the same bounded correction-aware filtering.

That reduces the chance that stale assistant wording with the rejected alias leaks back into the visible prompt surface on the very next turn.

## Validation

Validated with:

- targeted vitest:
  - `extensions/snc/src/session-state.test.ts`
  - `extensions/snc/src/durable-memory.test.ts`
  - `extensions/snc/src/engine.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_focus_v2.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_dispatcher.ps1`

Observed results:

- targeted vitest: `42/42`
- shaping focus: `76/76`
- continuity baseline: `30/30`
- dispatcher focused vitest: `87/87`
- workspace `tsc`: pass

## SNC Relevance

This slice pushes `M3-03` from:

- "mixed-script text matches a little better"

to:

- "fresh multilingual correction changes what SNC keeps visible and what it lets fall behind"

That is a much more meaningful quality step for longform and mixed assistant work.

## Next Best Follow-Up

The best next moves after this slice are:

1. explicit-read partial-coverage recovery and honest fallback
2. memory/operator inspect truth for suppressed versus held-back cues
3. final `M3` evaluation closeout against the frozen `0.1.1` package line
