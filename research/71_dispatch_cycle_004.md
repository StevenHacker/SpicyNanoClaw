# Dispatch Cycle 004

## Mode

Research-heavy deconstruction cycle under dispatcher control.

Shape:

- `3` OpenClaw deconstruction workers
- `2` CC donor/deconstruction workers
- dispatcher thread owns acceptance, synthesis, claim sync, and git integration

Cycle purpose:

- deepen the remaining host surfaces most relevant to SNC durable memory, tool shaping, orchestration, and deployment
- keep the next SNC design frontier evidence-led rather than intuition-led

## Slot W1

Type:

- `research`

Theme:

- `OC-07 Memory / Recall / Durable Memory Substrate`

Write scope:

- `research/55_oc07_memory_recall_substrate.md`

Objective:

- fully deconstruct OpenClaw durable-memory substrate, recall path, freshness lifecycle, and plugin/runtime boundaries

Acceptance:

- must separate tool-mediated recall, background sync, durable store management, and prompt-visible memory presentation

## Slot W2

Type:

- `research`

Theme:

- `CC-06 Memory Presentation Modes / Feature-Gate Matrix`

Write scope:

- `research/61_cc06_memory_mode_feature_matrix.md`

Objective:

- convert CC memory presentation and feature gates into a donor-grade matrix for SNC durable-memory design

Acceptance:

- must distinguish baseline injection, relevant-memory attachment recall, extraction mode, and prompt-only vs runtime-gated behavior

## Slot W3

Type:

- `research`

Theme:

- `OC-08 MCP / Tool / External Integration Fabric`

Write scope:

- `research/56_oc08_mcp_tool_integration_fabric.md`

Objective:

- deconstruct the real OpenClaw tool/MCP fabric so SNC shaping and helper-tool design stays on safe host seams

Acceptance:

- must distinguish tool registration, tool execution, tool policy, and tool-result persistence layers

## Slot W4

Type:

- `research`

Theme:

- `CC-08 Tasks / Background / Subagent Infrastructure Deep Packet`

Write scope:

- `research/63_cc08_task_subagent_infra.md`

Objective:

- deepen CC task/background/subagent infrastructure beyond the earlier orchestration donor memo

Acceptance:

- must deepen queue, ownership, background, and interrupt mechanics specifically

## Slot W5

Type:

- `research`

Theme:

- `OC-09 Gateway API / Daemon / Packaging Surface`

Write scope:

- `research/57_oc09_gateway_daemon_packaging.md`

Objective:

- close another OpenClaw host-platform packet around gateway, daemon, and deployment packaging surfaces

Acceptance:

- must stay deployment/control-plane focused and avoid reopening already-settled session identity work

## Dispatcher Acceptance Rules

1. Only dispatcher marks cycle outputs accepted.
2. Every packet must end with `SNC relevance` and `modification guidance`.
3. Worker packets must not rewrite canonical overview/evidence docs directly.
4. Cycle 004 should improve the evidence base for:
   - SNC durable memory v1
   - future tool-shaping/helper-tool design
   - future worker/subagent orchestration
   - deployment/productization constraints

## Active Assignments

- `Lovelace` (`019d56e1-40bc-7981-bb4c-827df1647138`) -> `OC-07 Memory / Recall / Durable Memory Substrate`
- `Turing` (`019d56e1-40d2-7c52-a7a5-f9ab70fc55be`) -> `CC-06 Memory Presentation Modes / Feature-Gate Matrix`
- `Hilbert` (`019d56e1-40e6-70c1-b82c-599daaaa35fe`) -> `OC-08 MCP / Tool / External Integration Fabric`
- `Popper` (`019d56e1-4100-7522-8b7b-f708843dfe5f`) -> `CC-08 Tasks / Background / Subagent Infrastructure Deep Packet`
- `Epicurus` (`019d56e1-4119-7fc1-ab21-1ec081ec4692`) -> `OC-09 Gateway API / Daemon / Packaging Surface`
- `Averroes` (`019d56e9-9719-79a3-a242-7fbd32248430`) -> `OC-08 MCP / Tool / External Integration Fabric (reissued)`

## Acceptance Progress

- `OC-07` accepted into `research/55_oc07_memory_recall_substrate.md`
- `CC-06` accepted into `research/61_cc06_memory_mode_feature_matrix.md`
- `CC-08` accepted into `research/63_cc08_task_subagent_infra.md`
- `OC-09` accepted into `research/57_oc09_gateway_daemon_packaging.md`
- `OC-08` first pass rejected, then corrected and accepted into `research/56_oc08_mcp_tool_integration_fabric.md`

Reason for rejection:

- the first `OC-08` packet drifted into the local Python MCP gateway in the root repo instead of the OpenClaw external snapshot under `data/external/openclaw-v2026.4.1`
- that output is not accepted as canonical host evidence for OpenClaw
- a replacement worker has been issued with an explicit snapshot-only scope

Correction outcome:

- the reissued `OC-08` packet was accepted after staying inside the OpenClaw external snapshot and correctly separating tool registration, execution, policy, and persistence

## Dispatcher Acceptance Note

Cycle 004 is now closed as an accepted dispatcher cycle.

Current accepted outputs:

- `research/55_oc07_memory_recall_substrate.md`
- `research/56_oc08_mcp_tool_integration_fabric.md`
- `research/57_oc09_gateway_daemon_packaging.md`
- `research/61_cc06_memory_mode_feature_matrix.md`
- `research/63_cc08_task_subagent_infra.md`

## Dispatcher Note

Cycle 004 intentionally shifts the worker pool back toward large deconstruction packets.

Reason:

- cycle 003 already established a stable bounded SNC shaping baseline
- the next major SNC design decisions now depend more on unresolved host/donor evidence than on immediate code expansion
