# Dispatch Cycle 006

## Mode

Implementation-and-architecture convergence cycle under dispatcher control.

Shape:

- `3` bounded SNC utility workers
- `2` synthesis workers
- dispatcher thread owns acceptance, canonical docs, and later integration

Cycle purpose:

- cut the first implementation-grade utilities from accepted SNC design packets
- convert OpenClaw and CC deconstruction into longer-range architecture assets
- keep all work tied either to `SNC Milestone 1` or to future custom-Claw leverage

## Slot W1

Type:

- `implementation`

Theme:

- `SNC-14 Durable Memory Core Utility`

Write scope:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.test.ts`
- `research/81_snc_durable_memory_core_utility.md`

Acceptance:

- bounded utility only
- no host memory takeover
- no `engine.ts` / `config.ts` integration in this packet

## Slot W2

Type:

- `implementation`

Theme:

- `SNC-15 Helper Tools Utility`

Write scope:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/helper-tools.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/helper-tools.test.ts`
- `research/82_snc_helper_tools_utility.md`

Acceptance:

- read-only helper-tool builders only
- no plugin-entry registration
- no MCP export

## Slot W3

Type:

- `implementation`

Theme:

- `SNC-16 Multi-Worker Policy Utility`

Write scope:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-policy.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-policy.test.ts`
- `research/83_snc_multiworker_policy_utility.md`

Acceptance:

- policy utility only
- no host-tool wiring yet
- no `engine.ts` edits in this packet

## Slot W4

Type:

- `research/synthesis`

Theme:

- `SYN-03 OpenClaw Modification Atlas`

Write scope:

- `research/78_openclaw_modification_atlas.md`

Acceptance:

- must produce actionable modification guidance by subsystem

## Slot W5

Type:

- `research/synthesis`

Theme:

- `CC-09 Harness Design Codex`

Write scope:

- `research/79_cc_harness_design_codex.md`

Acceptance:

- must separate runtime harness from shell/service/governance/product-feel layers

## Dispatcher Follow-On

Dispatcher-held follow-on packet after W4/W5 acceptance:

- `SYN-04 Custom Claw Architecture Program`
- write scope: `research/80_custom_claw_architecture_program.md`

This stays dispatcher-held until the two synthesis packets close.

## Dispatcher Acceptance Rules

1. Utility packets must stay within owned files only.
2. No worker should broaden into `engine.ts`, `config.ts`, or plugin entry integration in this cycle.
3. Synthesis packets must remain architecture-grade and directly useful for later implementation decisions.
4. Dispatcher will integrate accepted utility outputs in a later cycle rather than during worker execution.

## Active Assignments

- `Harvey` (`019d5719-2c5b-7531-8c1b-bc823f899cc6`) -> `SNC-14 Durable Memory Core Utility` -> accepted
- `Locke` (`019d5719-2c76-7bd1-a28a-eb9b9925f3ff`) -> `SNC-15 Helper Tools Utility` -> accepted
- `Ramanujan` (`019d5719-2c8b-7bd1-a9f3-7e5140f446cb`) -> `SNC-16 Multi-Worker Policy Utility` -> accepted
- `Erdos` (`019d5719-2c9f-75b0-bdda-cbc1217e4ef8`) -> `SYN-03 OpenClaw Modification Atlas` -> accepted
- `Huygens` (`019d5719-2cba-7d13-b72c-fb7100ef0226`) -> `CC-09 Harness Design Codex` -> accepted
- dispatcher main thread -> `SYN-04 Custom Claw Architecture Program` -> accepted follow-on

## Acceptance Progress

- `SNC-14` accepted into `research/81_snc_durable_memory_core_utility.md`
- `SNC-15` accepted into `research/82_snc_helper_tools_utility.md`
- `SNC-16` accepted into `research/83_snc_multiworker_policy_utility.md`
- `SYN-03` accepted into `research/78_openclaw_modification_atlas.md`
- `CC-09` accepted into `research/79_cc_harness_design_codex.md`
- `SYN-04` accepted into `research/80_custom_claw_architecture_program.md`
- dispatcher verification:
  - extension utility tests passed: `10/10`
  - full workspace typecheck passed with `NODE_OPTIONS=--max-old-space-size=8192`

## Cycle Outcome

- closed as an accepted dispatcher cycle
