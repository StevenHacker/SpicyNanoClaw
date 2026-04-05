# OC-19 OpenClaw Gateway Launch / Working-Directory Matrix

## Purpose

Resolve the practical gap left by the path packet: if SNC plugin paths are CWD-relative in current host code, which gateway launch lanes actually determine that CWD? The goal is to separate code-verified launch behavior from deployment-specific assumptions so Milestone 2 path guidance stays honest.

## Scope

- repo: `data/external/openclaw-v2026.4.1`
- primary files:
  - `src/cli/gateway-cli/run.ts`
  - `src/cli/daemon-cli/install.ts`
  - `src/cli/daemon-cli/lifecycle.ts`
  - `src/commands/daemon-install-helpers.ts`
  - `src/daemon/program-args.ts`
  - `src/daemon/service-env.ts`
  - `src/daemon/launchd-plist.ts`
  - `src/daemon/systemd-unit.ts`
  - `src/daemon/schtasks.ts`
  - `src/config/paths.ts`
  - `src/infra/home-dir.ts`
- focus:
  - foreground CLI lane
  - daemon/service lane
  - config path discovery versus process CWD
  - what is code-verified versus what remains service-manager/deployment specific

## Verified Structure / Lifecycle / Contract

### 1. Launch/CWD matrix

| Lane | Code path | Explicit working directory? | Config path behavior | CWD confidence |
| --- | --- | --- | --- | --- |
| foreground CLI | `openclaw gateway run` -> `runGatewayCommand()` | no explicit `process.chdir(...)`; no explicit `cwd` override in the run path | config is loaded through normal config path helpers | inherits caller shell/process CWD |
| daemon install, normal built runtime | `runDaemonInstall()` -> `buildGatewayInstallPlan()` -> `resolveGatewayProgramArguments()` | usually no `workingDirectory` returned | service env can carry `OPENCLAW_STATE_DIR` / `OPENCLAW_CONFIG_PATH`; otherwise host config defaults apply | process manager default if service definition omits working dir |
| daemon install, dev mode | `resolveGatewayProgramArguments({ dev: true ... })` | yes, `workingDirectory = repoRoot` | same config rules, but launch lane pins repo root as service cwd | code-verified repo-root CWD |
| launchd service | generated plist via `buildLaunchAgentPlist(...)` | `WorkingDirectory` only when plan supplies one | environment block can carry config/state env vars | if omitted, actual launchd default is deployment/runtime specific |
| systemd user service | generated unit via `buildSystemdUnit(...)` | `WorkingDirectory=` only when plan supplies one | environment lines can carry config/state env vars | if omitted, actual runtime cwd is not fixed by OpenClaw unit file |
| Windows scheduled task / startup fallback | generated `gateway.cmd` via `buildTaskScript(...)` | `cd /d ...` only when plan supplies one | task environment can carry config/state env vars | if omitted, actual task startup cwd is Windows/task-host specific |

### 2. Foreground `gateway run` does not redefine CWD

`src/cli/gateway-cli/run.ts`:

- loads config with `loadConfig()`
- reads snapshot with `readConfigFileSnapshot()`
- resolves audit path with `resolveStateDir(process.env)`
- starts the gateway through `runGatewayLoop(...)`

This packet did not find any `process.chdir(...)` in the OpenClaw source tree, and the foreground gateway run path does not pass an alternate `cwd`.

So the foreground lane inherits the shell/process current working directory.

### 3. Service install does not universally pin a working directory

`buildGatewayInstallPlan(...)` gets `{ programArguments, workingDirectory }` from `resolveGatewayProgramArguments(...)`.

That resolver only sets `workingDirectory` in dev-oriented TypeScript/bun repo-root cases. In the normal built-runtime path it returns only program arguments.

So OpenClaw's service install contract is:

- explicit working directory in dev mode
- no host-enforced working directory in ordinary built-runtime installs unless some future plan path starts providing one

### 4. Service definitions only emit working-directory metadata when it exists

Code-verified emitters:

- launchd plist:
  - `buildLaunchAgentPlist(...)` writes `<key>WorkingDirectory</key>` only when `workingDirectory` is passed
- systemd unit:
  - `buildSystemdUnit(...)` writes `WorkingDirectory=` only when `workingDirectory` exists
- Windows task script:
  - `buildTaskScript(...)` emits `cd /d ...` only when `workingDirectory` exists

That means OpenClaw does not implicitly stabilize CWD for ordinary service installs. It only serializes a working directory when the install plan explicitly produced one.

### 5. Config path discovery is a different contract from process CWD

`src/config/paths.ts` and `src/infra/home-dir.ts` show that host config discovery is not a generic "resolve everything relative to cwd" system.

Verified host config rules:

- default state dir: home-based
- default config path: derived from state dir / known config candidates
- `OPENCLAW_STATE_DIR` and `OPENCLAW_CONFIG_PATH` overrides go through `resolveHomeRelativePath(...)`
- `~` expands to effective home
- non-`~` relative paths go through `path.resolve(...)`, so they still depend on current process CWD

Important distinction:

- default host config discovery is mostly home/state-dir based
- relative env overrides are still CWD-sensitive
- plugin `resolvePath(...)` also becomes CWD-sensitive because it ultimately uses `path.resolve(...)`

### 6. Service environment can stabilize host config, but only when operators set it sanely

`buildServiceEnvironment(...)` copies these into the service environment when present:

- `OPENCLAW_STATE_DIR`
- `OPENCLAW_CONFIG_PATH`

That helps separate host config discovery from service-manager defaults, but only if those env values themselves are stable.

If an operator installs the service with relative env overrides, those relative strings are still resolved later in the service process and therefore remain CWD-sensitive.

### 7. Lifecycle/restart code does not add new CWD guarantees

`daemon-cli/lifecycle.ts` and `daemon/service.ts`:

- restart/start/stop use service manager commands or unmanaged PID signaling
- `readCommand(...)` can recover program args, working directory, and environment from the installed service definition
- lifecycle code merges stored service env for later checks

But the lifecycle layer does not introduce a new working-directory normalization step. It only reuses whatever the service definition already encoded.

## Key Findings

1. Foreground `openclaw gateway run` inherits the caller's CWD; OpenClaw does not reset it.
2. Ordinary daemon/service installs do not universally pin a working directory; only dev-mode launch planning clearly does so.
3. OpenClaw's host config discovery is more stable than plugin-path resolution, but relative env overrides still become CWD-sensitive.
4. Service managers can carry explicit config/state env values, yet OpenClaw cannot guarantee one universal default CWD across launchd/systemd/schtasks when no working directory is emitted.

## SNC Relevance

This packet sharpens the Milestone 2 operator story:

- relative SNC paths are safe only in controlled foreground/dev environments where the gateway CWD is known
- clean-host/service guidance should prefer:
  - default host config location, or
  - explicit `~`/absolute `OPENCLAW_CONFIG_PATH` and `OPENCLAW_STATE_DIR`, and
  - explicit `~`/absolute SNC `stateDir` / artifact paths

For SNC, the important separation is:

- host config file discovery can be stable without depending on repo cwd
- SNC plugin config paths still depend on process CWD unless made absolute or `~`-anchored

## Modification Guidance

- `wrap`:
  - SNC docs should treat foreground/local dev and service/clean-host lanes as different path-trust levels.
  - Operator guidance should prefer `~` or absolute `stateDir` and artifact paths.
- `extend`:
  - If host wants stronger path guarantees later, it should centralize them in plugin `resolvePath` semantics or in service install planning, not in SNC-only path hacks.
- `defer`:
  - Do not redesign OpenClaw service launch semantics inside SNC Milestone 2.
- `avoid`:
  - Do not say plugin paths are config-file-relative.
  - Do not say daemon installs always run from the config directory or workspace root.
  - Do not assume service-manager default CWD is portable across OS/service lanes.

## Still-unverified questions

1. The exact runtime default CWD chosen by launchd, systemd user services, and Windows task/startup fallback on every real deployment variant when OpenClaw omits `workingDirectory`.
2. Whether later host releases begin pinning a non-dev working directory in `resolveGatewayProgramArguments(...)`.
3. Whether packaging/install lanes outside this repo snapshot wrap gateway launch with their own external `cwd` guarantees.
