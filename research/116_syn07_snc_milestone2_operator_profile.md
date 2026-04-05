# SYN-07 SNC Milestone 2 Operator Profile / StateDir Contract

## Purpose

This packet defines the bounded operator contract for `SNC Milestone 2`.

It is not a new architecture program.
It is not a new product envelope.
It answers a narrower phase-6 question:

- what should a real `Milestone 2` operator configure first
- what is truly default vs recommended vs opt-in
- what does `stateDir` actually gate in code
- what should README / demo / release language emphasize
- what must still stay deferred

## Scope

This packet synthesizes:

- current SNC code under `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/*`
- accepted phase-5 synthesis `research/108_snc_milestone2_product_envelope.md`
- accepted phase-6 host packets:
  - `research/113_oc14_subagent_completion_delivery_matrix.md`
  - `research/114_oc15_plugin_enablement_restart_matrix.md`
  - `research/115_cc13_delegation_followup_remote_control_matrix.md`
- current implementation packets:
  - `research/98_snc_worker_runtime_wiring_v1.md`
  - `research/117_snc_controller_launch_path_v1.md`
- milestone program/workorder framing:
  - `research/102_snc_milestone2_program.md`
  - `research/103_snc_module_workorders_round3.md`

It stays operator/product bounded.
It does not reopen long-range custom-Claw architecture or broaden SNC into a platform.

## Main Entry Files

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/index.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/openclaw.plugin.json`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/package.json`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/README.md`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/config.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/hook-scaffold.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/helper-tools.ts`

## Verified Structure / Lifecycle / Contract

### 1. The operator-facing product unit is still one ordinary OpenClaw plugin

Current code still points to the same bounded product unit:

- `package.json` declares OpenClaw extension entry `./index.ts`
- `openclaw.plugin.json` declares `id: "snc"` and `kind: "context-engine"`
- `index.ts` registers SNC through `definePluginEntry(...)` and `api.registerContextEngine(...)`

Operational implication:

- the operator contract begins with ordinary plugin install / enablement
- not with host patching
- not with memory-slot takeover
- not with a separate worker-control service

This remains consistent with accepted packets `30`, `32`, and `34`.

### 2. `stateDir` is the real persistence boundary in the live code

`openclaw.plugin.json` marks `stateDir` as optional, but the runtime behavior is much sharper than "optional nice-to-have."

Verified gates:

- `loadSncSessionState(...)` returns `null` when `stateDir` is absent
- `persistSncSessionState(...)` returns `null` when `stateDir` is absent
- `loadSncWorkerState(...)` returns `null` when `stateDir` is absent
- `persistSncWorkerState(...)` returns `null` when `stateDir` is absent
- `applySncWorkerCompletionEvents(...)` returns `null` when `stateDir` is absent
- `applySncWorkerSpawnedLifecycle(...)` returns `null` when `stateDir` is absent
- `applySncWorkerEndedLifecycle(...)` returns `null` when `stateDir` is absent
- `loadSncDurableMemoryCatalog(...)` returns `null` when `stateDir` is absent
- `persistSncDurableMemoryStore(...)` returns `null` when `stateDir` is absent
- hook-scaffold worker lifecycle handlers return early when `config.stateDir` is absent

Persisted paths are also explicit:

- session continuity -> `stateDir/sessions/*`
- worker controller state -> `stateDir/workers/*`
- durable memory -> `stateDir/durable-memory/*`

So `stateDir` is not just a storage preference.
It is the contract boundary between:

- ephemeral prompt-only SNC behavior
- and persistent continuity / worker / memory behavior

### 3. The live engine already treats `stateDir`-backed data as the richer path

`engine.ts` does not special-case these subsystems as separate optional plugins.
It reads them as part of one SNC continuity engine:

- load session state
- load worker state
- project `Worker launch lane`
- project `Worker controller`
- load durable memory and project a bounded durable-memory section
- persist session state after turn
- fold worker completion events after turn
- derive/persist worker launch intent after turn
- persist harvested durable-memory entries after turn

But all of that still flows through `this.config.stateDir`.

Operational implication:

- "ordinary SNC" and "strong SNC" are not two different products
- they are two different operator postures over the same plugin
- and `stateDir` is the main boundary between them

### 4. Default, recommended, and opt-in posture are not the same thing

The codebase and accepted packets together support this operator matrix:

| Posture | Config shape | What the operator gets | What the operator does not get |
| --- | --- | --- | --- |
| default-safe / smoke-test | install plugin, set `plugins.slots.contextEngine = "snc"`, leave persistence unset | ordinary context-engine activation, artifact-based prompt shaping, specialization fallback behavior | no persisted session continuity, no persisted worker controller state, no durable-memory catalog |
| recommended base `Milestone 2` profile | add `stateDir`, keep `specializationMode: "auto"` unless there is a reason to force otherwise | persisted continuity, worker-state fold-back, durable-memory reuse, operator-visible launch lane continuity across turns | no public helper-tool surface, no scheduler/control-plane behavior |
| recommended mixed-use profile | same as recommended base, but prefer `specializationMode: "general"` when the workspace is mostly normal engineering/daily assistant work | continuity behavior without forcing writing-first tone | no writing-first framing unless explicitly chosen |
| opt-in delegation-aware profile | recommended base plus `hooks.enabled = true` with bounded targets | richer worker lifecycle bookkeeping and bounded shaping behavior | still not a general worker dashboard or teammate platform |
| opt-in writing-heavy profile | recommended base plus writing artifacts and `specializationMode: "writing"` where justified | strongest writing-first continuity posture | still not memory-slot ownership or a host rewrite |

This keeps three things separate:

- what works with almost no config
- what `Milestone 2` should actually recommend
- what stays opt-in because it changes product feel or policy surface

### 5. Hooks remain opt-in even though they are useful

Code reality:

- `config.ts` resolves hooks to `enabled: false` unless explicitly turned on
- `installSncHookScaffold(...)` returns immediately unless `config.hooks.enabled === true` and `targets.length > 0`
- `openclaw.plugin.json` UI hint describes hooks as optional and disabled by default

Operator implication:

- hooks are part of the SNC toolbox
- but they are not the baseline contract of "SNC is installed"

There is one documentation tension worth calling out:

- `README.md` "Good First Config" turns hooks on
- the schema/help text and accepted product envelope still frame them as optional

That is not a code conflict, but it is an operator-guidance asymmetry.
For `Milestone 2`, the safer operator contract is:

- recommend `stateDir`
- keep hooks clearly labeled as opt-in

### 6. Worker visibility in `Milestone 2` is bounded continuity-state visibility, not platform control

Current SNC worker-facing behavior comes from accepted packet `98` and landed packet `117`:

- worker state is plugin-owned and persisted under `stateDir`
- `afterTurn(...)` folds pushed completion events into that state
- `afterTurn(...)` can also persist a queued helper launch intent
- `assemble(...)` projects both `Worker launch lane` and `Worker controller`

Accepted host packets sharpen the operator meaning:

- `sessions_spawn` is the launch seam
- `sessions_yield` is the wait seam
- completion comes back through host announce delivery
- `subagents` is control/list/kill/steer, not launch

Accepted donor packet `115` sharpens the negative boundary:

- SNC should not be explained as if it were a CC teammate/control platform
- `Milestone 2` worker behavior is bounded delegation plus bounded fold-back
- not a general messaging/resume/remote-control surface

So operator-visible worker behavior should be explained as:

- bounded one-shot helper launch guidance
- bounded worker-result fold-back
- bounded state hygiene / diagnostics

Not as:

- persistent worker roster management
- remote-control platform
- recursive swarm

### 7. Helper tools are still internal assets, not operator-facing runtime surface

`helper-tools.ts` defines:

- `snc_artifact_lookup`
- `snc_session_state_projection`

But current live boundaries matter more than their existence:

- `index.ts` does not register them
- `openclaw.plugin.json` exposes no helper-tool config surface
- accepted product envelope `108` keeps helper tools opt-in and lower priority

Operator implication:

- `Milestone 2` should not advertise helper tools as part of the default profile
- if they surface later, they should be described as a bounded opt-in pilot

### 8. Clean-host operator guidance should stay restart-oriented and ordinary

Accepted packet `114` already narrowed host operator reality:

- install/update/enable/disable/uninstall are config-plus-restart behaviors
- plugin CLI discovery can see post-write state immediately in a fresh CLI process
- the running gateway still needs restart to pick up enablement/config changes

That means the `Milestone 2` operator contract should keep saying:

- install SNC like a normal plugin
- enable `plugins.slots.contextEngine = "snc"`
- set a recommended `stateDir`
- restart the gateway after config changes

This is more useful than talking about loader internals or development-time `--link` behavior.

### 9. README / demo / release should emphasize the recommended profile, not the maximal surface

The strongest operator story supported by current code is:

1. install SNC as a normal OpenClaw plugin
2. enable the context-engine slot
3. configure `stateDir`
4. choose `specializationMode`
5. optionally enable hooks if you want extra shaping / worker lifecycle bookkeeping

The strongest demo story supported by current code is:

- mixed-use continuity that still behaves like an ordinary OpenClaw plugin
- one bounded helper-launch lane
- one bounded fold-back path
- persistence-backed continuity improvements from `stateDir`

The weakest demo/story choices right now would be:

- leading with helper tools
- leading with marketplace-first delivery
- implying recursive orchestration or a control platform
- talking as if hooks are mandatory

### 10. Explicitly deferred surfaces remain the same

Current code and accepted packets still support these defers:

- host memory-slot ownership
- public MCP/helper-tool export
- general worker scheduler ownership
- persistent/session-mode worker orchestration as the default mode
- remote-control/control-plane productization
- custom-Claw kernel extraction bundled into `Milestone 2`

## Key Findings

1. `stateDir` is the real `Milestone 2` operator contract boundary. Without it, SNC still runs, but most of the persistence-backed value collapses to `null` paths.
2. The right recommended profile is not the same as the zero-config default. `Milestone 2` should recommend `stateDir`, while still keeping hooks and helper surfaces clearly opt-in.
3. SNC worker visibility should be described as bounded continuity-state visibility over host worker seams, not as a new worker-control platform.

## SNC relevance

This packet is meant to keep the next release/readme/demo wave sharp.

Its direct value is:

- telling the main thread what configuration posture to recommend first
- preventing release language from over-claiming persistence or worker control
- keeping `Milestone 2` centered on continuity plus bounded delegation
- preserving room for future specialization-kernel work without polluting the current operator story

## Modification guidance

- `wrap / extend`
  - keep the operator contract centered on ordinary plugin install plus `contextEngine` slot activation
  - recommend `stateDir` as the normal `Milestone 2` operating posture
  - present `specializationMode` as the safe operator-level tone dial

- `defer`
  - public helper-tool exposure
  - marketplace-first productization
  - remote/non-local worker stories beyond bounded future research

- `avoid`
  - do not describe zero-config SNC as if it already includes durable continuity, worker-state persistence, and durable memory
  - do not present hooks as mandatory baseline behavior
  - do not explain `Milestone 2` as a control platform or generalized teammate system

## Still-unverified questions

1. This packet confirms the current operator contract from live code and accepted packets, but it does not decide the final README wording the dispatcher/main thread will ship.
2. `Milestone2-02` worker diagnostics may still justify a refined recommendation around exactly which hook targets should be suggested for delegation-aware operators.
3. If `Milestone2-05` reopens helper tools, the operator contract will need one more narrow update to reflect how that pilot is gated and documented.
