# Dispatch Cycle 002

## Mode

Balanced configuration:

- `1` dispatcher thread
- `5` worker slots

Shape:

- `2` OpenClaw deconstruction workers
- `2` CC donor/harness workers
- `1` migration-synthesis worker

## Slot W1

Type:

- `research`

Theme:

- `OC-03 Session / Channel / Gateway Fabric`

Write scope:

- `read-only`

Objective:

- deconstruct OpenClaw session identity, channel binding, routing, and gateway-facing control surfaces

Targets:

- `src/sessions`
- `src/channels`
- `src/chat`
- `src/routing`
- `src/gateway`

Required output:

- subsystem purpose
- main entry files
- verified session/channel/gateway notes
- safe SNC modification notes
- unsafe/internal-edit-only zones

Acceptance:

- must clearly separate author/workflow relevance from core runtime relevance
- must end with modification classifications

## Slot W2

Type:

- `research`

Theme:

- `OC-04 Capability Stack`

Write scope:

- `read-only`

Objective:

- map OpenClaw capability domains beyond SNC core and identify which ones matter for future compatibility versus which are noise for writing-first SNC

Targets:

- media
- speech
- web
- image
- link/media understanding
- relevant bundled capability extensions

Required output:

- capability atlas
- interaction relevance note
- safe SNC modification notes
- unsafe/internal-edit-only zones

Acceptance:

- must classify each domain as `ignore now`, `compatibility-later`, or `potential donor`

## Slot W3

Type:

- `research`

Theme:

- `CC-01 Agent Construction / Query Orchestration`

Write scope:

- `read-only`

Objective:

- study CC agent construction and orchestration surfaces that may inform SNC or future Claw-side agent design

Targets:

- `src/query.ts`
- `src/QueryEngine.ts`
- `src/assistant`
- `src/buddy`
- `src/coordinator`
- `src/tasks`

Required output:

- subsystem purpose
- main entry files
- verified agent/orchestration notes
- migratable harness ideas
- non-migratable or product-shell-tied ideas

Acceptance:

- must separate runtime donor ideas from product-shell behavior
- must end with a short “best migration candidates” section

## Slot W4

Type:

- `research`

Theme:

- `CC-02 Harness / Pressure-Control / Tool Exposure`

Write scope:

- `read-only`

Objective:

- continue targeted study of CC mechanisms that control context pressure, tool exposure, and maintenance behavior

Targets:

- `src/services/compact/*`
- `src/tools/ToolSearchTool/*`
- `src/utils/toolResultStorage.ts`
- relevant `query.ts` sections

Required output:

- donor patterns worth carrying
- donor patterns to reject or defer
- best migration candidates for current SNC stage

Acceptance:

- must stay mechanism-focused
- must not drift into broad CC product-shell reading

## Slot W5

Type:

- `research`

Theme:

- `SYN-01 OpenClaw x CC Migration Matrix`

Write scope:

- `read-only`

Objective:

- produce a dispatcher-useful synthesis of which CC harness and agent-construction ideas are now actually learnable/migratable given the current level of OpenClaw deconstruction

Targets:

- current deconstruction docs
- current harness docs
- targeted source verification when needed

Required output:

- migration candidate matrix
- top current donor ideas
- blocked ideas pending more OpenClaw clarity
- recommended next implementation frontier

Acceptance:

- must distinguish:
  - migratable now
  - migratable later
  - likely not worth migrating

## Dispatcher Acceptance Rules

1. Only dispatcher marks `done`.
2. Research packets must be integrated into canonical docs before acceptance.
3. Migration claims must cite both donor and host-side evidence where possible.
4. No cycle-2 packet should restart already-accepted cycle-1 work.

## Acceptance Progress

- `OC-03` accepted into `research/47_oc03_session_channel_gateway_deconstruction.md`
- `OC-04` accepted into `research/48_oc04_capability_stack_deconstruction.md`
- `CC-01` accepted into `research/49_cc01_agent_orchestration_donor.md`
- `CC-02` accepted into `research/51_cc02_harness_pressure_tool_exposure.md`
- `SYN-01` accepted into `research/52_openclaw_cc_migration_matrix.md`

## Cycle Outcome

Cycle 2 is now closed as an accepted research cycle.

Accepted outputs:

- `research/47_oc03_session_channel_gateway_deconstruction.md`
- `research/48_oc04_capability_stack_deconstruction.md`
- `research/49_cc01_agent_orchestration_donor.md`
- `research/51_cc02_harness_pressure_tool_exposure.md`
- `research/52_openclaw_cc_migration_matrix.md`
