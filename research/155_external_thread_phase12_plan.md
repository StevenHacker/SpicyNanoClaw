# External Thread Phase 12 Plan

## Purpose

Phase 12 is a narrow closeout wave after accepting the bounded `Milestone 2` admission envelope.

It exists to support the last likely main-thread pressure before a stronger admission or release call:

- restart-time worker/session truth
- plugin removal and `stateDir` hygiene reality
- one final release/operator packet that says what `Milestone 2` should ship and how it should be described

The goal is not to reopen worker topology.
The goal is to make admission and operator release language harder and more practical.

## Packet Set

1. `57` `OC-26 Restart Persistence / Session Reattachment Matrix`
2. `58` `OC-27 Plugin Removal / StateDir Hygiene Recovery Matrix`
3. `59` `CC-19 Maintained-Artifact Reentry / Compaction-Reuse Matrix`
4. `60` `SYN-13 SNC Milestone 2 Release / Operator Packet`

## Why These Packets

### `57`

Phase 11 closed follow-up visibility and stale-state truth inside one running host lifecycle.
The next missing host precision is:

- what survives host restart
- which public seams re-establish worker/session truth after restart
- when SNC-local worker state should be treated as active, inspect-needed, or historical only after restart

This directly supports:

- worker-state downgrade rules
- admission wording
- post-restart operator recovery guidance

### `58`

Phase 11 also proved that plugin/runtime removal and stale slot/state are separate realities.
The next missing host-plus-plugin precision is:

- what disable, uninstall, update, and manual cleanup really leave behind
- how `plugins.slots.contextEngine`, plugin-owned `stateDir`, and linked/package installs should be cleaned up or retained
- which residue is safe, expected, or misleading after removal

This directly supports:

- operator hygiene docs
- release notes
- bounded cleanup guidance

### `59`

`Milestone 2` is close to admission, but the longer-range specialization-kernel program still needs one sharper donor packet:

- how CC reuses maintained artifacts across re-entry and compaction boundaries
- when maintained session state is treated as authoritative enough to compact around
- where donor value ends and CC-specific recovery shell begins

This directly supports:

- future post-`Milestone 2` continuity kernel design
- tighter judgment on what SNC should defer versus eventually import

### `60`

After `57-59`, the main thread needs one bounded packet for:

- `Milestone 2` release/operator wording
- install/update/remove/do-not-claim language
- clear admission versus defer line

This is not a roadmap packet.
It is the operator/release closeout packet for `Milestone 2`.

## Recommended Launch Order

1. `57`
2. `58`
3. `59`
4. `60`

## Best Bundles

- `57 + 58`
  - best OpenClaw restart/removal/operator-hygiene bundle for `Milestone 2` closeout

- `59 + 60`
  - best donor-plus-release-language bundle once the host cleanup packets land

Best kept solo:

- `57`
  - restart-time truth stays clearer when not mixed with plugin-removal residue

- `59`
  - maintained-artifact donor value is easier to judge without release-language pressure

## Expected Progress Lift

These are planning estimates, not inflated scorekeeping.

### OpenClaw

Current read:

- SNC-relevant host understanding: about `99%`
- broader host/platform understanding: about `93%`

If `57 + 58` close well:

- SNC-relevant host understanding should stay about `99%`, but with stronger restart/removal/operator precision
- broader host/platform understanding should move to about `94%`

Why not much higher:

- the remaining gain is release-grade operational truth, not unexplored host structure

### CC

Current read:

- SNC-relevant donor understanding: about `98%`
- broader repo/product understanding: about `89%`

If `59` closes well:

- SNC-relevant donor understanding should stay about `98%`, but with stronger maintained-artifact reuse boundaries
- broader repo/product understanding should move to about `90%`

Why not much higher:

- this is a closeout donor packet, not a new subsystem atlas

### Synthesis note

`60` should improve release/admission clarity much more than raw source coverage.
Its success should be judged by whether the main thread can decide:

- what `Milestone 2` release notes should claim
- how operators should think about restart/removal/state cleanup
- which items remain explicitly deferred to later milestones

without inflating SNC into a larger platform.

## Success Condition

Phase 12 is successful when:

1. SNC can explain post-restart worker/session truth without guessing from local state alone.
2. SNC can document removal / disable / update / `stateDir` hygiene without mixing host cleanup with plugin residue.
3. one sharper donor packet exists for maintained-artifact reuse beyond `Milestone 2`.
4. `Milestone 2` gets one practical release/operator closeout packet rather than a vague admission note.
