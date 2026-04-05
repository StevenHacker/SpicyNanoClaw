# External Thread Claim Catalog

## Purpose

This is the operational claim catalog for parallel main-thread collaboration.

Unlike `research/34_collab_workstreams.md`, this file is not only a research packetization note.
It is a live work-claim surface for other threads that will work in parallel with the dispatcher thread.

The goal is:

- fully deconstruct OpenClaw
- fully deconstruct CC
- convert that understanding into durable SNC improvements

Every claim here is chosen because it is useful to the actual engineering landing path.

## How To Claim

Other threads should claim work by number.

Example:

- claim `01`
- claim `08`
- claim `12`

## Global Rules For Claiming Threads

1. Read these baseline docs first:
   - `research/00_overview.md`
   - `research/39_openclaw_deconstruction_program.md`
   - `research/46_dispatch_cycle_002.md`
   - `research/52_openclaw_cc_migration_matrix.md`
2. Do not rewrite already-accepted canonical docs unless new evidence directly contradicts them.
3. Write only within the listed write scope.
4. Produce the designated output file.
5. End every research packet with `SNC relevance` and `modification guidance`.
6. For code packets, keep changes bounded and hot-pluggable by default.
7. Dispatcher thread remains the final acceptance and integration owner.

## Status Vocabulary

- `open`
- `claimed`
- `acceptance`
- `done`
- `blocked`

## Current Claim Packets

### 01. OC-06 UI / Product Surfaces

Status:

- `done`

Type:

- `research`

Repo:

- `OpenClaw`

Scope:

- `src/cli`
- `src/tui`
- `src/terminal`
- `src/interactive`
- `src/wizard`

Write scope:

- `research/54_oc06_ui_product_surfaces.md`

Why this matters:

- completes the missing OpenClaw product-facing packet
- tells us which user surfaces matter later for SNC productization
- helps separate host platform from host product shell

Required output:

- UI/product atlas
- author-workflow relevance note
- productization-later guidance
- `SNC relevance`

Acceptance:

- must distinguish core host UX from optional/productization-later UX

Dispatcher note:

- completed and accepted after breadth-packet acceptance pass

### 02. OC-07 Memory / Recall / Durable Memory Substrate

Status:

- `done`

Type:

- `research`

Repo:

- `OpenClaw`

Scope:

- `extensions/memory-core/*`
- `extensions/memory-lancedb/*`
- `src/plugins/memory-*`
- related `src/agents/memory-*`

Write scope:

- `research/55_oc07_memory_recall_substrate.md`

Why this matters:

- this is the most important remaining OpenClaw packet for future SNC durable memory work
- we need a host-grade read of memory capture, recall, indexing, freshness, and plugin/runtime boundaries

Required output:

- memory architecture map
- indexing/recall lifecycle map
- durable-memory extension seams
- what SNC should reuse vs not fight
- `SNC relevance`

Acceptance:

- must clearly separate tool-mediated recall, background sync, durable store management, and prompt-visible memory presentation

Dispatcher note:

- completed and accepted in dispatcher-owned cycle 004

### 03. OC-08 MCP / Tool / External Integration Fabric

Status:

- `done`

Type:

- `research`

Repo:

- `OpenClaw`

Scope:

- `src/mcp`
- tool-execution-adjacent surfaces under `src/plugins`, `src/agents`, `src/security`
- relevant bundled integration extensions

Write scope:

- `research/56_oc08_mcp_tool_integration_fabric.md`

Why this matters:

- SNC will increasingly depend on shaped tool output and possibly helper tools
- we need the host's true external-tool fabric, not just isolated hook reading

Required output:

- MCP/tool fabric map
- external integration lifecycle note
- safe shaping/control seams
- dangerous internals
- `SNC relevance`

Acceptance:

- must distinguish tool registration, tool execution, tool policy, and tool-result persistence layers

Dispatcher note:

- completed and accepted in dispatcher-owned cycle 004

### 04. OC-09 Gateway API / Daemon / Packaging Surface

Status:

- `done`

Type:

- `research`

Repo:

- `OpenClaw`

Scope:

- `src/gateway/*`
- `src/daemon/*`
- packaging/boot surfaces not already settled in config/security packet

Write scope:

- `research/57_oc09_gateway_daemon_packaging.md`

Why this matters:

- needed for future SNC deployment and productization beyond local runner use
- complements, but should not duplicate, `OC-03` and `OC-05`

Required output:

- daemon/gateway packaging map
- remote control / service exposure note
- deployment constraints
- `SNC relevance`

Acceptance:

- must focus on deployment and control-plane surfaces, not reopen session identity work

Dispatcher note:

- completed and accepted in dispatcher-owned cycle 004

### 05. CC-03 Command / Product Shell Atlas

Status:

- `done`

Type:

- `research`

Repo:

- `CC`

Scope:

- `src/commands/*`
- CLI/screen/output-style/product-shell command families

Write scope:

- `research/58_cc03_command_product_shell.md`

Why this matters:

- separates perceived CC quality that comes from shell design rather than runtime harness

Required output:

- command-family atlas
- shell donor note
- runtime-value vs shell-value separation
- `SNC relevance`

Acceptance:

- must not drift back into query/runtime core already covered by `CC-01` and `CC-02`

Dispatcher note:

- completed and accepted after breadth-packet acceptance pass

### 06. CC-04 Remote / Server / Service Layer

Status:

- `done`

Type:

- `research`

Repo:

- `CC`

Scope:

- `src/server/*`
- `src/services/api/*`
- remote/bridge/upstream surfaces

Write scope:

- `research/59_cc04_remote_service_layer.md`

Why this matters:

- helps isolate which CC behaviors depend on service architecture rather than local harness design

Required output:

- remote/service atlas
- service-dependency note
- donor-risk note
- `SNC relevance`

Acceptance:

- must distinguish local-runtime donor ideas from service-only behaviors

Dispatcher note:

- completed and accepted after breadth-packet acceptance pass

### 07. CC-05 Governance / Settings / Policy

Status:

- `done`

Type:

- `research`

Repo:

- `CC`

Scope:

- settings surfaces
- policy surfaces
- remote-managed settings
- permission/privacy-adjacent controls

Write scope:

- `research/60_cc05_governance_settings_policy.md`

Why this matters:

- later borrowing decisions improve if we know which CC behavior is runtime logic versus governance enforcement

Required output:

- governance map
- settings/policy boundary map
- runtime-vs-governance separation
- `SNC relevance`

Acceptance:

- must stay governance-focused rather than broad shell wandering

Dispatcher note:

- completed and accepted after breadth-packet acceptance pass

### 08. CC-06 Memory Presentation Modes / Feature-Gate Matrix

Status:

- `done`

Type:

- `research`

Repo:

- `CC`

Scope:

- `QueryEngine`
- `query.ts`
- `utils/claudemd.ts`
- `memdir/*`
- `attachments/*`
- memory-related feature gates such as `tengu_moth_copse`

Write scope:

- `research/61_cc06_memory_mode_feature_matrix.md`

Why this matters:

- this is the most important remaining CC packet for SNC durable memory design
- we need a crisp matrix of baseline injection, relevant-memory attachments, extraction mode, and gating

Required output:

- memory-presentation matrix
- feature-gate matrix
- dominant-mode note
- migration guidance for SNC durable memory

Acceptance:

- must distinguish:
  - baseline memory injection
  - relevant-memory attachment recall
  - extraction mode
  - prompt-only behavior versus runtime-gated behavior

Dispatcher note:

- completed and accepted in dispatcher-owned cycle 004

### 09. CC-07 Secondary Intelligence Layers

Status:

- `done`

Type:

- `research`

Repo:

- `CC`

Scope:

- analytics
- agent summary
- tool-use summary
- suggestions
- MagicDocs / tips / similar layers

Write scope:

- `research/62_cc07_secondary_intelligence_layers.md`

Why this matters:

- helps explain product feel that is not part of core harness

Required output:

- secondary-intelligence atlas
- donor-value note
- non-core pattern summary
- `SNC relevance`

Acceptance:

- must not confuse product feel layers with core runtime harness

Dispatcher note:

- completed and accepted after breadth-packet acceptance pass

### 10. CC-08 Tasks / Background / Subagent Infrastructure Deep Packet

Status:

- `done`

Type:

- `research`

Repo:

- `CC`

Scope:

- `src/tasks/*`
- task runtime
- background/local main session flows
- stop/interrupt paths
- subagent-adjacent infrastructure beyond what `CC-01` already summarized

Write scope:

- `research/63_cc08_task_subagent_infra.md`

Why this matters:

- this is the cleanest donor lane for future SNC multi-worker orchestration

Required output:

- task/subagent infrastructure map
- queue/ownership/interrupt note
- durable donor patterns
- `SNC relevance`

Acceptance:

- must deepen task/subagent infra specifically rather than restating all of `CC-01`

Dispatcher note:

- completed and accepted in dispatcher-owned cycle 004

### 11. SNC-07 Transcript Shaping Utility

Status:

- `done`

Type:

- `implementation`

Repo:

- `SNC working host copy`

Write scope:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/transcript-shaping.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/transcript-shaping.test.ts`
- `research/64_snc_transcript_shaping_utility.md`

Why this matters:

- directly supports the current migration frontier
- keeps code changes bounded and hot-pluggable

Required output:

- utility module that classifies and rewrites assistant planning/meta chatter into bounded forms
- focused tests
- short design note

Acceptance:

- do not wire it into hooks yet
- do not edit `hook-scaffold.ts`
- keep ownership to new utility files only

Dispatcher note:

- completed and accepted in dispatcher-owned cycle 003

### 12. SNC-08 Replacement Ledger Utility

Status:

- `done`

Type:

- `implementation`

Repo:

- `SNC working host copy`

Write scope:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/replacement-ledger.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/replacement-ledger.test.ts`
- `research/65_snc_replacement_ledger_utility.md`

Why this matters:

- directly supports deterministic shaping and frozen replacement decisions across turns

Required output:

- plugin-owned replacement ledger utility
- serialization/reconstruction helpers
- focused tests
- short design note

Acceptance:

- do not wire it into hook registration yet
- keep ownership to new utility files only

Dispatcher note:

- completed and accepted in dispatcher-owned cycle 003

### 13. SNC-09 Hook Shaping Integration

Status:

- `done`

Type:

- `implementation`

Repo:

- `SNC working host copy`

Depends on:

- `11`
- `12`

Write scope:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/hook-scaffold.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/config.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/hook-scaffold.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/config.test.ts`
- `research/66_snc_hook_shaping_integration.md`

Why this matters:

- this is the first true implementation frontier identified by the migration matrix

Required output:

- replace scaffold no-op behavior with bounded shaping behavior
- keep it config-gated and disabled by default
- add minimal circuit-breaker/state guards if needed

Acceptance:

- do not take host compaction ownership
- do not broaden into durable memory
- keep integration bounded to hook layer

Dispatcher note:

- completed and accepted in dispatcher-owned cycle 003

### 14. SNC-10 Durable Memory V1 Design Packet

Status:

- `done`

Type:

- `research/design`

Repo:

- `Both`

Depends on:

- `02`
- `08`

Write scope:

- `research/67_snc_durable_memory_v1_design.md`

Why this matters:

- this is the next major SNC layer after transcript shaping settles

Required output:

- durable memory v1 design
- OpenClaw-host fit
- CC donor fit
- what stays hot-pluggable
- what is explicitly deferred

Acceptance:

- must build on host and donor evidence, not on generic memory-system intuition

Dispatcher note:

- completed and accepted by dispatcher main thread after cycle 004 evidence closed

### 15. SNC-11 Acceptance / Benchmark Harness V2

Status:

- `done`

Type:

- `implementation/support`

Repo:

- `SNC working host copy`

Write scope:

- `scripts/validate_snc_focus_v2.ps1`
- `research/68_snc_acceptance_matrix.md`

Why this matters:

- we need a repeatable, narrower acceptance gate as SNC gains transcript-shaping behavior

Required output:

- focused acceptance script
- acceptance matrix covering shaping, state continuity, and no-regression basics

Acceptance:

- do not replace the existing dispatcher validation helper
- add a narrower companion gate

Dispatcher note:

- completed and accepted in dispatcher-owned cycle 003

### 16. SNC-12 Multi-Worker Orchestration V1 Design Packet

Status:

- `done`

Type:

- `research/design`

Repo:

- `Both`

Depends on:

- `03`
- `10`

Write scope:

- `research/72_snc_multiworker_v1_design.md`

Why this matters:

- SNC now has accepted evidence for both OpenClaw tool fabric and CC task/subagent infrastructure
- that is enough to design a first bounded SNC multi-worker model without guessing

Required output:

- orchestration v1 design
- host fit and ownership model
- worker identity / queue / abort model
- what stays hot-pluggable
- what is explicitly deferred
- `SNC relevance`

Acceptance:

- must build on accepted host/donor evidence, not assume host runtime rewrite
- must clearly separate dispatcher-thread collaboration from in-product SNC worker orchestration if both are discussed

Dispatcher note:

- completed and accepted in dispatcher-owned cycle 005

### 17. SNC-13 Tool Shaping / Helper Tools V1 Design Packet

Status:

- `done`

Type:

- `research/design`

Repo:

- `Both`

Depends on:

- `03`

Write scope:

- `research/73_snc_tool_shaping_helper_tools_v1.md`

Why this matters:

- hook shaping is landed, and OpenClaw tool/MCP fabric now has an accepted packet
- this is the cleanest path for deciding how far SNC should go on tool shaping and helper-tool design without overreaching into host internals

Required output:

- tool-shaping policy map
- helper-tool / MCP lane
- safe seams
- no-go internals
- relationship to hook shaping and durable memory
- `SNC relevance`

Acceptance:

- must separate `before_tool_call`, `tool_result_persist`, external-content wrapping, MCP exposure, and dangerous-tool policy
- must stay host-safe and hot-pluggable by default

Dispatcher note:

- completed and accepted in dispatcher-owned cycle 005

### 18. SYN-03 OpenClaw Modification Atlas

Status:

- `done`

Type:

- `research/synthesis`

Repo:

- `OpenClaw`

Depends on:

- `01`
- `02`
- `03`
- `04`

Write scope:

- `research/78_openclaw_modification_atlas.md`

Why this matters:

- converts the existing OpenClaw deconstruction packets into a real modification playbook
- tells us what should be wrapped, extended, left alone, or only changed with hard evidence
- directly supports both SNC landing and the longer-range goal of building many specialized Claw variants

Required output:

- host seam atlas
- subsystem-by-subsystem modification matrix
- hot-pluggable vs host-internal decision rules
- risk/stability notes
- `SNC relevance`

Acceptance:

- must be actionable by subsystem rather than only descriptive
- must clearly distinguish:
  - safe plugin seams
  - context-engine/hook seams
  - host-owned high-risk internals
  - productization-later surfaces

Dispatcher note:

- completed and accepted in dispatcher-owned cycle 006

### 19. CC-09 Harness Design Codex

Status:

- `done`

Type:

- `research/synthesis`

Repo:

- `CC`

Depends on:

- `05`
- `06`
- `07`
- `08`
- `09`
- `10`

Write scope:

- `research/79_cc_harness_design_codex.md`

Why this matters:

- we do not only want isolated donor notes
- we want a durable codex of CC harness ideas that can guide future specialized Claw products beyond SNC

Required output:

- harness principle catalog
- donor-value separation:
  - runtime harness
  - shell/product feel
  - service architecture
  - governance/policy
  - secondary intelligence
- transferability grades:
  - borrow now
  - borrow later
  - do not borrow literally
- `SNC relevance`

Acceptance:

- must separate real harness ideas from product-shell polish
- must be reusable as a future donor handbook, not only an SNC memo

Dispatcher note:

- completed and accepted in dispatcher-owned cycle 006

### 20. SYN-04 Custom Claw Architecture Program

Status:

- `done`

Type:

- `research/design`

Repo:

- `Both`

Depends on:

- `18`
- `19`

Write scope:

- `research/80_custom_claw_architecture_program.md`

Why this matters:

- SNC is the current milestone, not the final horizon
- we need a larger architecture read for building future specialized Claw variants on top of OpenClaw

Required output:

- future-Claw layered architecture
- kernel vs specialization boundary
- reusable capability taxonomy
- migration path from SNC Milestone 1 toward broader custom Claw products
- `SNC relevance`

Acceptance:

- must build on accepted OpenClaw and CC synthesis packets
- must be architecture-grade rather than a feature wishlist

Dispatcher note:

- completed and accepted on the dispatcher main thread after acceptance of `18` and `19`

### 21. SNC-14 Durable Memory Core Utility

Status:

- `done`

Type:

- `implementation`

Repo:

- `SNC working host copy`

Depends on:

- `14`

Write scope:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.test.ts`
- `research/81_snc_durable_memory_core_utility.md`

Why this matters:

- this is the first concrete engineering cut for durable memory v1
- it keeps the work bounded and hot-pluggable before dispatcher-led integration

Required output:

- plugin-local durable-memory utility
- harvest helpers over SNC-owned session artifacts
- local store/read/projection helpers
- focused tests
- short design/usage note

Acceptance:

- do not take OpenClaw memory-slot ownership
- do not edit host memory plugins
- do not wire the new utility into `engine.ts` or `config.ts`
- keep ownership to the listed utility files only

Dispatcher note:

- completed and accepted in dispatcher-owned cycle 006

### 22. SNC-15 Helper Tools Utility

Status:

- `done`

Type:

- `implementation`

Repo:

- `SNC working host copy`

Depends on:

- `17`

Write scope:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/helper-tools.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/helper-tools.test.ts`
- `research/82_snc_helper_tools_utility.md`

Why this matters:

- gives SNC a bounded, read-only helper-tool layer over SNC-owned artifacts without immediately broadening host ownership

Required output:

- helper-tool builders for SNC-owned artifacts/session-state projection
- read-only behavior only
- focused tests
- short design/usage note

Acceptance:

- do not register tools into plugin entry yet
- do not edit host dangerous-tool policy
- do not broaden into MCP export yet
- keep ownership to the listed utility files only

Dispatcher note:

- completed and accepted in dispatcher-owned cycle 006

### 23. SNC-16 Multi-Worker Policy Utility

Status:

- `done`

Type:

- `implementation`

Repo:

- `SNC working host copy`

Depends on:

- `16`

Write scope:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-policy.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-policy.test.ts`
- `research/83_snc_multiworker_policy_utility.md`

Why this matters:

- turns the accepted orchestration design into reusable bounded policy primitives before any host-tool integration

Required output:

- worker-role/job-contract types
- spawn-brief helpers
- controller-side tracking helpers
- result-fold-back helpers
- focused tests
- short design/usage note

Acceptance:

- do not wire into host session tools yet
- do not edit `engine.ts` or host runtime files
- keep ownership to the listed utility files only

Dispatcher note:

- completed and accepted in dispatcher-owned cycle 006

### 24. OPS-05 SNC Milestone 1 Release Envelope

Status:

- `done`

Type:

- `research/support`

Repo:

- `Both`

Write scope:

- `research/84_snc_milestone1_release_envelope.md`

Why this matters:

- we are approaching the first version worth pushing
- repo hygiene, canonical boundaries, and release gates should be explicit before integration expands again

Required output:

- milestone-1 release boundary
- canonical repo-content proposal
- validation gate checklist
- push/readme/release hygiene recommendations
- `SNC relevance`

Acceptance:

- must be specific to the current repo/program state
- must separate working-host references, durable research assets, and release-worthy project content

Dispatcher note:

- completed and accepted on the dispatcher main thread before the Milestone 1 release-candidate push

### 25. OC-10 Runner Lifecycle Timing Matrix

Status:

- `done`

Type:

- `research`

Repo:

- `OpenClaw`

Write scope:

- `research/90_oc10_runner_lifecycle_timing_matrix.md`

Why this matters:

- we still have one high-value host-kernel ambiguity lane
- future SNC integration work benefits from an exact matrix for:
  - normal turn
  - timeout recovery
  - overflow recovery
  - compaction
  - maintenance
  - hook timing

Required output:

- exact lifecycle matrix
- branch-by-branch timing notes
- safe integration implications
- `SNC relevance`

Acceptance:

- must distinguish normal turn, timeout path, overflow path, and delegated compaction path
- must stay anchored to code order, not broad summaries

Dispatcher note:

- completed and accepted in the first Milestone-2-directed external-thread acceptance wave

### 26. OC-11 Plugin SDK / Slot Stability Atlas

Status:

- `done`

Type:

- `research`

Repo:

- `OpenClaw`

Write scope:

- `research/91_oc11_plugin_sdk_slot_stability_atlas.md`

Why this matters:

- long-range custom-Claw work needs a clearer read on which plugin/sdk seams are stable public extension surfaces and which are likely host-internal churn zones

Required output:

- plugin-sdk seam atlas
- slot/manifest/api-builder stability notes
- stable-public vs likely-churn separation
- `SNC relevance`

Acceptance:

- must distinguish:
  - public extension surfaces we should build on
  - registry/loader/slot internals we should avoid depending on casually

Dispatcher note:

- completed and accepted in the first Milestone-2-directed external-thread acceptance wave

### 27. CC-10 Pressure / Compaction Lifecycle Matrix

Status:

- `done`

Type:

- `research`

Repo:

- `CC`

Write scope:

- `research/92_cc10_pressure_compaction_lifecycle_matrix.md`

Why this matters:

- the harness codex is strong at the principle level
- we still want one exact call-chain matrix for pressure relief, compaction, and maintained-artifact reuse

Required output:

- exact pressure/compaction matrix
- trigger order
- maintained-artifact reuse notes
- failure/circuit-breaker notes
- `SNC relevance`

Acceptance:

- must stay exact on lifecycle and trigger ordering
- must not drift into general product-shell recap

Dispatcher note:

- completed and accepted in the first Milestone-2-directed external-thread acceptance wave

### 28. CC-11 Memory Lifecycle Contract Matrix

Status:

- `done`

Type:

- `research`

Repo:

- `CC`

Write scope:

- `research/93_cc11_memory_lifecycle_contract_matrix.md`

Why this matters:

- we already understand the donor shape at a high level
- the next value is an exact contract read across baseline memory, selective recall, extraction, stop hooks, and sidecar windows

Required output:

- exact memory lifecycle matrix
- ownership/timing by layer
- baseline vs recall vs extraction separation
- `SNC relevance`

Acceptance:

- must stay contract-accurate and timing-accurate
- must distinguish current-session memory from durable-memory paths

Dispatcher note:

- completed and accepted in the first Milestone-2-directed external-thread acceptance wave

### 29. OC-12 Worker Invocation Seam Matrix

Status:

- `done`

Type:

- `research`

Repo:

- `OpenClaw`

Write scope:

- `research/105_oc12_worker_invocation_seam_matrix.md`

Why this matters:

- `Milestone 2` needs the exact host seams for real controller-issued helper delegation
- current design and scaffolding are strong, but the final launch path still benefits from one precise host packet

Required output:

- exact worker invocation seam map
- `sessions_spawn` / `sessions_yield` / `sessions_send` / `subagents` timing and contract notes
- hook and completion-event interaction notes
- safe launch-path implications
- `SNC relevance`

Acceptance:

- must stay code-order accurate
- must distinguish:
  - launch
  - wait/yield
  - follow-up
  - kill/steer
  - pushed completion handling

Dispatcher note:

- completed and accepted in the second Milestone-2-directed external-thread acceptance wave

### 30. OC-13 Plugin Delivery / Marketplace Rehearsal Packet

Status:

- `done`

Type:

- `research/support`

Repo:

- `OpenClaw`

Write scope:

- `research/106_oc13_plugin_delivery_marketplace_rehearsal.md`

Why this matters:

- `Milestone 2` needs a more ordinary delivery story than "install it from the engineering workspace"
- we now need the host's real plugin delivery/update surfaces, not only runtime seams

Required output:

- plugin delivery/install/update lane map
- local archive vs linked path vs registry path comparison
- marketplace/release implications
- clean-host rehearsal guidance
- `SNC relevance`

Acceptance:

- must stay delivery-focused
- must distinguish user-facing install/update surfaces from internal package plumbing

Dispatcher note:

- completed and accepted in the second Milestone-2-directed external-thread acceptance wave

### 31. CC-12 Delegation Ownership / Addressed Queue Matrix

Status:

- `done`

Type:

- `research`

Repo:

- `CC`

Write scope:

- `research/107_cc12_delegation_ownership_queue_matrix.md`

Why this matters:

- `Milestone 2` worker work now needs the exact CC donor mechanics for ownership, addressing, queue separation, and stop semantics
- principle-level donor notes are no longer enough

Required output:

- delegation ownership matrix
- addressed queueing / agent-id routing notes
- stop/interrupt/kill separation
- controller vs worker responsibility split
- `SNC relevance`

Acceptance:

- must stay exact on ownership and queue mechanics
- must not drift into generic product-shell recap

Dispatcher note:

- completed and accepted in the second Milestone-2-directed external-thread acceptance wave

### 32. SYN-06 SNC Milestone 2 Product Envelope

Status:

- `done`

Type:

- `research/synthesis`

Repo:

- `Both`

Depends on:

- `25`
- `29`
- `30`
- `31`

Write scope:

- `research/108_snc_milestone2_product_envelope.md`

Why this matters:

- `Milestone 2` needs a bounded product envelope the same way `Milestone 1` needed a release envelope
- without this packet, runtime work can easily widen into premature platform work

Required output:

- milestone-2 product boundary
- default-on vs opt-in surface proposal
- release/readme/demo priorities
- what remains explicitly deferred to later specialization-kernel work
- `SNC relevance`

Acceptance:

- must synthesize current host/donor evidence
- must keep product boundary separate from long-range architecture ambition

Dispatcher note:

- completed and accepted in the second Milestone-2-directed external-thread acceptance wave

### 33. OC-14 Subagent Completion Delivery / Announce Dispatch Matrix

Status:

- `done`

Type:

- `research`

Repo:

- `OpenClaw`

Depends on:

- `29`

Write scope:

- `research/113_oc14_subagent_completion_delivery_matrix.md`

Why this matters:

- `Milestone 2` worker launch is now structurally clear, but the downstream completion-delivery path is still the sharpest remaining OpenClaw worker ambiguity
- worker diagnostics and future controller follow-up both benefit from an exact read of announce dispatch rather than a broad registry summary

Required output:

- exact subagent completion-delivery matrix
- `subagent-announce` / dispatch queue-mode notes
- direct-delivery vs queued-delivery branch notes
- deferred `subagent_ended` / `contextEngine.onSubagentEnded(...)` ordering notes
- `SNC relevance`

Acceptance:

- must stay code-order accurate
- must distinguish:
  - registered-run announce flow
  - ACP parent-stream flow
  - direct requester delivery
  - queued requester delivery
  - delivery-target overrides

Dispatcher note:

- completed and accepted in the first Phase-6 acceptance pass

### 34. OC-15 Plugin Enablement / Restart / Reload Matrix

Status:

- `done`

Type:

- `research/support`

Repo:

- `OpenClaw`

Depends on:

- `30`

Write scope:

- `research/114_oc15_plugin_enablement_restart_matrix.md`

Why this matters:

- `Milestone 2` clean-host delivery still needs the exact host behavior after install, enable, update, disable, and uninstall
- install lanes are now mapped, but operator reality still depends on config activation and restart/reload timing

Required output:

- install-enable-restart matrix
- slot activation/config-write notes
- update/disable/uninstall timing notes
- restart-required vs immediate-effect notes
- clean-host operator guidance
- `SNC relevance`

Acceptance:

- must stay delivery/enablement focused
- must distinguish:
  - package install
  - config activation
  - gateway restart or reload requirements
  - runtime discovery visibility

Dispatcher note:

- completed and accepted in the first Phase-6 acceptance pass

### 35. CC-13 Delegation Follow-Up / Remote-Agent Control Matrix

Status:

- `done`

Type:

- `research`

Repo:

- `CC`

Depends on:

- `31`

Write scope:

- `research/115_cc13_delegation_followup_remote_control_matrix.md`

Why this matters:

- `CC-12` closed ownership and addressed queueing, but future SNC worker design still benefits from one exact donor packet for follow-up, remote-agent targeting, and control-surface separation
- this packet serves long-range harness mastery more than immediate feature breadth

Required output:

- local-agent vs teammate vs remote-agent follow-up matrix
- `SendMessage` / resume / targeting / control notes
- remote-control donor-value separation
- what is worth borrowing later vs what is service/product-shell coupled
- `SNC relevance`

Acceptance:

- must stay exact on control/follow-up mechanics
- must distinguish:
  - running-worker follow-up
  - completed-worker resume
  - remote-agent control
  - shutdown/approval/control surfaces

Dispatcher note:

- completed and accepted in the first Phase-6 acceptance pass

### 36. SYN-07 SNC Milestone 2 Operator Profile / StateDir Contract

Status:

- `done`

Type:

- `research/synthesis`

Repo:

- `Both`

Depends on:

- `32`
- `33`
- `34`
- `35`

Write scope:

- `research/116_syn07_snc_milestone2_operator_profile.md`

Why this matters:

- `Milestone 2` now needs a sharper operator contract, not just an architecture or product envelope
- the next release/readme/demo wave needs one bounded synthesis for:
  - recommended `stateDir` profile
  - mixed-use specialization posture
  - worker visibility expectations
  - clean-host operating assumptions

Required output:

- operator-profile boundary
- `stateDir` recommendation matrix
- default vs recommended vs opt-in config posture
- release/readme/demo guidance
- what stays explicitly deferred
- `SNC relevance`

Acceptance:

- must stay operator/product bounded
- must not reopen long-range custom-Claw architecture
- must build on accepted host/donor packets rather than preference alone

Dispatcher note:

- completed and accepted in the first Phase-6 acceptance pass

### 37. OC-16 ContextEngine Slot Lifecycle / Cleanup Symmetry Matrix

Status:

- `done`

Type:

- `research/support`

Repo:

- `OpenClaw`

Depends on:

- `34`

Write scope:

- `research/121_oc16_contextengine_slot_lifecycle_matrix.md`

Why this matters:

- `Milestone 2` clean-host delivery is close to implementation contact
- `OC-15` confirmed generic slot selection on install/enable, but left one exact operator-risk lane open:
  - how `contextEngine` slot ownership behaves across disable, uninstall, update, and competing replacement installs

Required output:

- exact `contextEngine` slot lifecycle matrix
- install/enable/disable/uninstall/update cleanup notes
- conflict/reselection notes when multiple context-engine plugins exist
- safe operator guidance for swapping SNC in and out
- `SNC relevance`

Acceptance:

- must stay slot-lifecycle focused
- must distinguish:
  - slot selection
  - plugin enabled state
  - uninstall cleanup
  - reselection after competing installs

### 38. OC-17 Config Path / ResolvePath / StateDir Contract Matrix

Status:

- `done`

Type:

- `research/support`

Repo:

- `Both`

Depends on:

- `36`

Write scope:

- `research/122_oc17_config_path_statedir_matrix.md`

Why this matters:

- `SYN-07` proved that `stateDir` is the real `Milestone 2` operator boundary
- the next README/demo/release wave needs exact path-resolution guidance instead of implied workspace-relative assumptions

Required output:

- host/plugin config path resolution matrix
- relative vs absolute path handling notes for SNC config fields
- `stateDir` operator guidance tied to actual resolution behavior
- clean-host path/profile recommendations
- `SNC relevance`

Acceptance:

- must stay config/path contract focused
- must distinguish:
  - host config location
  - plugin config value resolution
  - relative path behavior
  - operator recommendations versus code facts

### 39. CC-14 Memory Hygiene / Pruning / Explainability Matrix

Status:

- `done`

Type:

- `research`

Repo:

- `CC`

Depends on:

- `28`

Write scope:

- `research/123_cc14_memory_hygiene_explainability_matrix.md`

Why this matters:

- `Milestone 2` still has a durable-memory diagnostics/control lane ahead
- current donor understanding is strong on lifecycle, but weaker on stale-memory avoidance, pruning, dedupe, and operator-legible memory quality signals

Required output:

- durable-memory hygiene matrix
- pruning/dedupe/update rules
- explainability or inspectability surfaces around memory quality
- what is donor-value versus product-shell dressing
- `SNC relevance`

Acceptance:

- must stay memory-hygiene focused
- must distinguish:
  - extraction/update rules
  - dedupe/pruning behavior
  - operator/main-agent visibility
  - donor value versus service/product coupling

### 40. SYN-08 SNC Milestone 2 Delivery / Docs Envelope

Status:

- `done`

Type:

- `research/synthesis`

Repo:

- `Both`

Depends on:

- `34`
- `36`
- `37`
- `38`

Write scope:

- `research/124_syn08_snc_milestone2_delivery_docs_envelope.md`

Why this matters:

- the next main-thread engineering cut is moving closer to clean-host delivery rehearsal
- we need a bounded synthesis packet for install docs, demo order, config recommendations, and what *not* to promise yet

Required output:

- `Milestone 2` delivery/docs boundary
- README/demo/install priority guidance
- recommended first-run profile
- explicit non-promises / deferred surfaces
- `SNC relevance`

Acceptance:

- must stay release/docs/operator bounded
- must not reopen long-range kernel architecture
- must synthesize accepted host/operator packets rather than preference alone

## Current Claim Packets

### 41. OC-18 Plugin Diagnostics / Doctor / Config-Validate Surface Matrix

Status:

- `done`

Type:

- `research/support`

Repo:

- `OpenClaw`

Depends on:

- `34`
- `37`

Write scope:

- `research/128_oc18_plugin_diagnostics_doctor_matrix.md`

Why this matters:

- phase 7 closed slot/path reality, but the next operator question is what the host already exposes for diagnosing bad plugin state
- `Milestone 2` support/docs can be sharper if we know exactly what `plugins inspect`, `plugins doctor`, and `config validate` can already prove

Required output:

- plugin diagnostics surface matrix
- `inspect` / `doctor` / `config validate` contract summary
- which host diagnostics can already catch stale slot or bad config situations
- what still requires SNC-local guidance
- `SNC relevance`

Acceptance:

- must stay support/diagnostics focused
- must distinguish:
  - discovery/status
  - validation
  - doctor-style diagnostics
  - what is host-provided versus SNC-doc-only

### 42. OC-19 Gateway Launch / Working-Directory Matrix

Status:

- `done`

Type:

- `research/support`

Repo:

- `OpenClaw`

Depends on:

- `34`
- `38`

Write scope:

- `research/129_oc19_gateway_working_directory_matrix.md`

Why this matters:

- `OC-17` proved SNC paths are plugin-resolver/CWD-relative
- the next missing precision is how actual gateway launch lanes set or inherit working directory in CLI, daemon, and service-adjacent flows

Required output:

- gateway launch / working-directory matrix
- CLI vs daemon/service lane comparison
- what is code-verified versus still deployment-specific
- operator-safe path guidance implications
- `SNC relevance`

Acceptance:

- must stay launch/CWD focused
- must distinguish:
  - config path discovery
  - process CWD
  - deployment/service assumptions
  - what remains unverified outside repo code

### 43. CC-15 SessionMemory / ExtractMemories Failure-Skip-Control Matrix

Status:

- `done`

Type:

- `research`

Repo:

- `CC`

Depends on:

- `28`
- `39`

Write scope:

- `research/130_cc15_memory_failure_skip_control_matrix.md`

Why this matters:

- the next SNC durable-memory cut needs donor precision not only on hygiene, but on when memory maintenance should deliberately skip, back off, or stop
- current donor read is strong on lifecycle and hygiene, but weaker on failure/skip-control behavior

Required output:

- SessionMemory skip/failure/update-control matrix
- extractMemories skip/backoff/short-circuit matrix
- where CC avoids maintenance thrash or useless writes
- donor-value versus product-shell/service coupling
- `SNC relevance`

Acceptance:

- must stay failure/skip/control focused
- must distinguish:
  - SessionMemory
  - durable extraction
  - main-agent short-circuit rules
  - donor value versus shell convenience

### 44. SYN-09 SNC Durable-Memory Operator Envelope

Status:

- `done`

Type:

- `research/synthesis`

Repo:

- `Both`

Depends on:

- `39`
- `41`
- `42`
- `43`

Write scope:

- `research/131_syn09_snc_durable_memory_operator_envelope.md`

Why this matters:

- the next main-thread engineering cut is `SNC-Milestone2-04 Durable Memory Diagnostics And Controls`
- we need a bounded synthesis packet for what SNC should surface, explain, warn about, and still defer in the durable-memory lane

Required output:

- durable-memory outward contract
- recommended operator-visible diagnostics/checks
- freshness/duplication/path guidance
- explicit non-promises / deferred surfaces
- `SNC relevance`

Acceptance:

- must stay durable-memory/operator bounded
- must synthesize accepted host/donor packets rather than restart architecture discussion
- must not reopen memory-slot takeover

### 45. OC-20 Worker Launch Failure / Rejection Matrix

Status:

- `done`

Type:

- `research/support`

Repo:

- `OpenClaw`

Depends on:

- `29`
- `33`
- `41`

Write scope:

- `research/135_oc20_worker_launch_failure_rejection_matrix.md`

Why this matters:

- the helper launch lane is now live in SNC, but the remaining operator gap is exact host truth for rejected, refused, errored, or half-started launches
- the next controller-launch follow-up needs failure semantics that are more precise than generic tool-error assumptions

Required output:

- launch failure / rejection matrix
- `sessions_spawn` refusal/error/result-shape notes
- host-side policy/validation/runtime-failure distinctions
- retry-safe versus terminal-failure guidance
- `SNC relevance`

Acceptance:

- must stay launch-failure focused
- must distinguish:
  - argument/validation failure
  - policy/capability refusal
  - runtime/infra error
  - accepted launch that later fails outside immediate tool-return

### 46. OC-21 Worker Follow-Up / Yield / Control Transition Matrix

Status:

- `done`

Type:

- `research/support`

Repo:

- `OpenClaw`

Depends on:

- `29`
- `33`

Write scope:

- `research/136_oc21_worker_followup_control_transition_matrix.md`

Why this matters:

- launch is no longer the only open worker question
- the next implementation/doc pressure is which host-safe action belongs to queued, spawned, running, stalled, and completed workers

Required output:

- `sessions_yield` / `sessions_send` / `subagents` transition matrix
- status-by-status next-action guidance
- host state-change versus pure control-message distinctions
- `SNC relevance`

Acceptance:

- must stay follow-up/control-transition focused
- must distinguish:
  - wait/yield
  - follow-up send
  - list/inspect visibility
  - steer
  - kill

### 47. CC-16 Delegation Failure / Partial-Result Salvage Matrix

Status:

- `done`

Type:

- `research`

Repo:

- `CC`

Depends on:

- `31`
- `35`
- `43`

Write scope:

- `research/137_cc16_delegation_failure_partial_result_matrix.md`

Why this matters:

- the next SNC worker cut needs donor precision for what to do when a worker does not finish cleanly
- current donor packets are strong on ownership and control lanes, but weaker on partial salvage and failure discipline

Required output:

- delegation failure taxonomy
- partial-result salvage / preserve / discard rules
- retry/resume/stop distinctions
- donor value versus service/product coupling
- `SNC relevance`

Acceptance:

- must stay failure/salvage focused
- must distinguish:
  - local worker failure
  - teammate/remote variation where relevant
  - partial result preservation
  - retry/resume versus stop

### 48. SYN-10 SNC Worker Operator Envelope

Status:

- `done`

Type:

- `research/synthesis`

Repo:

- `Both`

Depends on:

- `45`
- `46`
- `47`

Write scope:

- `research/138_syn10_snc_worker_operator_envelope.md`

Why this matters:

- `Milestone 2` now has a live worker lane, but still lacks one bounded outward contract for what helper workers really are and what operators should do when they stall or fail

Required output:

- worker outward contract
- recommended launch / wait / follow-up / control guidance
- diagnostic wording priorities
- explicit non-promises / deferred worker surfaces
- `SNC relevance`

Acceptance:

- must stay worker/operator bounded
- must not reopen broad orchestration-platform design
- must synthesize accepted host/donor packets rather than preference alone

### 49. OC-22 Worker Follow-Up Delivery / Reply-Visibility Matrix

Status:

- `done`

Type:

- `research/support`

Repo:

- `OpenClaw`

Depends on:

- `46`

Write scope:

- `research/142_oc22_worker_followup_reply_visibility_matrix.md`

Why this matters:

- the next SNC worker cut needs exact host truth for what `sessions_send` immediate outcomes really mean
- current packets prove the seam exists, but not the clean operator distinction between message acceptance, visible reply, background continuation, and timeout

Required output:

- `sessions_send` follow-up outcome matrix
- `accepted` / `ok` / `timeout` / `reply` visibility notes
- host-side immediate result versus later session-state change distinctions
- operator-safe follow-up wording guidance
- `SNC relevance`

Acceptance:

- must stay follow-up-delivery focused
- must distinguish:
  - immediate acceptance
  - visible assistant reply
  - background continuation
  - timeout without visible reply

### 50. OC-23 Ambiguous Worker Launch Inspection / Recovery Matrix

Status:

- `done`

Type:

- `research/support`

Repo:

- `OpenClaw`

Depends on:

- `45`
- `46`

Write scope:

- `research/143_oc23_ambiguous_worker_launch_recovery_matrix.md`

Why this matters:

- phase 9 proved that some launch `error` results still leak `childSessionKey` or `runId`
- the next SNC worker follow-up needs exact host truth for how those ambiguous launches can be inspected or recovered without blind respawn

Required output:

- ambiguous-launch inspection / recovery matrix
- public seams usable after launch `error` with identifiers
- inspect-first versus retry-safe guidance
- host truth versus SNC-local state guidance
- `SNC relevance`

Acceptance:

- must stay ambiguous-launch recovery focused
- must distinguish:
  - no-identity failure
  - child-session-only ambiguity
  - run-id ambiguity
  - inspectable versus non-inspectable recovery lanes

### 51. CC-17 Worker Resume Sanitization / Unresolved-Tool Cleanup Matrix

Status:

- `done`

Type:

- `research`

Repo:

- `CC`

Depends on:

- `47`

Write scope:

- `research/144_cc17_worker_resume_sanitization_matrix.md`

Why this matters:

- phase 9 proved that CC keeps follow-up and resume separate
- the next donor precision is exactly how resume cleans transcript state and unresolved tool artifacts before re-entry

Required output:

- resume sanitization matrix
- unresolved tool-use cleanup notes
- transcript filtering / preserved-state rules
- donor-value versus CC-product-coupled behavior
- `SNC relevance`

Acceptance:

- must stay resume-sanitization focused
- must distinguish:
  - live follow-up
  - stopped-worker resume
  - transcript cleanup
  - unresolved tool or thinking artifact handling

### 52. SYN-11 SNC Worker Follow-Up / Resume Envelope

Status:

- `done`

Type:

- `research/synthesis`

Repo:

- `Both`

Depends on:

- `49`
- `50`
- `51`

Write scope:

- `research/145_syn11_snc_worker_followup_resume_envelope.md`

Why this matters:

- `Milestone 2` now has a worker launch lane and a worker operator envelope
- the next bounded outward contract is follow-up, inspect-first recovery, and resume versus relaunch

Required output:

- bounded follow-up / resume outward contract
- recommended next-action wording
- explicit non-promises around resume and recovery
- release/docs implications
- `SNC relevance`

Acceptance:

- must stay worker follow-up/resume bounded
- must not reopen broad orchestration-platform design
- must synthesize accepted host/donor packets rather than preference alone

### 53. OC-24 Worker Late-Reply / Announce Visibility Matrix

Status:

- `done`

Type:

- `research/support`

Repo:

- `OpenClaw`

Depends on:

- `49`

Write scope:

- `research/149_oc24_worker_late_reply_announce_visibility_matrix.md`

Why this matters:

- phase 10 proved what `sessions_send` proves immediately, but not what later announce delivery or later-visible reply actually proves
- the next SNC worker closeout still needs exact host truth for when a follow-up may surface a reply later without overstating visibility

Required output:

- late-reply / announce visibility matrix
- synchronous tool result versus later announce/fetch lane distinctions
- host-observable versus internal-delivery visibility notes
- operator-safe wording for "reply may arrive later"
- `SNC relevance`

Acceptance:

- must stay late-reply / announce focused
- must distinguish:
  - immediate tool result
  - later announce attempt
  - later visible session reply
  - no-late-reply evidence

### 54. OC-25 Worker Inspection / Stale-State Cleanup Matrix

Status:

- `done`

Type:

- `research/support`

Repo:

- `OpenClaw`

Depends on:

- `50`

Write scope:

- `research/150_oc25_worker_inspection_stale_state_cleanup_matrix.md`

Why this matters:

- phase 10 proved inspect-first recovery, but the next SNC worker closeout still needs exact host truth for when stale local worker state should be retained, cleared, or re-checked
- this packet should prevent ad hoc cleanup rules in the controller path

Required output:

- stale-worker inspection / cleanup matrix
- authoritative public seams for checking live versus stale worker/session state
- host-truth versus SNC-local-ledger cleanup guidance
- inspect-first versus wait-more versus relaunch-later guidance
- `SNC relevance`

Acceptance:

- must stay stale-state / inspection focused
- must distinguish:
  - launched-but-not-yet-visible
  - completed-but-not-yet-announced
  - timed-out follow-up
  - cleaned-up or no-longer-visible worker/session state

### 55. CC-18 Resume Outcome Communication / Restart Boundary Matrix

Status:

- `done`

Type:

- `research`

Repo:

- `CC`

Depends on:

- `51`

Write scope:

- `research/151_cc18_resume_outcome_restart_boundary_matrix.md`

Why this matters:

- phase 10 proved sanitize-before-re-entry; the next donor precision is how CC separates resume, restart, continue, and partial-result communication after a worker stops or fails
- this directly supports honest SNC operator/docs language without inflating resume claims

Required output:

- resume / restart boundary matrix
- outcome wording and state-honesty rules
- partial-result carry-forward versus clean relaunch donor note
- donor-value versus CC-product-coupled behavior
- `SNC relevance`

Acceptance:

- must stay resume-communication / boundary focused
- must distinguish:
  - live follow-up
  - sanitized resume
  - restart or relaunch
  - partial-result carry-forward
  - no-honest-resume cases

### 56. SYN-12 SNC Milestone 2 Admission Envelope

Status:

- `done`

Type:

- `research/synthesis`

Repo:

- `Both`

Depends on:

- `53`
- `54`
- `55`

Write scope:

- `research/152_syn12_snc_milestone2_admission_envelope.md`

Why this matters:

- `Milestone 2` is now close enough that the next synthesis packet should answer admission questions instead of reopening architecture
- the main thread needs one bounded note for worker follow-up, recovery, operator wording, delivery readiness, and explicit non-promises

Required output:

- `Milestone 2` admission envelope
- must-have operator wording
- remaining deferred items that do not block admission
- explicit no-claims list
- `SNC relevance`

Acceptance:

- must stay admission bounded
- must synthesize accepted host/donor packets and current SNC code
- must not turn into a `Milestone 3` roadmap

### 57. OC-26 Restart Persistence / Session Reattachment Matrix

Status:

- `open`

Type:

- `research/support`

Repo:

- `OpenClaw`

Depends on:

- `54`

Write scope:

- `research/156_oc26_restart_persistence_session_reattachment_matrix.md`

Why this matters:

- `Milestone 2` admission is now close enough that restart-time truth matters more than another broad worker packet
- SNC needs exact host truth for what survives restart and how worker/session inspection should be reattached afterward

Required output:

- restart persistence / session reattachment matrix
- what survives host restart versus what must be re-inspected
- host-truth-first guidance for downgrading SNC-local worker state after restart
- operator-safe wording for "active", "inspect-needed", and "historical-only" after restart
- `SNC relevance`

Acceptance:

- must stay restart / reattachment focused
- must distinguish:
  - host restart with child session still visible
  - host restart with no controller recent-run state
  - plugin-owned local worker state that survived but no longer has host proof
  - session-truth re-establishment through public seams

### 58. OC-27 Plugin Removal / StateDir Hygiene Recovery Matrix

Status:

- `open`

Type:

- `research/support`

Repo:

- `OpenClaw`

Depends on:

- `24`
- `38`

Write scope:

- `research/157_oc27_plugin_removal_statedir_hygiene_recovery_matrix.md`

Why this matters:

- admission is no longer only about install and enable; operator-safe disable, uninstall, update, and cleanup wording now matters too
- SNC needs one host-real read of slot cleanup, plugin residue, and plugin-owned `stateDir` hygiene

Required output:

- disable / uninstall / update / manual-cleanup matrix
- `plugins.slots.contextEngine` cleanup truth
- plugin-owned `stateDir` retention / removal guidance
- clean-host versus linked-dev cleanup differences
- `SNC relevance`

Acceptance:

- must stay removal / hygiene focused
- must distinguish:
  - disable
  - uninstall
  - update
  - stale selected slot
  - plugin-owned state residue

### 59. CC-19 Maintained-Artifact Reentry / Compaction-Reuse Matrix

Status:

- `open`

Type:

- `research`

Repo:

- `CC`

Depends on:

- `27`
- `28`
- `55`

Write scope:

- `research/158_cc19_maintained_artifact_reentry_compact_reuse_matrix.md`

Why this matters:

- `Milestone 2` is near closeout, so the highest-value remaining donor packet is now longer-range specialization-kernel guidance, not another broad CC atlas
- we still need a sharper read on when CC treats maintained artifacts as authoritative enough to compact around or re-enter from

Required output:

- maintained-artifact reuse matrix
- session-memory / compaction / reentry boundary note
- donor-value versus CC-product-shell smoothing note
- future custom-Claw kernel relevance
- `SNC relevance`

Acceptance:

- must stay maintained-artifact / reentry / compact-reuse focused
- must distinguish:
  - maintained session artifact reuse
  - transcript reconstruction
  - compaction reuse
  - donor-worthy substrate versus shell-level smoothing

### 60. SYN-13 SNC Milestone 2 Release / Operator Packet

Status:

- `open`

Type:

- `research/synthesis`

Repo:

- `Both`

Depends on:

- `57`
- `58`
- `59`

Write scope:

- `research/159_syn13_snc_milestone2_release_operator_packet.md`

Why this matters:

- after admission comes the practical closeout question: what should `Milestone 2` release notes and operator docs actually say
- the main thread needs one bounded packet for release language, cleanup language, restart language, and explicit defers

Required output:

- `Milestone 2` release/operator packet
- must-have release wording
- install / update / remove / restart / cleanup language
- explicit defer list and explicit no-claims list
- `SNC relevance`

Acceptance:

- must stay release/operator bounded
- must synthesize accepted host/donor packets and current SNC code
- must not turn into a `Milestone 3` or kernel roadmap

## Priority Order For New External Threads

If multiple new external threads are being created now, the best order is:

1. `57`
2. `58`
3. `59`
4. `60`

## Best Claim Bundles For Parallel Main Threads

Current best pairings:

- `57 + 58`
  - best OpenClaw restart/removal/operator-hygiene bundle for the current `Milestone 2` closeout
- `59 + 60`
  - best donor-plus-release-language bundle once the host cleanup packets land

Best kept solo:

- `57`
  - restart-time worker truth stays cleaner when not mixed with plugin-removal residue
- `59`
  - maintained-artifact donor value is easiest to judge without release-language pressure

## Dispatcher Note

This file is the external-thread claim surface.

- subagents still use dispatcher-issued packets
- other main threads should claim from this catalog by number
- dispatcher thread remains the owner of integration, acceptance, and repo-wide convergence
