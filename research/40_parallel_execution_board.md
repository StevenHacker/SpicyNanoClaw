# Parallel Execution Board

## Purpose

This is the dispatcher board for:

- OpenClaw deconstruction
- SNC implementation
- repo coordination

The dispatcher thread owns this file.

## Status Vocabulary

- `queued`
- `active`
- `blocked`
- `acceptance`
- `done`
- `deferred`

## Dispatcher Duties

The dispatcher owns:

- task creation
- task packets
- progress updates
- acceptance notes
- git integration
- target/goal document maintenance

## A. OpenClaw Deconstruction Streams

### OC-01 Agent Runtime Core

Status:

- `done`

Current state:

- main SNC-relevant runtime spine already mapped
- still needs full deconstruction-grade mod notes

Required outputs:

- runtime spine packet
- compaction/maintenance packet
- mod guidance packet

Primary docs:

- `research/10_callchains_openclaw.md`
- `research/32_snc_v1_host_shape.md`
- `research/39_openclaw_deconstruction_program.md`
- `research/44_oc01_runtime_core_deconstruction.md`

### OC-02 Plugin / Hook / Manifest Host

Status:

- `done`

Current state:

- core slot/plugin direction already established
- still needs fuller host deconstruction and packaging guidance

Required outputs:

- plugin lifecycle packet
- slot ownership packet
- hook timing packet
- mod guidance packet

Primary docs:

- `research/12_domain_atlas_openclaw.md`
- `research/34_collab_workstreams.md`
- `research/39_openclaw_deconstruction_program.md`
- `research/42_oc02_plugin_host_deconstruction.md`

### OC-03 Session / Channel / Gateway Fabric

Status:

- `done`

Acceptance target:

- readable session/gateway packet with SNC relevance and mod notes

Primary docs:

- `research/47_oc03_session_channel_gateway_deconstruction.md`

### OC-04 Capability Stack

Status:

- `done`

Acceptance target:

- capability-domain packet with `ignore now / later relevant` guidance

Primary docs:

- `research/48_oc04_capability_stack_deconstruction.md`

### OC-05 Config / Security / Ops

Status:

- `done`

Acceptance target:

- config/policy constraint packet for SNC packaging

Primary docs:

- `research/43_oc05_config_security_ops_deconstruction.md`

### OC-06 UI / Product Surfaces

Status:

- `done`

Current state:

- breadth packet accepted
- now feeds later productization rather than blocking SNC Milestone 1

## B. SNC Implementation Streams

### SNC-01 Session-State Quality Pass

Status:

- `done`

Outcome:

- bilingual cues repaired
- false positives reduced
- user constraints separated from assistant planning text

### SNC-02 Bounded Maintain Slice

Status:

- `done`

Outcome:

- safe transcript hygiene landed
- only old assistant planning/meta messages eligible
- story prose and recent tail protected

### SNC-03 Delegated Compaction Guidance

Status:

- `done`

Outcome:

- SNC session state now shapes delegated compaction via `customInstructions`

Primary doc:

- `research/37_snc_compaction_v1.md`

### SNC-04 Hook Integration Layer

Status:

- `done`

Scope:

- `before_message_write`
- `tool_result_persist`
- possible slow sidecars at `agent_end` / `session_end`

Acceptance target:

- one bounded hook layer that improves transcript shape or sidecar upkeep without host-internal edits

Current landed slice:

- config-gated hook shaping
- default disabled
- bounded assistant and tool-result shaping with session-local state
- real `session_end` cleanup

Primary docs:

- `research/45_snc_hook_scaffold_v1.md`
- `research/66_snc_hook_shaping_integration.md`

Current outcome:

- disabled-by-default hook layer remains intact
- `before_message_write`, `tool_result_persist`, and `session_end` are now explicit opt-in hook targets
- bounded shaping is landed behind config gates
- tool-result replacement fate is now replay-stable for the same `toolCallId`

### SNC-05 Durable Memory Layer

Status:

- `active`

Scope:

- project-level memory
- writing-world continuity across sessions
- only after current session continuity core is stable

Acceptance target:

- bounded donor-based design packet first
- implementation only after acceptance

Current outcome:

- durable-memory v1 design packet completed on the dispatcher thread
- orchestration and tool-shaping design boundaries are now accepted
- cycle 006 is cutting the first bounded utility implementation

### SNC-07 Helper Tools Layer

Status:

- `active`

Scope:

- bounded helper tools over SNC-owned artifacts
- read-only projection helpers
- no MCP-first expansion

Acceptance target:

- utility layer first
- dispatcher integration later

### SNC-08 Multi-Worker Policy Layer

Status:

- `active`

Scope:

- worker-role/job-contract utilities
- spawn-brief helpers
- controller-side tracking helpers

Acceptance target:

- bounded orchestration policy utility first
- host session-tool integration later

### SNC-06 Packaging / Repo Hygiene

Status:

- `active`

Scope:

- keep the SNC repo maintainable while research and working host copies continue

Needed decisions:

- what becomes canonical repo content
- what stays as local reference material
- what stays ignored/generated

## C. Dispatcher / Coordination Streams

### OPS-01 Goal And Progress Documents

Status:

- `active`

Files:

- `research/00_overview.md`
- `research/20_evidence_matrix.md`
- this board

### OPS-02 Worker Packet Discipline

Status:

- `active`

Acceptance target:

- every subagent packet has task type, scope, owned files, and acceptance rules

### OPS-03 Acceptance And Verification

Status:

- `active`

Acceptance target:

- dispatcher verifies before marking done
- tests and typecheck policy stay explicit

Current landed support:

- `scripts/validate_snc_dispatcher.ps1`
- `research/41_dispatcher_validation_helper.md`
- dispatcher-side helper exists and passes on the current SNC working host copy

### OPS-04 Git Maintenance

Status:

- `active`

Current policy:

- dispatcher owns branch/integration decisions
- implementation slices should remain commit-layered

## Immediate Next Dispatcher Choice

The current dispatcher move is:

- turn the landed worker substrate into a real controller launch lane
- tighten worker diagnostics/state hygiene
- rehearse clean-host delivery for post-milestone-1 packaging confidence
- keep external research on exact host/donor lifecycle seams that still change Milestone 2 engineering

Current default lean:

- keep host ownership boundaries intact
- development first, precision research second
- let external packets sharpen implementation cuts instead of reopening broad mapping

## Verification Tooling

Current dispatcher helper:

- `scripts/validate_snc_dispatcher.ps1`

Validated against:

- `data/working/openclaw-v2026.4.1-snc-v1`

Current acceptance gates:

1. focused SNC Vitest
2. 8 GB heap workspace typecheck

## Active Worker Slots

Cycle packet:

- `research/41_dispatch_cycle_001.md`

Current balanced allocation:

- `W1` -> `OC-01 Agent Runtime Core`
- `W2` -> `OC-02 Plugin / Hook / Manifest Host`
- `W3` -> `OC-05 Config / Security / Ops`
- `W4` -> `SNC-04 Hook Integration Scaffold`
- `W5` -> `SNC-06 Validation / Repo Hygiene Support`

Dispatcher note:

- this is the first steady-state 5-worker layout
- slot ownership and acceptance live in the cycle packet

## Active Worker Cycle 1

Dispatcher cycle shape:

- `2` OpenClaw deconstruction workers
- `1` OpenClaw config/security/ops worker
- `1` SNC hook-scaffold worker
- `1` dispatcher-validation helper worker

Assignments:

- `Kuhn` (`019d5617-cda3-76f3-bddf-1bbf5b166d00`)
  - packet: `OC-01 Agent Runtime Core`
  - mode: read-only deconstruction memo
  - state: `completed and accepted`

- `Dalton` (`019d5617-ce23-7612-8e86-e059d2cb5ad4`)
  - packet: `OC-02 Plugin / Hook / Manifest Host`
  - mode: read-only deconstruction memo
  - state: `completed and accepted`

- `Archimedes` (`019d5617-cebe-7253-8a62-759892dae7b2`)
  - packet: `OC-05 Config / Security / Ops`
  - mode: read-only deconstruction memo
  - state: `completed and accepted`

- `Lagrange` (`019d5617-d0a7-7441-b4ad-1a977a2ed620`)
  - packet: `SNC-04 Hook Integration Layer`
  - mode: bounded implementation scaffold
  - state: `completed and accepted`

- `Goodall` (`019d5617-d176-7b90-ae8b-16d234f20ec1`)
  - packet: `OPS-03 Acceptance / validation helper`
  - mode: bounded implementation support
  - state: `completed and accepted`

## Active Worker Cycle 2

Dispatcher cycle shape:

- `2` OpenClaw deconstruction workers
- `2` CC donor/harness workers
- `1` migration-synthesis worker

Packet source:

- `research/46_dispatch_cycle_002.md`

Assignments:

- `Bernoulli` (`019d5628-92af-7e33-b821-4ac2d98b26fa`)
  - packet: `OC-03 Session / Channel / Gateway Fabric`
  - mode: read-only deconstruction memo
  - state: `completed and accepted`

- `Schrodinger` (`019d5628-9345-7342-a763-dc611a2108b4`)
  - packet: `OC-04 Capability Stack`
  - mode: read-only deconstruction memo
  - state: `completed and accepted`

- `Russell` (`019d5628-93f4-7fb1-9b2f-45946b57549a`)
  - packet: `CC-01 Agent Construction / Query Orchestration`
  - mode: read-only donor memo
  - state: `completed and accepted`

- `Pauli` (`019d5628-94c8-7140-b674-757127440d24`)
  - packet: `CC-02 Harness / Pressure-Control / Tool Exposure`
  - mode: read-only donor memo
  - state: `completed and accepted`

- `dispatcher-held`
  - packet: `SYN-01 OpenClaw x CC Migration Matrix`
  - mode: temporary main-thread synthesis until a free worker slot is reassigned
  - state: `done`

Assignments:

- `Bernoulli` (`019d5628-92af-7e33-b821-4ac2d98b26fa`)
  - packet: `OC-03 Session / Channel / Gateway Fabric`
  - mode: read-only deconstruction memo

- `Schrodinger` (`019d5628-9345-7342-a763-dc611a2108b4`)
  - packet: `OC-04 Capability Stack`
  - mode: read-only deconstruction memo

- `Russell` (`019d5628-93f4-7fb1-9b2f-45946b57549a`)
  - packet: `CC-01 Agent Construction / Query Orchestration`
  - mode: read-only donor memo
  - accepted doc: `research/49_cc01_agent_orchestration_donor.md`

- `Pauli` (`019d5628-94c8-7140-b674-757127440d24`)
  - packet: `CC-02 Harness / Pressure-Control / Tool Exposure`
  - mode: read-only donor memo
  - accepted doc: `research/51_cc02_harness_pressure_tool_exposure.md`

- `Aquinas` (`019d5628-95a9-7061-a962-f10f8f51e391`)
  - packet: `SYN-01 OpenClaw x CC Migration Matrix`
  - mode: read-only synthesis memo
  - accepted doc: `research/52_openclaw_cc_migration_matrix.md`

## Active Worker Cycle 3

Dispatcher cycle shape:

- `2` bounded SNC implementation workers
- `1` acceptance/support worker
- `1` design/synthesis worker

Packet source:

- `research/69_dispatch_cycle_003.md`

Assignments:

- `Einstein` (`019d56c0-f9e9-73d2-96d6-5d728f35cb16`)
  - packet: `SNC-07 Transcript Shaping Utility`
  - mode: bounded implementation
  - state: `completed and accepted`
  - accepted doc: `research/64_snc_transcript_shaping_utility.md`

- `Boole` (`019d56c0-fa08-7871-a727-ac0241435073`)
  - packet: `SNC-08 Replacement Ledger Utility`
  - mode: bounded implementation
  - state: `completed and accepted`
  - accepted doc: `research/65_snc_replacement_ledger_utility.md`

- `Franklin` (`019d56c0-fa1d-7980-87a1-17d63f6ae748`)
  - packet: `SNC-11 Acceptance / Benchmark Harness V2`
  - mode: bounded implementation support
  - state: `completed and accepted`
  - accepted doc: `research/68_snc_acceptance_matrix.md`

- `Kepler` (`019d56c0-fa2f-7a90-9f61-80717aa8f700`)
  - packet: `SYN-02 Hook Shaping Integration Spec`
  - mode: read-only design memo
  - state: `completed and accepted`
  - accepted doc: `research/70_snc_hook_shaping_spec.md`

## Active Worker Cycle 4

Dispatcher cycle shape:

- `3` OpenClaw deconstruction workers
- `2` CC donor/deconstruction workers

Packet source:

- `research/71_dispatch_cycle_004.md`

Assignments:

- `Lovelace` (`019d56e1-40bc-7981-bb4c-827df1647138`)
  - packet: `OC-07 Memory / Recall / Durable Memory Substrate`
  - mode: read-only deconstruction memo
  - state: `completed and accepted`
  - accepted doc: `research/55_oc07_memory_recall_substrate.md`

- `Turing` (`019d56e1-40d2-7c52-a7a5-f9ab70fc55be`)
  - packet: `CC-06 Memory Presentation Modes / Feature-Gate Matrix`
  - mode: read-only donor/deconstruction memo
  - state: `completed and accepted`
  - accepted doc: `research/61_cc06_memory_mode_feature_matrix.md`

- `Hilbert` (`019d56e1-40e6-70c1-b82c-599daaaa35fe`)
  - packet: `OC-08 MCP / Tool / External Integration Fabric`
  - mode: read-only deconstruction memo
  - state: `reissued after scope drift`

- `Averroes` (`019d56e9-9719-79a3-a242-7fbd32248430`)
  - packet: `OC-08 MCP / Tool / External Integration Fabric`
  - mode: read-only deconstruction memo
  - state: `completed and accepted`
  - accepted doc: `research/56_oc08_mcp_tool_integration_fabric.md`

## Active Worker Cycle 5

Dispatcher cycle shape:

- `1` main-thread design synthesis
- `2` bounded design workers

Packet source:

- `research/75_dispatch_cycle_005.md`

Assignments:

- `dispatcher-held`
  - packet: `SNC-10 Durable Memory V1 Design Packet`
  - mode: main-thread design synthesis
  - state: `completed and accepted`
  - accepted doc: `research/67_snc_durable_memory_v1_design.md`

- `Socrates` (`019d5704-838a-7291-a7a5-b2d30e078d62`)
  - packet: `SNC-12 Multi-Worker Orchestration V1 Design Packet`
  - mode: read-only design memo
  - state: `completed and accepted`
  - accepted doc: `research/72_snc_multiworker_v1_design.md`

- `Laplace` (`019d5704-83a8-7872-affd-aedf8034e696`)
  - packet: `SNC-13 Tool Shaping / Helper Tools V1 Design Packet`
  - mode: read-only design memo
  - state: `completed and accepted`
  - accepted doc: `research/73_snc_tool_shaping_helper_tools_v1.md`

- `Popper` (`019d56e1-4100-7522-8b7b-f708843dfe5f`)
  - packet: `CC-08 Tasks / Background / Subagent Infrastructure Deep Packet`
  - mode: read-only donor/deconstruction memo
  - state: `completed and accepted`
  - accepted doc: `research/63_cc08_task_subagent_infra.md`

- `Epicurus` (`019d56e1-4119-7fc1-ab21-1ec081ec4692`)
  - packet: `OC-09 Gateway API / Daemon / Packaging Surface`
  - mode: read-only deconstruction memo
  - state: `completed and accepted`
  - accepted doc: `research/57_oc09_gateway_daemon_packaging.md`

## Active Worker Cycle 6

Dispatcher cycle shape:

- `3` bounded SNC utility workers
- `2` synthesis workers

Packet source:

- `research/77_dispatch_cycle_006.md`

Assignments:

- `Harvey` (`019d5719-2c5b-7531-8c1b-bc823f899cc6`)
  - packet: `SNC-14 Durable Memory Core Utility`
  - mode: bounded implementation
  - state: `completed and accepted`
  - accepted doc: `research/81_snc_durable_memory_core_utility.md`

- `Locke` (`019d5719-2c76-7bd1-a28a-eb9b9925f3ff`)
  - packet: `SNC-15 Helper Tools Utility`
  - mode: bounded implementation
  - state: `completed and accepted`
  - accepted doc: `research/82_snc_helper_tools_utility.md`

- `Ramanujan` (`019d5719-2c8b-7bd1-a9f3-7e5140f446cb`)
  - packet: `SNC-16 Multi-Worker Policy Utility`
  - mode: bounded implementation
  - state: `completed and accepted`
  - accepted doc: `research/83_snc_multiworker_policy_utility.md`

- `Erdos` (`019d5719-2c9f-75b0-bdda-cbc1217e4ef8`)
  - packet: `SYN-03 OpenClaw Modification Atlas`
  - mode: read-only synthesis memo
  - state: `completed and accepted`
  - accepted doc: `research/78_openclaw_modification_atlas.md`

- `Huygens` (`019d5719-2cba-7d13-b72c-fb7100ef0226`)
  - packet: `CC-09 Harness Design Codex`
  - mode: read-only synthesis memo
  - state: `completed and accepted`
  - accepted doc: `research/79_cc_harness_design_codex.md`

- `dispatcher-held`
  - packet: `SYN-04 Custom Claw Architecture Program`
  - mode: main-thread architecture synthesis
  - state: `completed and accepted`
  - accepted doc: `research/80_custom_claw_architecture_program.md`

## Active Worker Cycle 7

Dispatcher cycle shape:

- `1` bounded SNC integration worker
- `2` bounded design/synthesis workers

Packet source:

- `research/85_dispatch_cycle_007.md`

Assignments:

- `Jason` (`019d5755-c799-7280-8e0f-049cf1ceee8d`)
  - packet: `SNC-17 Durable Memory Integration V1`
  - mode: bounded implementation
  - state: `completed and accepted`
  - accepted doc: `research/86_snc_durable_memory_integration_v1.md`

- `Curie` (`019d5755-c7b9-7491-b85c-2210777867d1`)
  - packet: `SNC-18 Helper-Tool Registration Decision`
  - mode: read-only design memo
  - state: `completed and accepted`
  - accepted doc: `research/87_snc_helper_tool_registration_decision.md`

- `Wegener` (`019d5755-c7fd-7e91-b6eb-86db256c0cdd`)
  - packet: `SNC-19 Worker-Policy Host Wiring V1`
  - mode: read-only design memo
  - state: `completed and accepted`
  - accepted doc: `research/88_snc_worker_policy_host_wiring_v1.md`
