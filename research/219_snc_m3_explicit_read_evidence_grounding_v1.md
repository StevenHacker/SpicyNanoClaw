# SNC Milestone 3 - Explicit-Read And Evidence-Grounding V1

## Purpose

Land the first bounded `Milestone 3` slice aimed at the clearest remaining assistant-mode weakness:

- SNC is stronger than baseline overall
- but it can still overvalue continuity framing on explicit read / inspect / list tasks

This slice makes that posture explicit inside the plugin without reopening architecture or host ownership.

## What Landed

New helper:

- `extensions/snc/src/task-posture.ts`

Updated runtime integration:

- `extensions/snc/src/engine.ts`
- `extensions/snc/src/session-state.ts`

New focused tests:

- `extensions/snc/src/task-posture.test.ts`
- expanded `extensions/snc/src/engine.test.ts`

Updated validation scripts:

- `scripts/validate_snc_focus_v2.ps1`
- `scripts/validate_snc_dispatcher.ps1`

## Runtime Shape

### 1. SNC now detects an evidence-grounding posture

The new helper classifies recent user intent into:

- `continuity`
- `evidence-grounding`

The current bounded trigger is:

- explicit read/review/inspect/list/compare style language
- plus evidence/material/file/workspace cues

This keeps the trigger narrow and pragmatic.

### 2. Evidence-grounding changes prompt behavior

When the current turn is evidence-first:

- the intro becomes evidence-first instead of continuity-first
- a `Task posture` section is added
- the session snapshot switches into `Evidence-grounding mode`
- assistant-plan content is no longer surfaced as a top-level prompt-visible lane for that turn
- continuity cues remain available, but as secondary support

### 3. Durable-memory projection is now demoted for evidence-first turns

This slice does not disable durable memory.
It just makes it more conservative for explicit read tasks by:

- tightening the projection limit
- raising the minimum projection score

This preserves continuity support without letting old cues compete too easily with current materials.

## Why This Matters

This is the first `Milestone 3` code slice that directly targets the biggest honest weakness exposed by external testing:

- SNC is strong at continuity
- but still needs to be better at explicit evidence-grounded work

The point is not to make SNC less stateful.
The point is to make it better at knowing when state should be secondary.

## What This Does Not Yet Solve

This slice does **not** yet claim:

- perfect explicit-read behavior
- stronger long-horizon memory quality on its own
- multilingual entity stability
- a new host/operator surface

Those remain later `Milestone 3` tracks.

## Validation

Targeted validation is expected through:

- `extensions/snc/src/task-posture.test.ts`
- `extensions/snc/src/engine.test.ts`
- `scripts/validate_snc_focus_v2.ps1`
- `scripts/validate_snc_dispatcher.ps1`

## Strategic Read

This slice is deliberately small but important.

It shifts SNC one step away from:

- "continuity always helps"

and closer to:

- "continuity should know when to get out of the way"
