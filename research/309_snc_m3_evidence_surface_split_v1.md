# SNC M3 Evidence Surface Split V1

## Purpose

Make `Milestone 3` evidence-first turns more honest by separating:

- current-turn support
- historical continuity support

instead of letting both appear through a single prompt-facing session snapshot.

## Scope

Files touched:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.test.ts`
- `tmp/codex-snc-review/snc-m3-issue-tracker.md`

## What Landed

### 1. Evidence turns no longer flatten support lanes into one session snapshot

When `task-posture` resolves to `evidence-grounding`, SNC now emits two different context sections:

- `Current-task support`
- `Historical continuity support`

The split is intentional.
It lets the model see which cues belong to the current task versus which cues are only bounded historical support.

### 2. Current-task support is now the critical lane

`Current-task support` carries:

- current evidence-grounding instructions
- current user directives
- current focus
- latest user directive
- active constraints

It also now says more plainly:

- current materials and current-turn wording outrank continuity
- partial coverage must be admitted explicitly
- old continuity must not imply that direct inspection already happened

### 3. Historical continuity support is now secondary by construction

`Historical continuity support` carries only bounded historical aids:

- secondary continuity cues
- auto-compaction summary
- recent messages as secondary context

It is now budgeted as a shrink-first lane in evidence mode.
So under pressure, SNC preserves the current evidence lane first and lets the old continuity lane disappear first.

### 4. Review tracking is now aligned with the landed fixes

The M3 reviewer issue tracker now marks:

- `SNC-M3-001`
- `SNC-M3-002`
- `SNC-M3-003`
- `SNC-M3-004`
- `SNC-M3-005`

as `Fixed Pending Verify`, with the validating commands recorded directly in the tracker.

## Validation

Validated with:

- targeted vitest:
  - `extensions/snc/src/session-state.test.ts`
  - `extensions/snc/src/engine.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_focus_v2.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_dispatcher.ps1`

Observed results:

- targeted vitest: `29/29`
- shaping focus: `75/75`
- continuity baseline: `27/27`
- dispatcher focused vitest: `85/85`
- workspace `tsc`: pass

## SNC Relevance

This slice matters because it turns evidence-first from:

- "prompt wording that says continuity is secondary"

into:

- "prompt structure that actually makes continuity secondary"

That directly supports the next remaining M3 quality targets:

1. explicit-read partial coverage recovery
2. multilingual entity correction / suppression
3. operator-visible memory truth

## Next Best Follow-Up

The next highest-value cuts after this split are:

1. multilingual entity correction / suppression / carry-forward
2. stronger explicit-read partial coverage recovery
3. long-horizon memory inspect / operator truth closeout
