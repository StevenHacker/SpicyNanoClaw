# External Thread Phase 6 Plan

## Purpose

Phase 6 is the first external-thread wave after the main `Milestone 2` product envelope is accepted.

This phase does not reopen architecture.
It focuses on the narrow seams that still change:

- worker completion behavior
- clean-host operator reality
- long-range delegation donor precision
- the actual operator contract of `Milestone 2`

## Packet Set

1. `33` OC-14 Subagent Completion Delivery / Announce Dispatch Matrix
2. `34` OC-15 Plugin Enablement / Restart / Reload Matrix
3. `35` CC-13 Delegation Follow-Up / Remote-Agent Control Matrix
4. `36` SYN-07 SNC Milestone 2 Operator Profile / StateDir Contract

## Why These Packets

### `33`

`OC-12` closed launch, wait, follow-up, and control.
What remains sharp on the OpenClaw side is downstream completion delivery:

- queued vs direct announce delivery
- deferred `subagent_ended`
- delivery-target overrides
- controller-facing completion timing

This is the most useful next packet for worker diagnostics and controller trust.

### `34`

`OC-13` closed install/update lanes, but not the actual operator moment after install:

- when config changes become live
- when restart is required
- what "enabled" means to discovery/load/runtime

This is the most useful next packet for clean-host delivery rehearsal.

### `35`

`CC-12` closed addressed routing and ownership.
What remains worth learning from CC is the next layer:

- follow-up after launch
- remote-agent control
- send/resume/control separation
- what is still donor-value versus what is product/service coupling

This packet serves the longer-range specialization-kernel program more than immediate feature scope.

### `36`

After `SYN-06`, the remaining synthesis value is not another product envelope.
It is an operator contract:

- how `stateDir` should be recommended
- what defaults should be safe
- what remains opt-in
- what README/demo/release should actually emphasize

That helps keep `Milestone 2` sharp and prevents accidental product sprawl.

## Recommended Launch Order

1. `33`
2. `34`
3. `35`
4. `36`

## Best Bundles

- `33 + 34`
  - best OpenClaw operations bundle for `Milestone 2`

- `35 + 36`
  - best donor-plus-operator bundle once the OpenClaw side is mostly settled

Best kept solo:

- `33`
  - announce dispatch stays clearer when not mixed with broader delivery enablement

- `35`
  - remote/control follow-up is easier to judge when not mixed with release framing

## Expected Progress Lift

These are planning estimates, not success theater.

### OpenClaw

Current read:

- SNC-relevant host understanding: about `95%`
- broader host/platform understanding: about `86%`

If `33 + 34` close well:

- SNC-relevant host understanding should move to about `97%`
- broader host/platform understanding should move to about `88%`

Why not higher:

- after this point, most remaining gains come from implementation contact rather than static repo reading

### CC

Current read:

- SNC-relevant donor understanding: about `93%`
- broader repo/product understanding: about `83%`

If `35` closes well:

- SNC-relevant donor understanding should move to about `94%`
- broader repo/product understanding should move to about `84%`

Why not higher:

- the remaining CC repo bulk is increasingly outside the useful donor frontier

### Synthesis note

`36` should improve operator/release clarity more than raw source coverage.
It should be judged by how much cleaner `Milestone 2` becomes to explain and ship.

## Success Condition

Phase 6 is successful when:

1. worker completion delivery no longer depends on fuzzy announce assumptions
2. clean-host enablement/restart behavior is exact enough for delivery rehearsal
3. the remaining useful CC delegation donor mechanics are narrowed without reopening broad shell/service study
4. `Milestone 2` has a bounded operator contract that can guide README, demo, and release decisions
