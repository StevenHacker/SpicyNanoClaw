# External Thread Phase 4 Plan

## Purpose

Phase 4 resumes source excavation, but only in the exact places where more precision still changes engineering decisions.

This is not a return to broad repo wandering.
It is a precision wave.

The goals are:

- close the remaining high-value host-kernel timing ambiguities in OpenClaw
- close the remaining high-value lifecycle/contract ambiguities in CC
- support the next SNC integrations and the longer-term custom-Claw program without reopening settled architecture calls

## Packet Set

1. `24` OPS-05 SNC Milestone 1 Release Envelope
2. `25` OC-10 Runner Lifecycle Timing Matrix
3. `26` OC-11 Plugin SDK / Slot Stability Atlas
4. `27` CC-10 Pressure / Compaction Lifecycle Matrix
5. `28` CC-11 Memory Lifecycle Contract Matrix

## Why These Packets

### `24`

This is still the milestone-cutting packet.
It supports release hygiene rather than source mastery.

### `25`

This packet should close the remaining important OpenClaw kernel-timing ambiguity.
It directly supports future durable-memory, hook, and worker integrations because timing mistakes at the runner/kernel layer are expensive.

### `26`

This packet supports the longer-range custom-Claw program.
It should tell us which plugin/sdk seams are safe to build on across future variants and which internals are too unstable to treat as public substrate.

### `27`

This packet turns the accepted CC pressure/compaction donor read into exact lifecycle timing.
It directly supports future harness imports and later pressure-control work.

### `28`

This packet does the same for CC memory:
baseline projection, selective recall, extraction, and stop-hook timing should all become exact rather than only conceptually understood.

## Recommended Launch Order

1. `24`
2. `25`
3. `27`
4. `28`
5. `26`

## Best Bundles

- `25 + 26`
  - best for a thread working on OpenClaw host-kernel and extension-surface mastery

- `27 + 28`
  - best for a thread working on exact CC harness mechanics

Best kept solo:

- `24`
  - it should stay coherent as one milestone/release boundary packet

## Expected Progress Lift

These are real estimates, not success theater.

### OpenClaw

Current read:

- SNC-relevant host understanding: about `88%`
- broader host/platform understanding: about `78%`

If `25 + 26` close well:

- SNC-relevant host understanding should move to about `93%`
- broader host/platform understanding should move to about `84%`

Main reason it does not jump higher:

- the remaining gap is less about missing packets and more about future real implementation contact with the host

### CC

Current read:

- SNC-relevant donor understanding: about `87%`
- broader repo/product understanding: about `76%`

If `27 + 28` close well:

- SNC-relevant donor understanding should move to about `92%`
- broader repo/product understanding should move to about `82%`

Main reason it does not jump higher:

- the repo is very large, and beyond this point many remaining gains are in low-leverage peripheral areas

## Success Condition

Phase 4 is successful when:

1. release-envelope work is no longer the main milestone blind spot
2. OpenClaw runner timing is exact enough that future integrations stop guessing
3. OpenClaw extension-surface stability is clear enough to support future custom Claw variants
4. CC donor mechanics are exact enough to import later without romanticizing them
