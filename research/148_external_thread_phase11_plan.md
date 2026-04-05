# External Thread Phase 11 Plan

## Purpose

Phase 11 is a narrow `Milestone 2` admission wave after accepting phase 10.

It exists to support the last likely main-thread pressure:

- worker follow-up closeout
- operator-safe recovery and cleanup wording
- final `Milestone 2` admission judgment

The goal is not to reopen broad source excavation.
The goal is to close the remaining high-value ambiguities around:

- late reply visibility after accepted follow-up
- stale worker/session inspection and cleanup truth
- resume versus restart wording boundary
- one bounded admission envelope for `Milestone 2`

## Packet Set

1. `53` `OC-24 Worker Late-Reply / Announce Visibility Matrix`
2. `54` `OC-25 Worker Inspection / Stale-State Cleanup Matrix`
3. `55` `CC-18 Resume Outcome Communication / Restart Boundary Matrix`
4. `56` `SYN-12 SNC Milestone 2 Admission Envelope`

## Why These Packets

### `53`

Phase 10 proved what `sessions_send` proves synchronously.
The next missing host precision is:

- what later announce or relay work can make visible
- how to talk about "reply may arrive later" without overstating delivery
- when there is still a meaningful difference between accepted follow-up and later visible reply

This directly supports:

- operator wording
- worker follow-up docs
- any final controller follow-up closeout

### `54`

Phase 10 also proved inspect-first recovery.
The next missing host precision is:

- when stale local worker records should be retained, cleared, or rechecked
- which public seams are authoritative when local SNC worker memory and current host truth diverge
- how to talk about timed-out, cleaned-up, or no-longer-visible worker state without guessing

This directly supports:

- worker-state hygiene
- operator recovery guidance
- bounded cleanup rules

### `55`

Phase 10 donor evidence proved sanitize-before-re-entry.
The next donor precision is:

- how CC distinguishes resume, restart, continue, and partial-result carry-forward in outcome language
- which parts are donor-worthy mechanism versus CC-specific product feel

This directly supports:

- truthful SNC wording
- avoiding fake "resume" promises
- final admission docs

### `56`

After `53-55`, SNC needs one bounded synthesis packet for:

- `Milestone 2` admission readiness
- worker/operator wording
- explicit non-promises
- deferred items that do not block entry

This is not a platform roadmap packet.
It is the bounded admission envelope for `Milestone 2`.

## Recommended Launch Order

1. `53`
2. `54`
3. `55`
4. `56`

## Best Bundles

- `53 + 54`
  - best OpenClaw post-launch visibility and stale-state cleanup bundle

- `55 + 56`
  - best donor-plus-admission bundle

Best kept solo:

- `54`
  - stale-state cleanup stays clearer when not mixed with later announce visibility

- `55`
  - donor restart/resume boundary value is easiest to judge without synthesis pressure

## Expected Progress Lift

These are planning estimates, not inflated scorekeeping.

### OpenClaw

Current read:

- SNC-relevant host understanding: about `99%`
- broader host/platform understanding: about `92%`

If `53 + 54` close well:

- SNC-relevant host understanding should stay about `99%`, but with stronger admission-grade worker/operator precision
- broader host/platform understanding should move to about `93%`

Why not much higher:

- the remaining gain is operator realism and cleanup truth, not unexplored host structure

### CC

Current read:

- SNC-relevant donor understanding: about `98%`
- broader repo/product understanding: about `88%`

If `55` closes well:

- SNC-relevant donor understanding should stay about `98%`, but with sharper wording and re-entry boundary clarity
- broader repo/product understanding should move to about `89%`

Why not much higher:

- the remaining donor gain is mostly wording and recovery boundary nuance, not broad missing runtime knowledge

### Synthesis note

`56` should improve admission clarity far more than raw source coverage.
Its success should be judged by whether the main thread can decide:

- whether `Milestone 2` is ready for admission
- what the docs can honestly promise
- which deferred items still belong to later milestones

without inventing a larger worker platform.

## Success Condition

Phase 11 is successful when:

1. SNC can describe late follow-up visibility without confusing acceptance, announce intent, and observed reply.
2. SNC can explain stale worker/session cleanup using host truth rather than local guesswork.
3. donor guidance is sharp enough that any future "resume" language stays honest.
4. `Milestone 2` gets one bounded admission envelope instead of scattered edge-case notes.
