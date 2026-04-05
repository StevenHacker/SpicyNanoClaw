# External Thread Phase 10 Plan

## Purpose

Phase 10 is a narrow worker follow-up and resume precision wave after accepting phase 9.

It exists to support the next likely SNC engineering pressure:

- controller follow-up behavior after launch
- ambiguous-launch recovery behavior
- any bounded future resume or re-entry story

The goal is not to reopen broad host excavation.
The goal is to close the remaining high-value gaps around:

- follow-up delivery semantics
- inspect-first recovery after ambiguous launch
- resume sanitation donor rules
- bounded worker follow-up and resume contract

## Packet Set

1. `49` `OC-22 Worker Follow-Up Delivery / Reply-Visibility Matrix`
2. `50` `OC-23 Ambiguous Worker Launch Inspection / Recovery Matrix`
3. `51` `CC-17 Worker Resume Sanitization / Unresolved-Tool Cleanup Matrix`
4. `52` `SYN-11 SNC Worker Follow-Up / Resume Envelope`

## Why These Packets

### `49`

Phase 9 proved the public worker verbs.
The next missing host precision is:

- what `sessions_send` actually returns
- how `accepted`, `ok`, `timeout`, and `reply` visibility should be interpreted
- when follow-up should be described as "message delivered" versus "reply observed"

This directly supports:

- controller follow-up wording
- worker diagnostics clarity
- future SNC worker follow-up state handling

### `50`

Phase 9 also proved that some launch `error` results are ambiguous because a child identity may already exist.

The next missing host precision is:

- which public seams can inspect that ambiguous child state afterward
- whether the right next step is list, inspect, follow up, or abandon
- how much recovery is possible without inventing a host fork

This directly supports:

- safer retry guidance
- operator-facing recovery wording
- bounded SNC handling for ambiguous launches across later turns

### `51`

Phase 9 donor evidence proved that CC keeps follow-up and resume separate.
The next donor precision is:

- exactly how resume sanitizes transcript state
- what unresolved tool-use or half-open artifacts are filtered out
- what this means for a safe SNC resume story later

This directly supports:

- future SNC resume decisions
- avoiding fake "continue where it left off" promises
- transcript hygiene doctrine for worker re-entry

### `52`

After `49-51`, SNC needs one bounded synthesis packet for:

- follow-up
- inspect-first recovery
- resume versus relaunch
- explicit non-promises

This is not a worker-platform roadmap.
It is the bounded `Milestone 2` outward contract for worker follow-up and resume.

## Recommended Launch Order

1. `49`
2. `50`
3. `51`
4. `52`

## Best Bundles

- `49 + 50`
  - best OpenClaw worker follow-up and recovery bundle

- `51 + 52`
  - best donor-plus-envelope bundle for resume-facing decisions

Best kept solo:

- `50`
  - ambiguous-launch recovery stays cleaner when not mixed with generic follow-up semantics

- `51`
  - donor resume sanitation is easiest to judge without synthesis pressure

## Expected Progress Lift

These are planning estimates, not inflated scorekeeping.

### OpenClaw

Current read:

- SNC-relevant host understanding: about `99%`
- broader host/platform understanding: about `91%`

If `49 + 50` close well:

- SNC-relevant host understanding should stay about `99%`, but with sharper follow-up and recovery precision
- broader host/platform understanding should move to about `92%`

Why not much higher:

- the remaining host gaps are mostly operational nuance, not missing topology

### CC

Current read:

- SNC-relevant donor understanding: about `97%`
- broader repo/product understanding: about `87%`

If `51` closes well:

- SNC-relevant donor understanding should move to about `98%`
- broader repo/product understanding should move to about `88%`

Why not much higher:

- the remaining donor gain is mostly resume cleanliness rather than unexplored architecture

### Synthesis note

`52` should improve implementation and docs clarity more than raw coverage.
Its success should be judged by whether SNC can describe:

- when to follow up
- when to inspect first
- when resume is even honest to discuss

without slipping into orchestration-platform language.

## Success Condition

Phase 10 is successful when:

1. SNC can describe worker follow-up outcomes without blurring `accepted`, `ok`, `timeout`, and visible reply.
2. SNC can recommend a bounded next step after ambiguous launch without blind respawn advice.
3. donor resume logic is precise enough that SNC does not fake "resume" semantics it cannot safely honor.
4. `Milestone 2` gets one bounded follow-up/resume envelope instead of scattered notes across code and docs.
