# External Thread Phase 5 Acceptance - Round 2

## Purpose

This note records the second and closing acceptance pass for `Milestone 2` Phase 5 external-thread research.

The point is not to inflate repo coverage.
The point is to record what actually became engineering-grade.

## Accepted Packets

- `29` `research/105_oc12_worker_invocation_seam_matrix.md`
- `30` `research/106_oc13_plugin_delivery_marketplace_rehearsal.md`
- `31` `research/107_cc12_delegation_ownership_queue_matrix.md`
- `32` `research/108_snc_milestone2_product_envelope.md`

## What Actually Improved

### OpenClaw

The strongest OpenClaw gains this round are worker/product-operability gains.

What is now materially clearer:

- `sessions_spawn` is the only real launch seam
- `sessions_yield` is the real wait seam for push-based follow-up
- `sessions_send` is follow-up, not launch
- `subagents` is control/list/kill/steer, not the primary launch path
- completion comes back through a real registry-plus-announce delivery path rather than hand-waved "background magic"
- clean-host plugin delivery now has an exact lane map:
  - linked-path development lane
  - copied local directory/archive lane
  - tracked package lanes
  - marketplace-mediated lane

This directly improves:

- controller launch path confidence
- worker diagnostics and result fold-back design
- clean-host install/update rehearsal planning

### CC

The strongest CC gains this round are control-model gains.

What is now materially clearer:

- CC's strongest delegation donor is addressed routing over shared substrate, not one queue per worker
- follow-up behavior differs by worker type
- kill, interrupt-current-turn, shutdown, and resume are intentionally different control surfaces
- controller ownership of roster, routing, and diagnostics is explicit in code

This directly improves:

- SNC worker control hygiene
- later multi-worker design choices
- avoidance of fake donor analogies like "copy teammates literally"

### SNC Product Boundary

The synthesis packet did not add much raw source coverage.
It did add one very important practical boundary:

- `Milestone 2` should still present as one ordinary OpenClaw plugin
- continuity plus bounded delegation/diagnostics is the default face
- `stateDir` is the recommended profile boundary
- hooks and helper tools remain opt-in, not surprise default surface

That boundary reduces scope-drift risk during `Milestone 2` development.

## Real Progress Assessment

These are post-acceptance estimates, not launch estimates.

### OpenClaw

Current read after accepting `29` and `30`:

- SNC-relevant host understanding: about `95%`
- broader host/platform understanding: about `86%`

Why this is a real increase:

- the remaining high-value OpenClaw ambiguity was worker invocation plus ordinary delivery reality
- both of those lanes are now explicit enough to guide engineering instead of speculation

Why it is not higher:

- the biggest remaining gains now come from implementation contact and a few narrow lifecycle/product edges, not broad static reading

### CC

Current read after accepting `31`:

- SNC-relevant donor understanding: about `93%`
- broader repo/product understanding: about `83%`

Why this is a real increase:

- the biggest remaining CC worker ambiguity was exact delegation ownership and follow-up control semantics
- that gap is now materially narrower

Why it is not higher:

- the remaining CC bulk is increasingly peripheral to SNC and to the specialization-kernel program

### Synthesis note

`32` improved operator and release clarity more than raw repo coverage.
It should be counted as a scope-control gain, not a source-coverage jump.

## Engineering Read

The practical consequence is simple:

- `Milestone 2` controller launch and diagnostics work can now proceed on much firmer host/donor ground
- clean-host delivery work no longer has to guess which host lane counts as the real user path
- product-boundary arguments should now narrow, not widen

## What Remains Open

The next external-thread wave should be narrower still:

- `33` `OC-14 Subagent Completion Delivery / Announce Dispatch Matrix`
- `34` `OC-15 Plugin Enablement / Restart / Reload Matrix`
- `35` `CC-13 Delegation Follow-Up / Remote-Agent Control Matrix`
- `36` `SYN-07 SNC Milestone 2 Operator Profile / StateDir Contract`

## Dispatcher Read

After this acceptance pass, the best next external-thread order is:

1. `33`
2. `34`
3. `35`
4. `36`

That order keeps research tied to the next real needs:

- launch-result delivery exactness
- clean-host enablement reality
- longer-range delegation donor precision
- bounded operator contract for `Milestone 2`
