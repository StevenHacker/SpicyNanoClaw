# Dispatch Cycle 007

## Mode

Integration-frontier cycle under dispatcher control.

Shape:

- `1` bounded SNC integration worker
- `2` bounded design/synthesis workers
- dispatcher thread owns acceptance, canonical docs, and later milestone cutting

Cycle purpose:

- move from accepted utility layers into the first real SNC integration cut
- keep helper-tool and worker-policy decisions bounded before they spread into the plugin entry or host tool surfaces

## Slot W1

Type:

- `implementation`

Theme:

- `SNC-17 Durable Memory Integration V1`

Write scope:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/hook-scaffold.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/hook-scaffold.test.ts`
- `research/86_snc_durable_memory_integration_v1.md`

Acceptance:

- integrate the accepted durable-memory utility in a bounded way
- keep host memory-slot ownership untouched
- keep compaction ownership delegated
- do not broaden into helper-tool registration

## Slot W2

Type:

- `research/design`

Theme:

- `SNC-18 Helper-Tool Registration Decision`

Write scope:

- `research/87_snc_helper_tool_registration_decision.md`

Acceptance:

- must answer whether helper tools belong in Milestone 1 or later
- must separate internal plugin-tool registration from MCP/export concerns
- must stay grounded in accepted helper-tool and tool-fabric evidence

## Slot W3

Type:

- `research/design`

Theme:

- `SNC-19 Worker-Policy Host Wiring V1`

Write scope:

- `research/88_snc_worker_policy_host_wiring_v1.md`

Acceptance:

- must map accepted worker-policy utilities onto real OpenClaw host seams
- must keep execution substrate host-owned
- must define a bounded first wiring path rather than a general swarm runtime

## Dispatcher Acceptance Rules

1. Integration work must stay within the owned files only.
2. Durable-memory integration must remain hot-pluggable and plugin-owned.
3. Design packets must reduce integration ambiguity, not reopen repo-wide exploration.
4. Dispatcher will decide after acceptance whether Milestone 1 should register helper tools or keep them internal.

## Active Assignments

- `Jason` (`019d5755-c799-7280-8e0f-049cf1ceee8d`) -> `SNC-17 Durable Memory Integration V1` -> accepted
- `Curie` (`019d5755-c7b9-7491-b85c-2210777867d1`) -> `SNC-18 Helper-Tool Registration Decision` -> accepted
- `Wegener` (`019d5755-c7fd-7e91-b6eb-86db256c0cdd`) -> `SNC-19 Worker-Policy Host Wiring V1` -> accepted

## Acceptance Progress

- `SNC-17` accepted into `research/86_snc_durable_memory_integration_v1.md`
- `SNC-18` accepted into `research/87_snc_helper_tool_registration_decision.md`
- `SNC-19` accepted into `research/88_snc_worker_policy_host_wiring_v1.md`
- dispatcher verification:
  - targeted `engine + durable-memory` tests passed: `10/10`
  - focus gate passed: `21/21`
  - full workspace typecheck passed with `NODE_OPTIONS=--max-old-space-size=8192`

## Cycle Outcome

- closed as an accepted dispatcher cycle
