# External Thread Phase 9 Plan

## Purpose

Phase 9 is a worker/operator precision wave after accepting phase 8.

It exists to support the next main-thread pressure:

- `SNC-Milestone2-01` controller launch follow-up
- bounded worker/operator contract for `Milestone 2`

The goal is not to reopen broad source excavation.
The goal is to close the remaining high-value ambiguities around worker launch failure, follow-up/control transitions, and worker-facing outward contract.

## Packet Set

1. `45` `OC-20 Worker Launch Failure / Rejection Matrix`
2. `46` `OC-21 Worker Follow-Up / Yield / Control Transition Matrix`
3. `47` `CC-16 Delegation Failure / Partial-Result Salvage Matrix`
4. `48` `SYN-10 SNC Worker Operator Envelope`

## Why These Packets

### `45`

The controller launch lane is live, but the sharpest remaining host question is:

- what exact failure/rejection/error surfaces come back when helper launch does not cleanly succeed

This directly supports:

- operator-facing launch diagnostics
- retry vs abandon decisions
- more honest worker-state transitions

### `46`

Launch is only the first half.
The next host precision gap is:

- what `sessions_yield`, `sessions_send`, and `subagents` control actually mean by state
- which action is appropriate when a worker is queued, spawned, running, stuck, or done

This directly supports:

- controller follow-up
- bounded diagnostics wording
- avoiding wrong operator guidance

### `47`

Current CC donor knowledge is strong on ownership and memory control.
The next useful donor precision is:

- how CC handles worker failure
- how it preserves partial value
- when it retries, resumes, or simply stops

This directly supports:

- SNC worker diagnostics
- failure/result fold-back wording
- "do not thrash" worker policy

### `48`

Once `45-47` close, the next synthesis value is:

- what SNC should actually promise operators about helper workers
- what actions are safe to recommend
- what remains deferred

This is not a platform roadmap packet.
It is the bounded outward contract for SNC worker behavior in `Milestone 2`.

## Recommended Launch Order

1. `45`
2. `46`
3. `47`
4. `48`

## Best Bundles

- `45 + 46`
  - best OpenClaw worker/operator bundle

- `47 + 48`
  - best donor-plus-envelope bundle

Best kept solo:

- `45`
  - launch failure semantics are easiest to judge when not mixed with follow-up control

- `47`
  - donor failure/salvage value is easiest to judge without host packet blending

## Expected Progress Lift

These are planning estimates, not inflated scorekeeping.

### OpenClaw

Current read:

- SNC-relevant host understanding: about `99%`
- broader host/platform understanding: about `90%`

If `45 + 46` close well:

- SNC-relevant host understanding should stay about `99%`, but with much sharper operator/control precision
- broader host/platform understanding should move to about `91%`

Why not much higher:

- the remaining gains are now mostly precision and deployment realism, not broad missing host topology

### CC

Current read:

- SNC-relevant donor understanding: about `96%`
- broader repo/product understanding: about `86%`

If `47` closes well:

- SNC-relevant donor understanding should move to about `97%`
- broader repo/product understanding should move to about `87%`

Why not much higher:

- the remaining donor gains are now targeted worker-control nuance, not broad unexplored runtime

### Synthesis note

`48` should improve worker/operator clarity much more than raw source coverage.
It should be judged by whether the next SNC worker docs, diagnostics, and controller follow-up become sharper and more honest.

## Success Condition

Phase 9 is successful when:

1. SNC can describe failed helper launch without vague host guesses.
2. SNC can recommend the right bounded next action for queued/running/stuck workers.
3. donor logic for worker failure/partial-result handling is sharper than "copy CC worker feel."
4. `Milestone 2` gets one bounded worker operator contract instead of scattered notes across code and docs.
