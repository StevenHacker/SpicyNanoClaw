# SNC Worker Runtime Wiring V1

## Purpose

This round turns the earlier worker-execution scaffold into a real SNC runtime slice.

The goal was still bounded:

- do not introduce a scheduler
- do not register new runtime tools
- do not claim persistent worker sessions

The actual target was narrower:

- persist SNC-owned worker controller state
- fold pushed completion events into that state during `engine.afterTurn(...)`
- project a bounded worker-controller section back during `assemble(...)`

## What Landed

New code:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-state.test.ts`

Updated code:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.test.ts`
- `scripts/validate_snc_focus_v2.ps1`
- `scripts/validate_snc_dispatcher.ps1`

## Runtime Behavior

### 1. SNC now has a plugin-owned worker state layer

`worker-state.ts` persists a bounded controller-side record under `stateDir/workers`.

It keeps:

- controller worker records
- recent fold-back summaries/actions
- consumed completion-event keys for replay safety

This follows the earlier design rule:

- keep worker policy pure
- add a separate SNC-owned persistence layer beside session state

### 2. pushed worker completion is now live inside `afterTurn(...)`

`engine.afterTurn(...)` now calls `applySncWorkerCompletionEvents(...)` on the new-turn message window.

That path:

- parses host completion-event text from new messages
- matches events by `childSessionKey`
- converts the event into `SncWorkerResult`
- records the result into persisted controller state
- derives controller fold-back notes/actions
- dedupes replayed events

So the worker-execution slice is no longer just:

- launch-plan building
- result parsing in isolation

It now has a real runtime fold-back path.

### 3. worker results are now visible to later turns

`engine.assemble(...)` now loads worker state and projects a bounded `Worker controller` section.

That section intentionally stays compact:

- controller summary
- live worker records
- recent fold-back summaries
- a few controller notes/actions

This gives SNC a reusable worker-result memory surface without forcing it into durable memory or transcript shaping.

## Boundary Kept

This is still not a full orchestration runtime.

Still deferred:

- automatic spawning from controller policy
- hook-based `subagent_spawned` / `subagent_ended` bookkeeping
- persistent/session-mode workers
- `sessions_send` follow-up loops
- helper-tool exposure
- generalized worker dashboard or scheduler ownership

So the correct status is:

- worker scaffold: landed
- worker runtime fold-back: landed
- full multi-worker runtime: still deferred

## Validation

Direct validation:

- `pnpm exec vitest run extensions/snc/src/worker-state.test.ts extensions/snc/src/engine.test.ts`
- `11/11` passed

Focused validation:

- `scripts/validate_snc_focus_v2.ps1`
- shaping/worker tests: `36/36`
- continuity baseline: `12/12`

Dispatcher validation:

- `scripts/validate_snc_dispatcher.ps1`
- focused vitest: `24/24`
- workspace typecheck passed with `8 GB` heap

## Practical Read

This round is enough to say SNC now has a real first worker lane in product code:

- host completion event arrives
- SNC consumes it
- SNC persists controller interpretation
- later turns can see the result

That is a meaningful milestone because it moves worker support from "prepared substrate" to "live bounded runtime use".
