# SNC Compaction v1

## Current Decision

SNC v1 should not take ownership of OpenClaw compaction.

The current bounded approach is:

- keep `ownsCompaction: false`
- keep delegating to `delegateCompactionToRuntime(...)`
- inject SNC-aware `customInstructions` based on persisted session state

This lets SNC influence what the host preserves during compaction without replacing the host algorithm.

## Why This Is The Right v1 Shape

1. It preserves the host-first rule.
   - OpenClaw internals stay untouched.
   - SNC remains a context-engine-led enhancement rather than a compaction fork.

2. It uses the strongest public seam that already exists.
   - `customInstructions` is forwarded by the delegate path.
   - `compactionTarget` is not reliably honored on the delegate path.

3. It reuses SNC's strongest artifact.
   - `session-state` already carries:
     - `focus`
     - `latestUserDirective`
     - `latestAssistantPlan`
     - `constraints`
     - `continuityNotes`

4. It keeps responsibilities separated.
   - `assemble()` injects state into model-visible context
   - `maintain()` does narrow transcript hygiene
   - `compact()` now biases host compaction summaries toward writing anchors

## Landed v1 Slice

In the working host copy:

- `extensions/snc/src/engine.ts`
  - `compact()` now loads SNC session state
  - synthesizes SNC-aware compaction guidance
  - merges it with incoming `customInstructions`
  - delegates to the host runtime

- `extensions/snc/src/engine.test.ts`
  - verifies delegated compaction receives SNC-aware instructions

## What SNC Preserves During Compaction

The current instruction layer explicitly asks the host summary to preserve:

- current focus
- latest user directive
- latest assistant plan
- active constraints
- recent continuity anchors

This is the right first cut for writing continuity because it protects active intent rather than trying to preserve every detail.

## Known Limits

1. SNC still does not own compaction target semantics.
   - `compactionTarget` remains ignored by the delegate path.

2. Timeout and overflow lifecycles are still asymmetric.
   - post-compaction maintenance timing is not identical across branches.

3. SNC currently influences compaction input more than compaction output.
   - it biases summary formation
   - it does not yet post-process compaction results into a stronger structured artifact

## Likely Next Questions

1. Should SNC consume compaction result metadata more actively after delegation?
2. Should continuity anchors be prioritized differently from style constraints?
3. Is there enough gain from instruction shaping alone, or does a later phase need deeper ownership?
