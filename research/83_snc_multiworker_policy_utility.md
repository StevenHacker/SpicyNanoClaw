# SNC-16 Multi-Worker Policy Utility

## Purpose

This packet lands the bounded policy layer for SNC multi-worker orchestration.

It does **not** wire into host session tools, host runtime files, or `engine.ts`.
The utility is intentionally limited to reusable policy primitives:

- worker roles and job contracts
- spawn-brief generation
- controller-side tracking helpers
- result fold-back helpers

## Design Shape

The design follows the accepted orchestration packet:

- the controller owns policy
- the host owns worker execution
- child work stays bounded
- results come back through a deterministic fold-back step

The utility therefore models three small planes:

1. contract plane
   - what the worker is supposed to do
2. control plane
   - how the controller describes and tracks the worker
3. fold-back plane
   - how a worker result gets turned into controller-facing next steps

## Utility Surface

### Worker roles and contracts

The policy layer uses a narrow role set:

- `controller`
- `helper`
- `specialist`

The job contract keeps the runtime-facing shape bounded:

- title and objective
- job kind
- deliverables
- constraints
- spawn mode
- completion mode
- turn budget

### Spawn briefs

Spawn briefs are rendered as controller-ready prompts that can be passed into existing host launch flows later.

The brief format emphasizes:

- role
- objective
- deliverables
- constraints
- result contract

### Controller tracking

The controller state tracks:

- queued workers
- active workers
- completed workers
- per-worker records

This is deliberately not a new scheduler.
It is just enough state to help SNC reason about delegation without taking host ownership.

### Fold-back

Fold-back turns a worker result into:

- a controller-ready summary
- controller notes
- controller actions
- optional follow-up brief text

That makes result handling deterministic and keeps follow-up generation local to SNC policy.

## Usage

Typical flow:

1. build a job contract
2. render a spawn brief
3. add a queued controller record
4. mark the worker spawned or running
5. record the result
6. fold the result back into controller notes

The helper functions are pure and side-effect free.
That keeps the layer easy to test and easy to wire later, without assuming any host integration today.

## SNC Relevance

This utility is the policy bridge between the accepted orchestration design and later host-tool integration.

It keeps the SNC worker model:

- bounded
- controller-owned
- hot-pluggable
- easy to fold back into writing state

## Modification Guidance

- Wrap these helpers when later wiring host session tools.
- Extend the contract only when a new worker class is real, not hypothetical.
- Defer any host scheduler or registry changes until the policy layer proves its shape in practice.

