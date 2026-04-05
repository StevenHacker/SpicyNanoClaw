# OC-18 OpenClaw Plugin Diagnostics / Doctor / Config-Validate Surface Matrix

## Purpose

Pin down which built-in OpenClaw support surfaces already help an operator understand plugin health, and where those surfaces stop. The goal is to keep SNC Milestone 2 diagnostics grounded in host reality instead of inventing a parallel control plane.

## Scope

- repo: `data/external/openclaw-v2026.4.1`
- primary files:
  - `src/cli/plugins-cli.ts`
  - `src/plugins/status.ts`
  - `src/cli/config-cli.ts`
  - `src/commands/config-validation.ts`
  - `src/commands/doctor-workspace-status.ts`
  - `src/plugins/loader.ts`
- focus:
  - discovery/status surfaces
  - validation surfaces
  - doctor-style diagnostics
  - what the host already catches versus what SNC still needs to explain in docs/checklists

## Verified Structure / Lifecycle / Contract

### 1. Support surface matrix

| Surface | Entry path | What it actually reads | What it can prove | What it does not prove |
| --- | --- | --- | --- | --- |
| plugin discovery/status | `buildPluginStatusReport()` in `plugins/status.ts` | config + workspace dir + plugin loader output | which plugins load, disable, error, and what loader diagnostics were emitted | that the already-running gateway has adopted the same plugin state |
| per-plugin inspection | `openclaw plugins inspect` in `plugins-cli.ts` via `buildPluginInspectReport()` | plugin status report + plugin config/install metadata | plugin shape, capabilities, hooks, services, diagnostics, compatibility notices, policy metadata | live slot selection success at runtime, prompt behavior, or gateway hot-reload |
| config validation | `openclaw config validate` in `config-cli.ts` | `readConfigFileSnapshot()` only | config file exists, parses, and satisfies schema/validation rules | plugin load success, plugin path resolvability, or runtime slot resolution |
| config compatibility advisory | `requireValidConfigFileSnapshot(... includeCompatibilityAdvisory)` in `commands/config-validation.ts` | valid config snapshot + compatibility notice builder | config is valid and has limited compatibility advisory output | deep plugin health or load-time failures |
| doctor-style plugin report | `openclaw plugins doctor` in `plugins-cli.ts` | plugin status report + error diagnostics + compatibility notices | loader/plugin errors, error-level diagnostics, compatibility warnings | full runtime health, selected context-engine viability, or gateway-side adoption |
| workspace doctor notes | `noteWorkspaceStatus()` in `doctor-workspace-status.ts` | skill status + plugin status report + compatibility warnings | workspace-level counts and a summarized plugin trouble snapshot | a targeted SNC health contract |

### 2. `plugins inspect` is a discovery/status surface, not a live runtime probe

`plugins inspect` calls `loadConfig()`, then `buildPluginStatusReport({ config: cfg })`, then builds one or more inspect reports.

Verified exposed details include:

- plugin status: `loaded` / `disabled` / `error`
- source, origin, version, bundle format
- shape: `hook-only`, `plain-capability`, `hybrid-capability`, `non-capability`
- capability families and ids
- typed hooks, custom hooks, tools, commands, CLI commands
- services, gateway methods, MCP servers, LSP servers, HTTP route count
- plugin policy metadata:
  - `allowPromptInjection`
  - `allowModelOverride`
  - `allowedModels`
- plugin-local diagnostics
- compatibility notices
- install metadata from `cfg.plugins?.installs`

That makes `inspect` a strong discovery/status tool for "what the loader sees now in this CLI process", but not proof that the running gateway has already reloaded the same plugin graph.

### 3. `config validate` is schema/config-file validation only

`runConfigValidate(...)`:

- reads `readConfigFileSnapshot()`
- fails if the config file is missing
- fails if the snapshot is invalid and prints normalized issue lines
- suggests `openclaw doctor` for repair help
- succeeds when the config snapshot is valid

It does not call `buildPluginStatusReport()` and does not run the plugin loader. So it validates config structure, not plugin runtime viability.

### 4. `plugins doctor` is a loader/diagnostics summary, not a slot-resolution doctor

`openclaw plugins doctor` builds:

- `errors = report.plugins.filter((p) => p.status === "error")`
- `diags = report.diagnostics.filter((d) => d.level === "error")`
- `compatibility = buildPluginCompatibilityNotices({ report })`

It prints:

- `Plugin errors`
- `Diagnostics`
- `Compatibility`

and prints `No plugin issues detected.` only when all three buckets are empty.

So `plugins doctor` is a useful host-provided plugin-health summary, but its coverage is only as good as loader diagnostics plus compatibility notice generation.

### 5. Compatibility notices are narrow, not a full health taxonomy

`buildPluginCompatibilityNotices(...)` currently derives from inspect report shape/flags and is not a generic "all plugin problems" layer.

Code-verified notice families observed in this packet:

- `legacy-before-agent-start`
- `hook-only`

That is helpful for migration/shape warnings, but far narrower than full runtime/plugin health.

### 6. Loader diagnostics are asymmetric across exclusive slots

In `plugins/loader.ts`, the loader explicitly warns when a configured memory slot target is missing or not actually a memory plugin:

- `memory slot plugin not found or not marked as memory: ${memorySlot}`

This packet did not find an equivalent loader diagnostic for stale `plugins.slots.contextEngine`.

That matters because phase 7 already proved `contextEngine` selection/cleanup asymmetry. Host diagnostics today are much better at generic plugin load errors than at proactively surfacing a stale selected context-engine id.

### 7. Host-provided versus SNC-doc-only support boundary

Host already provides:

- config file/schema validation
- plugin discovery and inspect surfaces
- plugin doctor summary
- workspace-level plugin/compatibility notes

SNC still needs local guidance for:

- "restart after enable/install/config change"
- "reselect the context-engine slot before disabling/uninstalling SNC"
- "use absolute or `~`-anchored `stateDir` in service/clean-host lanes"
- "plugin loads in CLI" versus "running gateway is actually using SNC"

## Key Findings

1. OpenClaw already has a meaningful plugin support stack, but it is layered: `config validate` checks config shape, `inspect` shows loader-visible structure, and `doctor` summarizes loader/diagnostic errors.
2. None of those surfaces should be misdescribed as a live gateway adoption probe.
3. Current host diagnostics are stronger for plugin-load problems than for stale `contextEngine` slot selection.
4. SNC Milestone 2 should lean on host diagnostics first, then fill the remaining operator gap with targeted docs/checklists rather than a duplicate doctor subsystem.

## SNC Relevance

For SNC operators, the existing host-safe sequence is:

1. `openclaw config validate`
2. `openclaw plugins inspect snc`
3. `openclaw plugins doctor`
4. restart the gateway
5. if SNC still does not behave as expected, inspect the resolved SNC config/path assumptions rather than assuming host validation already checked them

This is enough for Milestone 2 docs and clean-host support language, but not enough to claim that OpenClaw already diagnoses all SNC-specific slot/path edge cases.

## Modification Guidance

- `wrap`:
  - SNC docs and validation notes should explicitly chain host surfaces in the order above.
  - SNC clean-host guidance should say what each host command proves and what it does not prove.
- `extend`:
  - If host diagnostics are expanded later, the right place for stale `contextEngine` slot detection is the host loader/doctor layer, not SNC-only hacks.
- `defer`:
  - A dedicated SNC doctor command is not justified for Milestone 2 from current evidence.
- `avoid`:
  - Do not say `config validate` proves plugin runtime health.
  - Do not say `plugins inspect` proves the already-running gateway has adopted SNC.
  - Do not say host doctor currently closes the stale `contextEngine` slot gap.

## Still-unverified questions

1. Whether later OpenClaw host versions add a dedicated `contextEngine`-slot diagnostic comparable to the current memory-slot warning.
2. Whether any gateway/status surfaces outside this packet later expose selected-context-engine failure more directly than loader/inspect surfaces do today.
3. Whether future compatibility notices broaden beyond the currently observed shape/migration warnings.
