# External Thread Phase 8 Plan

## Purpose

Phase 8 is a support-and-diagnostics wave after accepting `37-40`.

It is designed to serve the next main-thread engineering pressure:

- `SNC-Milestone2-04 Durable Memory Diagnostics And Controls`

The goal is not to reopen broad repo study.
The goal is to answer the next narrow implementation and operator questions.

## Packet Set

1. `41` `OC-18 Plugin Diagnostics / Doctor / Config-Validate Surface Matrix`
2. `42` `OC-19 Gateway Launch / Working-Directory Matrix`
3. `43` `CC-15 SessionMemory / ExtractMemories Failure-Skip-Control Matrix`
4. `44` `SYN-09 SNC Durable-Memory Operator Envelope`

## Why These Packets

### `41`

Phase 7 proved slot/path reality.
The next missing host packet is:

- what built-in diagnostics surfaces already exist for operators
- where plugin doctor / inspect / config validate can help
- what supportable signals SNC can lean on without inventing a host control plane

This directly supports:

- future support docs
- possible SNC troubleshooting guidance
- bounded operator diagnostics

### `42`

Phase 7 pinned plugin-path semantics to process CWD, but one practical gap remains:

- what working-directory assumptions are implied by real gateway launch lanes
- how CLI, daemon, and service entrypaths set or inherit CWD

This directly supports:

- safer `stateDir` / artifact-path docs
- clean-host deployment realism

### `43`

Phase 7 pinned CC memory hygiene, but the next donor precision is:

- when SessionMemory/extraction deliberately skips work
- what failure/backoff/control behaviors exist
- how CC prevents maintenance loops or useless writes

This directly supports:

- SNC durable-memory controls
- explainable skip/health messaging
- not over-writing when there is no good update

### `44`

Once `41-43` close, the next synthesis value is:

- what SNC should surface to operators about durable memory
- what to inspect
- what to warn about
- what still should not be promised

This is not a broad release packet.
It is the bounded outward contract for the durable-memory lane.

## Recommended Launch Order

1. `41`
2. `43`
3. `42`
4. `44`

## Best Bundles

- `41 + 42`
  - best OpenClaw operator/support bundle

- `43 + 44`
  - best donor-plus-synthesis bundle for the next durable-memory cut

Best kept solo:

- `43`
  - easier to judge donor value when not mixed with host/operator facts

## Expected Progress Lift

These are planning estimates, not success theater.

### OpenClaw

Current read:

- SNC-relevant host understanding: about `98%`
- broader host/platform understanding: about `89%`

If `41 + 42` close well:

- SNC-relevant host understanding should move to about `99%`
- broader host/platform understanding should move to about `90%`

Why not higher:

- remaining gains are now mostly post-research implementation and deployment contact

### CC

Current read:

- SNC-relevant donor understanding: about `95%`
- broader repo/product understanding: about `85%`

If `43` closes well:

- SNC-relevant donor understanding should move to about `96%`
- broader repo/product understanding should move to about `86%`

Why not higher:

- the remaining repo bulk is increasingly peripheral to SNC's current implementation frontier

### Synthesis note

`44` should improve durable-memory operator clarity much more than raw source coverage.
It should be judged by whether the next `Milestone 2` memory docs and controls become sharper and more honest.

## Success Condition

Phase 8 is successful when:

1. SNC can lean on real host diagnostics instead of vague support language.
2. gateway/CWD assumptions are narrow enough that first-run path guidance becomes safer.
3. durable-memory follow-up can borrow sharper donor read on skip/failure/control behavior.
4. the next SNC durable-memory cut has a bounded outward contract instead of vague "memory gets smarter" language.
