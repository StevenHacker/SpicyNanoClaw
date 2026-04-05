# Dispatch Cycle 001

## Mode

Balanced configuration:

- `1` dispatcher thread
- `5` worker slots

Shape:

- `2` OpenClaw deconstruction workers
- `2` SNC engineering/support workers
- `1` donor/acceptance support worker

## Slot W1

Type:

- `research`

Theme:

- `OC-01 Agent Runtime Core`

Write scope:

- `read-only`

Objective:

- produce a deconstruction-grade runtime memo for OpenClaw core execution surfaces

Targets:

- `src/agents`
- `src/context-engine`
- `src/flows`
- `src/tasks`

Required output:

- subsystem purpose
- entry files
- verified call-chain notes
- safe SNC modification notes
- unsafe/internal-edit-only zones

Acceptance:

- must end with modification classifications
- must cite concrete files

## Slot W2

Type:

- `research`

Theme:

- `OC-02 Plugin / Hook / Manifest Host`

Write scope:

- `read-only`

Objective:

- deconstruct the OpenClaw plugin host into slot, hook, manifest, and extension delivery surfaces

Targets:

- `src/plugins`
- `src/plugin-sdk`
- `src/hooks`
- `extensions/*`

Required output:

- plugin lifecycle map
- slot ownership notes
- hook timing notes
- SNC packaging/modification notes

Acceptance:

- must separate hot-pluggable seams from host-owned seams

## Slot W3

Type:

- `research`

Theme:

- `OC-05 Config / Security / Ops`

Write scope:

- `read-only`

Objective:

- identify runtime policy, config, and operational constraints that will govern SNC packaging and rollout

Targets:

- `src/config`
- `src/security`
- `src/infra`
- `src/bootstrap`
- `src/daemon`

Required output:

- config boundary note
- security/policy constraint note
- operational risk note
- SNC modification guidance

Acceptance:

- must distinguish config-driven constraints from code-driven constraints

## Slot W4

Type:

- `implementation`

Theme:

- `SNC-04 Hook Integration Scaffold`

Write scope:

- `small-set`

Owned files:

- `C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1\extensions\snc\index.ts`
- `C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1\extensions\snc\openclaw.plugin.json`
- `C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1\extensions\snc\src\config.ts`
- `C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1\extensions\snc\src\hooks.ts`
- `C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1\extensions\snc\src\hooks.test.ts`

Forbidden files:

- `engine.ts`
- `session-state.ts`

Objective:

- build a bounded hook-registration scaffold for later SNC hook work without changing default runtime behavior

Acceptance:

- disabled-by-default or no-op-safe
- no host-internal OpenClaw edits
- focused tests if added

## Slot W5

Type:

- `implementation`

Theme:

- `SNC-06 Validation / Repo Hygiene Support`

Write scope:

- `small-set`

Owned files:

- `C:\Users\Administrator\Documents\codex_project_1\scripts\validate_snc_working_copy.ps1`
- `C:\Users\Administrator\Documents\codex_project_1\research\42_validation_protocol.md`

Forbidden files:

- SNC runtime code
- OpenClaw host internals

Objective:

- create a repeatable dispatcher-side validation entrypoint for the working SNC host copy

Acceptance:

- must run focused SNC tests
- must run full workspace typecheck with the documented 8 GB heap setting
- protocol note must state expected usage clearly

## Dispatcher Acceptance Rules

1. Only dispatcher marks `done`.
2. Code packets must be locally re-run before acceptance.
3. Research packets must be integrated into the canonical research docs before acceptance.
4. Git staging and commit remain dispatcher-only.

## Outcome

Cycle 1 finished successfully.

Accepted outputs:

- `OC-01`
  - `research/44_oc01_runtime_core_deconstruction.md`

- `OC-02`
  - `research/42_oc02_plugin_host_deconstruction.md`

- `OC-05`
  - `research/43_oc05_config_security_ops_deconstruction.md`

- `SNC-04`
  - `research/45_snc_hook_scaffold_v1.md`

- `OPS-03`
  - `scripts/validate_snc_dispatcher.ps1`
  - `research/41_dispatcher_validation_helper.md`

Dispatcher conclusion:

- the balanced `1 + 5` model is viable
- research packets can be deconstructed and accepted in parallel
- bounded implementation slices can be delivered and verified in parallel
- dispatcher-side review, documentation, and acceptance remain manageable at this scale
