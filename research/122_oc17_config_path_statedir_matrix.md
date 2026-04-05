# OC-17 OpenClaw Config Path / ResolvePath / StateDir Contract Matrix

## Purpose

Establish the exact path-resolution contract that governs SNC config on a clean host: where OpenClaw finds config, how `$include` paths resolve, how plugin `resolvePath` behaves, and what `stateDir` really means in live SNC code. The goal is to separate code facts from operator recommendations so Milestone 2 docs do not accidentally rely on workspace-local assumptions.

## Scope

- Repo focus:
  - OpenClaw host: `data/external/openclaw-v2026.4.1`
  - SNC plugin: `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc`
- Main entry files:
  - `data/external/openclaw-v2026.4.1/src/config/paths.ts`
  - `data/external/openclaw-v2026.4.1/src/config/includes.ts`
  - `data/external/openclaw-v2026.4.1/src/utils.ts`
  - `data/external/openclaw-v2026.4.1/src/infra/home-dir.ts`
  - `data/external/openclaw-v2026.4.1/src/plugins/loader.ts`
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/index.ts`
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/config.ts`
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.ts`
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-state.ts`
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.ts`
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/hook-scaffold.ts`
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/README.md`

## Verified Structure / Lifecycle / Contract

### 1. Host config location matrix

| Surface | Resolution rule | Relative-path base |
| --- | --- | --- |
| `OPENCLAW_STATE_DIR` | highest-precedence state-dir override | resolved through `resolveUserPath(...)` |
| default state dir | prefer `~/.openclaw`, then legacy existing dirs, then fallback to `~/.openclaw` | home-based |
| `OPENCLAW_CONFIG_PATH` | highest-precedence config-file override | resolved through `resolveUserPath(...)` |
| canonical config path | `${stateDir}/openclaw.json` | anchored to resolved `stateDir` |
| active config path search | prefers existing candidates before canonical path | host-config candidate search, not plugin logic |

Important distinction: host config-file discovery is a dedicated contract in `config/paths.ts`, not a generic "resolve anything relative to the current repo" rule.

### 2. `$include` path behavior is config-file-relative, not plugin-relative

`config/includes.ts` resolves a relative `$include` path against the directory of the current config file.

It also:

- rejects escaping the top-level config root
- re-validates symlink realpaths
- caps depth and file size

So OpenClaw already has one path system that is explicitly config-file-relative and boundary-checked.

### 3. Plugin `resolvePath` is a different contract

OpenClaw injects plugin API `resolvePath` as:

- `resolvePath: (input) => resolveUserPath(input)`

`resolveUserPath(...)` then calls `resolveHomeRelativePath(...)`, which behaves as follows:

- blank string -> `""`
- `~`-prefixed path -> expand against effective home dir, then `path.resolve(...)`
- all other paths -> `path.resolve(trimmed)`

That means relative plugin config values are resolved against the process current working directory, not:

- the plugin package root
- the config file directory
- the workspace directory by explicit contract

### 4. SNC resolves all path-like config through plugin `resolvePath`

`resolveSncPluginConfig(...)` runs these fields through `resolvePath(...)`:

- `briefFile`
- `ledgerFile`
- `packetFiles[]`
- `packetDir`
- `stateDir`

So SNC stores resolved absolute path strings at startup. It does not retain "relative-to-config" intent.

### 5. `stateDir` is a real runtime boundary, not a cosmetic path

Verified live usage:

- session continuity state lives under `stateDir/sessions/*`
- worker controller state lives under `stateDir/workers/*`
- durable memory lives under `stateDir/durable-memory/*`

Verified gating:

- session-state functions return `null` when `stateDir` is absent
- worker-state functions return `null` when `stateDir` is absent
- durable-memory store functions return `null` when `stateDir` is absent
- hook-scaffold lifecycle handlers return early when `stateDir` is absent

So `stateDir` is not merely "where files happen to go." It is the persistence boundary for SNC continuity, worker hygiene, and durable memory.

### 6. Relative-path contract matrix

| Path kind | Relative base in current code | Safe statement |
| --- | --- | --- |
| host `$include` | current config file directory | config-file-relative |
| host `OPENCLAW_STATE_DIR` / `OPENCLAW_CONFIG_PATH` | process CWD after `resolveUserPath(...)`, with `~` support | env-override path |
| plugin `api.resolvePath(...)` | process CWD after `resolveUserPath(...)`, with `~` support | plugin-config path |
| SNC `stateDir`, `briefFile`, `ledgerFile`, `packetDir`, `packetFiles[]` | process CWD because SNC uses plugin `resolvePath(...)` | current gateway working-directory-relative unless absolute or `~`-anchored |

This is the key docs risk: relative SNC paths do not behave like `$include` paths.

### 7. Clean-host implication for current README examples

The current SNC README uses examples such as:

- `stateDir: "./.snc/state"`
- `briefFile: "./docs/snc/brief.md"`
- `packetDir: "./docs/snc/packets"`

Those examples can work, but only if the operator's gateway process CWD is the directory they think it is.

Current code does not support the stronger claims below:

- "relative SNC paths are relative to the plugin directory"
- "relative SNC paths are relative to the OpenClaw config file"
- "relative SNC paths are always relative to the workspace root"

### 8. Recommended operator path posture

For clean-host delivery, the safest operator posture is:

- use `~`-anchored or absolute `stateDir`
- use `~`-anchored or absolute artifact paths when the files are meant to survive service launches or different shells
- reserve relative SNC paths for controlled development environments where the gateway CWD is known

## Key Findings

1. OpenClaw already has multiple distinct path contracts; plugin `resolvePath` is not the same as config `$include`.
2. SNC resolves all path-like config through the plugin API resolver, so its relative paths are CWD-relative in current code.
3. `stateDir` is the real persistence gate for SNC, not just a storage preference.
4. The current README examples are usable in some environments, but they imply more path stability than the host actually guarantees.
5. `CONFIG_DIR` and host config-location helpers should not be confused with SNC plugin-path resolution.

## SNC Relevance

This packet directly constrains Milestone 2 install docs, demo configs, and operator recommendations.

For SNC, the reliable first-run story is:

- ordinary plugin install
- explicit `plugins.slots.contextEngine = "snc"`
- explicit `stateDir` using `~` or absolute path
- restart the gateway

That story is code-accurate across clean-host setups. A relative `./.snc/state` example is only safe when the docs also explain the CWD assumption.

## Modification Guidance

- `wrap`:
  - SNC docs should separate code fact from recommendation and prefer `~`-anchored examples.
  - SNC validation should surface the resolved `stateDir` and warn when operators rely on relative paths in ambiguous service environments.
- `extend`:
  - If OpenClaw later wants a more operator-friendly plugin-path contract, it should change host `resolvePath` semantics centrally rather than adding SNC-only path hacks.
- `defer`:
  - Do not redesign host path semantics inside SNC for Milestone 2.
- `avoid`:
  - Do not describe SNC paths as config-file-relative.
  - Do not imply that clean-host installs inherit the engineering workspace root as their path base.

## Still-unverified questions

1. The exact gateway service working directory across every packaged OpenClaw deployment lane and operating-system variant.
2. Whether future host versions will deliberately change plugin `resolvePath` to be config-root-relative or workspace-relative.
3. Whether later SNC delivery tooling will emit fully expanded absolute paths into config, reducing runtime ambiguity.
