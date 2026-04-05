# SNC Module Workorders - Round 3

## Purpose

This file is the first module queue for `Milestone 2`.

It begins after:

- `Milestone 1` release-candidate push
- durable-memory integration + hardening
- worker execution scaffold
- worker runtime fold-back
- worker lifecycle bookkeeping
- general-assistant compatibility guard

The point is not to reopen architecture design.
The point is to cut the next bounded implementation slices in the right order.

## Just Landed

### SNC-Milestone2-00 General-Assistant Compatibility Guard

Outcome:

- `specializationMode` landed with `auto / writing / general`
- default runtime framing is now neutral unless writing artifacts or explicit writing mode justify stronger writing language
- prompt-visible state labels are now continuity-oriented instead of fiction-only

Why it matters:

- SNC should remain a specialization layer, not a plugin that fights normal assistant use
- later `Milestone 2` work should inherit this boundary instead of reintroducing writing-only assumptions everywhere

### SNC-Milestone2-01a Controller Launch Intent And Projection

Outcome:

- SNC now derives bounded one-shot helper launch intent from explicit helper cues in live assistant plans
- that launch intent is persisted into plugin-owned worker state after `afterTurn(...)`
- `assemble(...)` now projects a `Worker launch lane` section with launch-ready `sessions_spawn`, `sessions_yield`, and bounded `subagents` control hints
- end-to-end coverage now proves `afterTurn(...)` queues launch intent and `assemble(...)` projects it back

Why it matters:

- delegation is no longer only a worker substrate hidden behind tests
- SNC now has a real controller-issued helper lane without taking scheduler ownership
- this is the first usable `Milestone 2` delegation cut, but not the final one

### SNC-Milestone2-01b Controller Launch Replay Governance And Event Hygiene

Outcome:

- SNC now suppresses identical helper relaunches for a bounded cooldown window after recent terminal worker results
- the `Worker launch lane` now explains replay holds instead of silently requeueing identical one-shot helper work
- internal OpenClaw completion-event payloads are now excluded from SNC session-state extraction, so they no longer contaminate focus/plan/continuity state or manufacture bogus helper jobs

Why it matters:

- delegation is now less trigger-happy and more reusable
- recent worker results stay visible to the controller without forcing immediate relaunch churn
- completion-event data is folded back through SNC-owned worker state, not mistaken for normal assistant prose

### SNC-Milestone2-01c Worker Launch Result Host Wiring

Outcome:

- real `sessions_spawn` tool results now fold back into persisted SNC worker state through `tool_result_persist`
- accepted launch results now move queued helpers into `spawned`
- launch failures now preserve bounded host-backed classes:
  - validation
  - host-refused
  - runtime-clean
  - runtime-ambiguous
- failed launches now generate bounded worker fold-back notes, so launch failure stops being invisible transcript noise

Why it matters:

- the worker launch lane is no longer only projected guidance
- real host launch verdicts now mutate SNC controller state through a hot-pluggable seam
- ambiguous launch errors can now block duplicate respawn churn instead of looking like clean rejection

### SNC-Milestone2-01d Worker Follow-Up Result Host Wiring

Outcome:

- real `sessions_send` tool results now fold back into persisted SNC worker state through `tool_result_persist`
- follow-up outcomes are now preserved as bounded observations:
  - accepted
  - ok
  - timeout
  - error
- reply visibility, delivery mode, and bounded reply snippets now survive inside SNC-owned worker state instead of disappearing into raw tool-result noise
- follow-up results no longer pretend to be worker terminal truth; completion-event and lifecycle paths remain authoritative for terminal outcome

Why it matters:

- the controller lane now has host-backed truth for both launch and follow-up
- worker follow-up is no longer only a projected suggestion
- SNC can now tell the operator whether a follow-up was accepted, produced a visible reply, timed out, or failed without faking a completion signal

### SNC-Milestone2-02a Worker Diagnostics And State Hygiene

Outcome:

- SNC now projects a dedicated `Worker diagnostics` section when queued, blocked, or active workers have become stale enough to need operator attention
- diagnostics stay action-oriented and point back to bounded host-safe actions like `sessions_spawn` and `sessions_yield`
- plugin-owned worker persistence now keeps all live records but bounds retained terminal tracking records so worker state does not grow forever

Why it matters:

- the worker lane is now easier to trust and debug
- stale state is easier to notice before it turns into silent controller drift
- SNC keeps local worker truth bounded instead of quietly accreting history

### SNC-Milestone2-03a Clean-Host Delivery Rehearsal

Outcome:

- SNC now has a real clean-host rehearsal gate through `scripts/validate_snc_clean_host_rehearsal.ps1`
- the rehearsal uses the original OpenClaw snapshot as host input and installs the packaged SNC archive through the normal plugin CLI
- the rehearsal writes and validates the recommended base config:
  - `stateDir`
  - `specializationMode: "auto"`
  - context-engine slot set to `snc`
- README guidance now keeps hooks clearly opt-in instead of treating them as the default first config

Why it matters:

- delivery confidence no longer depends on knowing the engineering workspace layout
- SNC now has a repeatable install-and-verify path that matches the real OpenClaw operator contract
- `Milestone 2` can keep moving without the release story feeling provisional

### SNC-Milestone2-04a Durable Memory Diagnostics And Controls

Outcome:

- SNC now exposes a bounded `durableMemory` config surface for:
  - catalog size
  - stale-entry pruning window
  - projection limit
  - projection minimum score
- `afterTurn(...)` now applies those controls to durable-memory persistence and pruning
- `assemble(...)` now applies those controls to projection and emits a bounded `Durable memory diagnostics` section when hygiene or projection pressure needs operator attention

Why it matters:

- durable memory is now easier to trust and tune without becoming a generic memory platform
- explainability improved in the exact places that were previously implicit:
  - stale weak-entry pressure
  - projection starvation
  - projection saturation
- the implementation stayed inside SNC-owned plugin state and host-safe seams

### SNC-Milestone2-06 Closeout Gate

Outcome:

- `Milestone 2` now has one canonical validation script:
  - `scripts/validate_snc_milestone2.ps1`
- the closeout gate now rebuilds the package artifact before validating clean-host install
- root and plugin README wording now match the real `Milestone 2` surface instead of older `Milestone 1` phrasing

Why it matters:

- `Milestone 2` can now be judged as a product closeout instead of a moving engineering target
- runtime validation, packaging validation, and clean-host validation now live under one gate
- operator docs now match the bounded worker and continuity claims current SNC can actually defend

## Module Order

### SNC-Milestone2-01 Controller Launch Path

Goal:

- finish turning the existing worker policy/execution/runtime pieces into a real controller-issued helper launch lane

Why now:

- this is the biggest gap between "worker substrate exists" and "delegation is actually usable"

Already landed:

- bounded helper intent derivation
- plugin-owned queued launch persistence
- launch-lane projection during `assemble(...)`

Still needed:

- bounded ambiguous-recovery wording
- late-reply / stale-state cleanup closeout once the newest external worker packets land
- any remaining controller work should now be driven by new runtime evidence, not open-ended feature expansion

Likely scope:

- harden the controller-issued launch lane that now exists
- normalize repeated-intent behavior
- tighten launch failure / blocked / stale-state visibility
- keep the lane:
  - `runtime="subagent"`
  - `mode="run"`
  - one-shot

Do not broaden into:

- general scheduler ownership
- persistent specialist sessions
- recursive descendants

### SNC-Milestone2-02 Worker Diagnostics And State Hygiene

Goal:

- make worker behavior easier to inspect, trust, and debug

Why now:

- once controller launch is live, state clarity becomes the next bottleneck

Already landed:

- bounded worker diagnostics projection
- bounded retention of terminal worker tracking records

Still needed:

- richer blocked/failure reason normalization
- targeted stale-state cleanup policy if evidence shows diagnostics alone are not enough
- possible small operator fixtures around worker-state inspection

Likely scope:

- bounded status summaries
- failure/timeout/kill note normalization
- stale-active cleanup hardening
- small diagnostics helpers or fixtures where justified

Do not broaden into:

- UI dashboard work
- host registry ownership

### SNC-Milestone2-03 Clean-Host Delivery Rehearsal

Goal:

- verify the plugin can be installed and enabled in a clean host context without engineering-workspace assumptions

Why now:

- `Milestone 1` has a release candidate, but delivery confidence still depends too much on internal workspace knowledge

Likely scope:

- clean-host install script or checklist
- package/install validation path
- update README/install guidance only where the rehearsal proves a mismatch

Do not broaden into:

- public registry rollout automation
- root repo restructuring

### SNC-Milestone2-04 Durable Memory Diagnostics And Controls

Goal:

- strengthen the live durable-memory path with bounded observability and policy controls

Why later:

- the current path is already useful
- the most urgent gap is worker launch, not memory breadth

Likely scope:

- optional harvest/projection diagnostics
- bounded promotion/pruning notes
- explainable catalog hygiene

Do not broaden into:

- host memory-slot ownership
- helper-tool recall surface by default

### SNC-Milestone2-05 Helper-Tool Opt-In Pilot

Goal:

- revisit helper-tool registration only as an explicit opt-in pilot after the worker and delivery tracks are clearer

Why later:

- the accepted decision for `Milestone 1` was to defer runtime registration
- there is still no reason to widen default surface early

Likely scope:

- read-only SNC-owned artifact/state projection tools
- explicit config gate
- no MCP-first move

Do not broaden into:

- external-system mutation tools
- orchestration control tools
- public helper surface by default

## Current Recommendation

The next actual engineering order should be:

1. accept phase-12 closeout packets `57-60`
2. `SNC-Milestone2` release/admission decision
3. only if phase-12 acceptance proves a real gap, cut one last bounded closeout fix
4. keep `SNC-Milestone2-05` deferred unless release closeout unexpectedly justifies it

## Dispatcher Note

Round 3 is intentionally more product-directed than Round 2.

The main implementation pressure is no longer:

- "can the subsystem exist?"

It is now:

- "can the subsystem be used, trusted, and delivered cleanly?"

## Latest Reference

The current accepted controller-launch slice is documented in:

- `research/117_snc_controller_launch_path_v1.md`
- `research/139_snc_controller_launch_replay_governance_v1.md`
- `research/146_snc_worker_launch_result_host_wiring_v1.md`
- `research/153_snc_worker_followup_result_host_wiring_v1.md`
- `research/118_snc_worker_diagnostics_state_hygiene_v1.md`
- `research/125_snc_clean_host_delivery_rehearsal_v1.md`
- `research/132_snc_durable_memory_diagnostics_controls_v1.md`
- `research/160_snc_milestone2_closeout_gate.md`
