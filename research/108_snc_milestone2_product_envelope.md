# SYN-06 SNC Milestone 2 Product Envelope

## Purpose

This packet defines the bounded product envelope for `SNC Milestone 2`.

Its job is not to reopen the long-range custom-Claw architecture program.
Its job is to answer a narrower question:

- given the current SNC codebase and the accepted host/donor evidence
- what should `Milestone 2` actually present as a product
- what should be default-on
- what should stay opt-in
- what should remain explicitly deferred

## Scope

This packet synthesizes:

- current SNC plugin code under `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/*`
- `research/102_snc_milestone2_program.md`
- `research/103_snc_module_workorders_round3.md`
- `research/84_snc_milestone1_release_envelope.md`
- `research/90_oc10_runner_lifecycle_timing_matrix.md`
- `research/91_oc11_plugin_sdk_slot_stability_atlas.md`
- `research/105_oc12_worker_invocation_seam_matrix.md`
- `research/106_oc13_plugin_delivery_marketplace_rehearsal.md`
- `research/92_cc10_pressure_compaction_lifecycle_matrix.md`
- `research/93_cc11_memory_lifecycle_contract_matrix.md`
- `research/107_cc12_delegation_ownership_queue_matrix.md`

It stays focused on the `Milestone 2` product boundary.
It does not attempt to redefine the future specialization kernel or broaden SNC into a general control-plane product.

## Verified Structure / Lifecycle / Contract

### 1. The product unit is still one hot-pluggable context-engine plugin

Current code still points to one clear product unit:

- `extensions/snc/package.json`
- `extensions/snc/openclaw.plugin.json`
- `extensions/snc/index.ts`

Verified facts:

- `package.json` declares `openclaw.extensions = ["./index.ts"]`
- `openclaw.install.npmSpec = "openclaw-snc"`
- `openclaw.release.publishToNpm = true`
- `openclaw.plugin.json` declares plugin `id: "snc"` and `kind: "context-engine"`
- `index.ts` uses `definePluginEntry(...)` and `api.registerContextEngine(...)`

So `Milestone 2` is still a plugin product, not a host fork, not a memory-slot product, and not a separate worker-control service.

### 2. SNC is built on public host seams, not loader internals

The live SNC entry uses the public seams identified in `OC-11`:

- `definePluginEntry(...)`
- `OpenClawPluginApi`
- `registerContextEngine(...)`
- plugin manifest/config schema

This matches the current host-safe doctrine:

- extend through public SDK seams
- keep host ownership of runner, worker runtime, and install plumbing
- avoid binding SNC to loader/registry/runtime internals casually

That means the `Milestone 2` product envelope should remain "plugin-grade specialization layer", not "host-internal feature branch".

### 3. The current default core is continuity-first, not worker-first

`engine.ts` shows the live SNC core is still centered on context assembly and after-turn continuity:

- prompt-visible section assembly from configured brief/ledger/packet inputs
- session-state load/persist
- worker-state projection and completion fold-back
- durable-memory harvest/load/projection
- compaction cooperation through `delegateCompactionToRuntime(...)`
- runtime framing through `specializationMode`

But several of these are explicitly gated:

- `specializationMode` defaults to `auto`
- session state, worker state, and durable memory all return `null` when `stateDir` is absent
- hooks are only installed when `config.hooks.enabled === true`

So the correct product read is:

- the default SNC kernel is a context-engine continuity layer
- richer persistence and shaping behaviors remain configuration-mediated
- the live code does not support an "everything on, always active" interpretation

### 4. Worker substrate exists, but controller-issued launch is not yet the live product path

Current code contains real worker utilities:

- `src/worker-policy.ts`
- `src/worker-execution.ts`
- `src/worker-state.ts`

`worker-execution.ts` already builds a host launch plan that targets:

- `toolName: "sessions_spawn"`
- `runtime: "subagent"`
- `mode: "run"`
- `thread: false`

That lines up with `OC-12`, which verified:

- `sessions_spawn` is the real launch seam
- `sessions_yield` is the real wait seam
- `sessions_send` is follow-up, not launch
- `subagents` is control/list/kill/steer, not the primary launch path

But current plugin entry and engine code do not yet wire controller-issued helper launch into the live SNC control path.
Search results show `prepareSncWorkerLaunch(...)` is present in tests and utility modules, but not yet invoked from `engine.ts` or `index.ts`.

So the product-envelope implication is:

- bounded one-shot helper delegation belongs inside `Milestone 2`
- but today it is still a near-term product addition, not a completed default live surface

### 5. Hook shaping and lifecycle bookkeeping are intentionally opt-in

`index.ts` always calls `installSncHookScaffold(api, config)`, but `hook-scaffold.ts` immediately returns unless:

- `config.hooks.enabled === true`
- and `config.hooks.targets.length > 0`

When hooks are enabled without explicit targets, `config.ts` resolves a default target set:

- `before_message_write`
- `tool_result_persist`
- `session_end`
- `subagent_spawned`
- `subagent_ended`

This is strong code evidence that hook shaping/bookkeeping is meant to be available, but not forced on every SNC install.

So `Milestone 2` should preserve that posture:

- hooks are a supported opt-in layer
- not the required baseline for ordinary SNC adoption

### 6. Helper tools are real utilities but not a public runtime surface yet

`src/helper-tools.ts` defines read-only SNC helper tools:

- `snc_artifact_lookup`
- `snc_session_state_projection`

But current plugin registration does not expose them in `index.ts`.

That matches the `Milestone 2` program and workorder guidance:

- helper-tool exposure is lower priority
- any opening should be read-only
- it should remain opt-in
- it should not broaden into MCP-first expansion

So helper tools are real implementation assets, but they are not part of the default Milestone 2 product face.

### 7. Delivery expectations should now be ordinary-plugin expectations

`OC-13` and the SNC package metadata together give a clear delivery read:

- the user-facing contract is `openclaw plugins install/update/uninstall`
- copied package/path installs land in the managed host extensions area
- linked path install is a development lane
- update is only meaningful for tracked package-like sources
- the SNC package already declares an npm install identity

So the `Milestone 2` product envelope should present SNC as:

- a normal OpenClaw plugin
- installable without engineering-workspace knowledge
- documented through clean-host package/install guidance first

### 8. Donor evidence supports bounded worker and memory ownership, not expansion into a host subsystem

Accepted CC packets reinforce the current SNC direction:

- `CC-10`: pressure relief should prefer maintained artifacts and explicit post-compact reconstruction over host-loop rewrites
- `CC-11`: baseline memory, recall, session memory, and durable extraction are separate contracts
- `CC-12`: delegation ownership should use addressed routing and explicit controller/worker splits, not per-worker REPL ownership

This means the right `Milestone 2` product boundary is:

- stronger specialization behavior inside the plugin
- not takeover of host memory slots
- not a scheduler product
- not a broad teammate platform

## Default-On vs Opt-In Surface Proposal

### Default-on Milestone 2 surface

These should define the ordinary SNC product face for `Milestone 2`:

| Surface | Code evidence | Product posture |
| --- | --- | --- |
| Install as a normal OpenClaw plugin | `package.json`, `openclaw.plugin.json`, `OC-13` | default |
| Activate through `plugins.slots.contextEngine = "snc"` | manifest + `index.ts` | default |
| Continuity-oriented context assembly from configured brief/ledger/packet inputs | `engine.ts` | default |
| Neutral-by-default specialization behavior via `specializationMode: "auto"` | `config.ts`, `README.md` | default |
| Compaction cooperation through host runtime delegation | `engine.ts`, `OC-10` | default |
| Plugin-owned session continuity when `stateDir` is configured | `session-state.ts`, `engine.ts` | default recommended profile |
| Plugin-owned worker result fold-back and controller-state projection when `stateDir` is configured | `worker-state.ts`, `engine.ts`, `98` | default recommended profile |
| Plugin-owned durable-memory harvest/projection when `stateDir` is configured | `durable-memory.ts`, `engine.ts` | default recommended profile |
| Bounded controller-issued one-shot helper delegation once `Milestone2-01` lands | `worker-execution.ts`, `OC-12`, `CC-12` | default product behavior after landing |
| Worker diagnostics/state hygiene once `Milestone2-02` lands | `worker-state.ts`, `103` | default product behavior after landing |

Important nuance:

- `stateDir`-backed continuity is not unconditional in current code
- so the product default should be expressed as a recommended profile, not as a claim that persistence happens with zero configuration

### Opt-in Milestone 2 surface

These should remain supported but non-default:

| Surface | Code evidence | Product posture |
| --- | --- | --- |
| Hook shaping and worker lifecycle hook bookkeeping | `hook-scaffold.ts`, `config.ts` | opt-in |
| Explicit writing-first framing via `specializationMode: "writing"` | `config.ts` | opt-in |
| Read-only helper-tool exposure | `helper-tools.ts`, `103` | opt-in pilot |
| Aggressive or policy-changing durable-memory controls | `102`, `103` | opt-in / bounded |
| Linked source install | `OC-13` | developer-only convenience |
| Marketplace-first install path | `OC-13` | productization-later option |

### Explicitly not part of the Milestone 2 product envelope

- host memory-slot ownership
- recursive swarm orchestration as a default mode
- persistent/session-mode worker orchestration
- public MCP/helper-tool platform expansion
- gateway/service/control-plane productization
- general custom-Claw kernel extraction

## Key Findings

1. `Milestone 2` should still ship as one ordinary OpenClaw plugin, not as a host rewrite or sidecar service.
2. The right default product face is "continuity engine plus bounded controller/worker behavior", not "open every latent SNC utility as public surface".
3. `stateDir` is a real product boundary. Session continuity, worker state, and durable memory are all present in code, but they are part of the recommended profile rather than unconditional no-config behavior.
4. Hook shaping is explicitly designed as opt-in. Treating it as a mandatory baseline would contradict the current code contract.
5. Helper tools are donor-ready internal assets, but current code does not register them. They belong in a small opt-in pilot at most.
6. Clean-host package delivery is now part of the product envelope, not a release-afterthought.

## SNC relevance

This packet gives the practical product read for the next build:

- SNC should present itself as a specialized continuity plugin that still behaves like an ordinary OpenClaw extension
- the main `Milestone 2` upgrade is usable delegation plus diagnostics, not a sudden surface-area explosion
- persistence-backed continuity should be the recommended setup because that is where SNC's current code becomes materially stronger
- optional shaping and optional helper surfaces should stay clearly labeled as optional so the product remains predictable and host-safe

## Release / README / Demo Priorities

### Release priorities

1. lead with clean-host install and slot activation
2. make the recommended `stateDir` profile explicit
3. show worker delegation and diagnostics only after `Milestone2-01` and `Milestone2-02` are actually live
4. keep linked install, marketplace, and helper-tool pilot out of the main release story

### README priorities

The README for `Milestone 2` should emphasize:

- ordinary install path first
- `specializationMode: "auto"` as the safe default
- recommended `stateDir` configuration
- what hook shaping is and why it is optional
- what helper delegation does once landed
- what remains deferred

### Demo priorities

The cleanest Milestone 2 demo should be:

1. install SNC into a clean OpenClaw host
2. activate SNC as the context engine
3. show continuity across turns with `stateDir`
4. show bounded worker launch/result fold-back if the controller path is live
5. avoid turning the demo into a helper-tool or marketplace story

## Modification guidance

### Wrap / extend

- keep adding behavior through the current plugin/context-engine seam
- make controller-issued helper launch a bounded plugin behavior over `sessions_spawn` / `sessions_yield`, not a host scheduler rewrite
- keep diagnostics and state hygiene inside SNC-owned state files and context sections

### Defer

- defer helper-tool expansion to an explicit opt-in pilot
- defer marketplace-led distribution as a core Milestone 2 requirement
- defer any memory-slot takeover, worker-platform generalization, or control-plane ambitions

### Avoid

- do not treat internal utilities as product surface just because code exists
- do not let the product envelope drift from "specialized continuity plugin" into "general orchestration framework"
- do not collapse long-range custom-Claw architecture goals into the Milestone 2 release boundary

## Still-unverified questions

1. This packet does not verify the final landed shape of `SNC-Milestone2-01` and `SNC-Milestone2-02`; it defines the product envelope they should fit.
2. This packet does not verify whether `stateDir` should become a documented hard recommendation or an auto-provisioned default in a later round.
3. This packet does not verify public registry rollout or marketplace publication mechanics for SNC; it only positions them relative to the Milestone 2 envelope.
