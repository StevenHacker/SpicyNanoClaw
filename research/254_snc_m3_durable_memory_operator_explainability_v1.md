# SNC M3 Durable-Memory Operator Explainability V1

## Purpose

Land the first bounded `Milestone 3` explainability slice for durable memory without expanding SNC into a dashboard or a full inspect platform.

## What Changed

The durable-memory diagnostics lane now carries bounded explanation detail instead of only aggregate counters.

Code landed in:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.test.ts`

## New Runtime Behavior

### 1. Projected durable cues now explain why they appeared

When SNC emits `Durable memory diagnostics`, it now includes a bounded `Projected cue reasons:` block.

That block explains projected cues using compact reasons such as:

- explicit-user directive / constraint
- confirmed across turns
- matches current turn
- matches current focus
- matches active constraints
- tag overlap

### 2. Saturation is now more legible

If the projection lane is saturated by the current limit, diagnostics now also show the strongest cue that was held back by the limit.

This gives operators and testers a cleaner answer to:

- why did this cue not appear
- was the lane empty, or just capped

### 3. Empty projection is now more honest

If no cue clears the current threshold, diagnostics now show the closest miss rather than only saying that nothing qualified.

That makes "no projection" easier to distinguish between:

- correctly suppressed weak memory
- stale memory
- memory that simply did not match the current turn strongly enough

## Why This Matters

This slice improves three things at once:

1. operator trust
   - projected memory is easier to justify
2. testability
   - validation now has clearer artifact truth for memory behavior
3. M3 discipline
   - SNC gets more legible without pretending to expose a full scoring debugger

## Boundaries Kept

This slice deliberately does **not** expose:

- the full scoring formula
- every per-entry ranking trace
- a new dashboard or UI
- host-level doctor extensions

The goal is bounded product truth, not internal-score voyeurism.

## Validation

Primary validation:

- `durable-memory.test.ts`
- `engine.test.ts`
- milestone/focus/dispatcher gates after code landing

## SNC Relevance

This is the first real `Milestone 3` operator-explainability landing for memory.
It directly supports:

- `Milestone 3` trust surfaces
- regression debugging
- future cross-session memory ranking work
