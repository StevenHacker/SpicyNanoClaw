# External Thread Phase 5 Acceptance - Round 1

## Purpose

This note records the first real acceptance pass for `Milestone 2` external-thread research.

The goal is not to celebrate file count.
The goal is to state what actually got sharper for engineering.

## Accepted Packets

- `25` `research/90_oc10_runner_lifecycle_timing_matrix.md`
- `26` `research/91_oc11_plugin_sdk_slot_stability_atlas.md`
- `27` `research/92_cc10_pressure_compaction_lifecycle_matrix.md`
- `28` `research/93_cc11_memory_lifecycle_contract_matrix.md`

## What Actually Improved

### OpenClaw

The strongest OpenClaw gains are precision gains, not breadth gains.

What is now materially clearer:

- normal turn vs delegated compaction vs overflow recovery vs timeout recovery are not lifecycle-equivalent
- the same context-engine instance is reused across retry loops
- timeout recovery and overflow recovery have different maintenance semantics
- the plugin SDK surface is more explicitly tiered than "public vs private"
- manifest, entry helpers, injected API, and slot ownership are strong seams
- loader/registry/runtime alias plumbing should not be treated as plugin contract

This directly improves:

- worker-launch safety
- future compaction-aware SNC work
- confidence about which host seams are worth building on long-term

### CC

The strongest CC gains are contract-accuracy gains.

What is now materially clearer:

- pressure relief is a layered ladder before full compaction
- maintained-artifact reuse is a first-class compaction path, not an afterthought
- cleanup and failure/circuit-breaker behavior are explicit lifecycle features
- baseline instruction memory, relevant recall, current-session memory, and durable extraction are four distinct contracts

This directly improves:

- future SNC pressure-control imports
- durable-memory policy design
- avoidance of false analogies between session-state, baseline memory, and stop-hook extraction

## Real Progress Assessment

These are post-acceptance estimates, not the earlier launch estimates.

### OpenClaw

Current read after accepting `25` and `26`:

- SNC-relevant host understanding: about `93%`
- broader host/platform understanding: about `84%`

Why this is a real increase:

- the remaining gap was mostly exact runner timing and extension-surface stability
- these two packets closed both of those high-leverage ambiguity lanes

Why it is not higher:

- beyond this point, more gains come from live implementation contact and later product/deployment packets, not more static reading alone

### CC

Current read after accepting `27` and `28`:

- SNC-relevant donor understanding: about `92%`
- broader repo/product understanding: about `82%`

Why this is a real increase:

- the remaining donor ambiguity was less "what are the ideas" and more "what is the exact lifecycle contract"
- these packets closed the two most important lifecycle matrices still missing

Why it is not higher:

- the remaining repo bulk is increasingly peripheral to SNC and the specialization-kernel program

## Engineering Read

The practical consequence is simple:

- `Milestone 2` worker-launch work now has much less excuse for fuzzy host assumptions
- later pressure/memory imports from CC can now be judged against exact lifecycle contracts instead of principle summaries

This is the point where research is clearly serving implementation rather than delaying it.

## What Remains Open

Still-open `Milestone 2` external packets:

- `29` `OC-12 Worker Invocation Seam Matrix`
- `30` `OC-13 Plugin Delivery / Marketplace Rehearsal Packet`
- `31` `CC-12 Delegation Ownership / Addressed Queue Matrix`
- `32` `SYN-06 SNC Milestone 2 Product Envelope`

## Dispatcher Read

After this acceptance pass, the next best external-thread priority is:

1. `29`
2. `31`
3. `30`
4. `32`

That order keeps the remaining research tightly aligned with:

- worker launch
- delegation ownership
- delivery hardening
- milestone-2 boundary control
