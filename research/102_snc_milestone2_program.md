# SNC Milestone 2 Program

## Purpose

This document defines what `Milestone 2` is for.

`Milestone 1` proved that SNC can ship as a bounded OpenClaw plugin:

- continuity core
- durable-memory v1
- bounded hook shaping
- worker-result fold-back
- release-candidate packaging

`Milestone 2` should not restart the architecture conversation.
It should turn that bounded continuity core into a sharper operator-grade writing system without breaking the current doctrine:

- stay hot-pluggable by default
- preserve host ownership unless hard evidence says otherwise
- use research only where it changes the next engineering cut

## Current Entry State

At the start of `Milestone 2`:

- `SNC Milestone 1` has a pushed release-candidate branch
- the plugin package is real and installable
- milestone validation is green
- durable memory is integrated and hardened enough for bounded use
- worker execution has:
  - policy utility
  - execution adapter
  - runtime fold-back
  - lifecycle bookkeeping

The most important things still not closed are:

- final controller-issued launch path from real SNC policy flow
- operator-visible worker control/diagnostics surface
- clean-host delivery rehearsal and publication hardening
- exact remaining host/donor lifecycle packets that still affect integration confidence

## Progress Since Entry

`Milestone 2` is no longer only a plan.

The first bounded delegation slice is now live:

- SNC derives one-shot helper launch intent from explicit helper cues in the active assistant plan
- that intent is persisted into plugin-owned worker state after `afterTurn(...)`
- `assemble(...)` now projects a dedicated `Worker launch lane`

This matters because the program has crossed from:

- "worker substrate exists"

to:

- "controller-issued helper launch has a real first product path"

The next cuts should harden and productize that lane, not reopen the design.

That hardening is now materially underway:

- repeated identical helper intents now go through a bounded replay-hold path instead of blindly requeueing
- the `Worker launch lane` now surfaces recent replay holds as operator-visible guidance
- internal OpenClaw completion-event payloads are now excluded from SNC continuity-state extraction so worker telemetry does not mutate focus/plan state

This matters because `Milestone 2` no longer depends on a fragile happy-path launch lane.
The controller path is starting to behave like a product surface instead of a demo seam.

Durable memory also crossed its next product threshold:

- SNC now has bounded durable-memory controls
- durable-memory projection now respects explicit SNC-owned operator policy
- hygiene and saturation pressure can now surface as bounded diagnostics instead of staying implicit

The worker lane also crossed an important realism threshold:

- real `sessions_spawn` tool results now fold back through `tool_result_persist`
- accepted launches advance queued workers into real SNC state
- launch failures now preserve host-backed classes:
  - validation
  - host-refused
  - runtime-clean
  - runtime-ambiguous
- failed launches now create bounded worker fold-back notes instead of disappearing into raw tool-result output

This matters because `Milestone 2` is no longer only projecting a launch lane.
It is now consuming real host launch verdicts through a plugin-owned seam.

The worker controller path has now crossed the next host-truth threshold too:

- real `sessions_send` follow-up results now fold back through the same plugin-owned seam
- follow-up outcomes are persisted as bounded observations instead of being mistaken for worker terminal truth
- reply visibility, timeout, and error now survive restart through SNC-owned worker state

This matters because `Milestone 2` no longer treats worker follow-up as prompt theater.
It now carries host-backed follow-up visibility into the same bounded worker memory that already stores launch and completion truth.

`Milestone 2` now also has a canonical closeout gate:

- focused SNC validation
- dispatcher validation plus workspace typecheck
- package artifact rebuild
- clean-host install rehearsal

This matters because the milestone can now be judged by one repeatable operator-grade gate instead of scattered engineering checks.

## Milestone 2 Intent

The intent is:

1. make SNC delegation actually usable, not just structurally present
2. make runtime state easier to understand and trust
3. harden installation and release flow beyond "candidate"
4. keep the codebase pointed toward future specialized Claws, not a one-off writing hack

## Core Development Tracks

### 1. Worker Controller Launch Path

This is the highest-value `Milestone 2` engineering lane.

The current system can:

- define worker contracts
- build host launch plans
- consume real launch results from the host tool path
- parse pushed completions
- fold worker results back into session state

What it still cannot do cleanly enough is:

- finish the bounded helper-worker control path from launch into operator-safe recovery and admission-closeout wording
- keep that launch/control behavior inspectable and deterministic when repeated, blocked, ambiguous, or stale

Target outcome:

- one-shot helper delegation becomes a real bounded product behavior
- still no scheduler takeover
- still no recursive swarm default

### 2. Worker Diagnostics And Operator Surface

Once delegation is live, operator trust becomes the next bottleneck.

Target outcome:

- bounded worker status projection
- readable failure / timeout / kill notes
- controller-state summaries that help debugging and later productization

This is not a UI milestone.
It is a runtime clarity milestone.

### 3. Delivery Hardening

`Milestone 1` has a real release candidate.
`Milestone 2` should make delivery feel less provisional.

Target outcome:

- clean-host install rehearsal
- clearer install/update contract
- packaging/publish path that no longer depends on engineering-context knowledge

### 4. Durable Memory Quality Controls

Durable memory is already in the continuity path.
The next gains are about:

- diagnostics
- bounded pruning
- explainable promotion/projection behavior

This track should stay bounded.
It should not reopen memory-slot takeover or generic memory-platform ambitions.

### 5. Optional Helper Surface Pilot

Helper tools remain deferred by default.

If `Milestone 2` opens them at all, it should only be:

- read-only
- opt-in
- scoped to SNC-owned artifacts/state
- clearly separate from MCP-first expansion

This is lower priority than worker launch and delivery hardening.

## Explicit Non-Goals

`Milestone 2` does not aim to:

- take host memory-slot ownership
- add a general worker scheduler
- add recursive swarm orchestration as the default mode
- expose SNC as a broad MCP/control-plane product
- rewrite OpenClaw internals wholesale
- collapse SNC and the future custom-Claw kernel into one big release

## Research Tracks That Still Matter

The remaining high-value research is now precision research:

- exact OpenClaw runner timing
- exact OpenClaw plugin/sdk stability seams
- exact CC pressure/compaction lifecycle
- exact CC memory lifecycle contract
- exact delegation/ownership donor mechanics where they still sharpen SNC worker design

Research should now answer implementation questions, not generate more broad atlases.

## Exit Bar For Milestone 2

`Milestone 2` should be considered closed when these are true:

1. SNC can support bounded controller-issued helper delegation in a way that is stable and explainable.
2. Worker lifecycle and results are visible enough that failures do not disappear into raw transcript noise.
3. Clean-host delivery has been rehearsed and the install/update story feels ordinary to an OpenClaw user.
4. Durable memory quality controls are strong enough that long-session continuity improves without silent state rot.
5. Any helper-surface expansion remains clearly optional and bounded.
6. One canonical closeout gate exists that validates runtime, packaging, and clean-host behavior together.

## Strategic Read

`Milestone 1` proved the bounded continuity kernel.

`Milestone 2` should prove something larger:

- SNC can become a true specialized Claw layer
- without abandoning the host-safe architecture
- and without losing the longer-term path toward a reusable specialization kernel for future Claw variants

That is the right scale for this phase:

- concrete enough to ship new behavior
- large enough to matter for the broader custom-Claw program
