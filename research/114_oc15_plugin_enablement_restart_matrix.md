## Purpose

Establish the real operator-facing lifecycle for OpenClaw plugin delivery and activation: how plugins are installed from each source lane, how config enablement is written, what becomes visible immediately to discovery/status tooling, what still requires a gateway restart, and where "reload" exists only as host-internal loader machinery rather than a public clean-host workflow. The goal is to keep SNC Milestone 2 delivery aligned with the actual OpenClaw plugin product surface instead of over-reading internal loader capabilities.

## Scope

- Repo: `data/external/openclaw-v2026.4.1`
- Focus:
  - `openclaw plugins install|enable|disable|update|uninstall|marketplace`
  - config writes performed by plugin management commands
  - slot activation side effects during install/enable
  - restart-required versus immediate-effect behavior
  - runtime discovery visibility versus running gateway activation
  - clean-host operator guidance for plugin delivery
- Out of scope:
  - plugin authoring SDK stability
  - channel-specific onboarding flows except where they prove plugin enablement semantics
  - future SNC packaging choices beyond host-compatible delivery guidance

## Main Entry Files

- `data/external/openclaw-v2026.4.1/src/cli/plugins-cli.ts`
- `data/external/openclaw-v2026.4.1/src/cli/plugins-install-command.ts`
- `data/external/openclaw-v2026.4.1/src/cli/plugins-install-persist.ts`
- `data/external/openclaw-v2026.4.1/src/cli/plugins-update-command.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/install.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/marketplace.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/enable.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/toggle-config.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/slots.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/uninstall.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/status.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/loader.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/runtime.ts`
- `data/external/openclaw-v2026.4.1/src/cli/daemon-cli/register-service-commands.ts`

## Verified Structure / Lifecycle / Contract

### 1. Install lane matrix

`runPluginInstallCommand(...)` is the CLI entry. It resolves the source lane first, then calls the corresponding installer, then persists config through `persistPluginInstall(...)`.

Verified install-source split:

| Source lane | Install path behavior | Config write behavior | Install record behavior | Restart requirement |
| --- | --- | --- | --- | --- |
| Local path with `--link` | does not copy; keeps original directory | appends path to `plugins.load.paths`, enables plugin, applies slot selection | records `source: "path"` with source/install path set to original path | yes |
| Local dir or archive without `--link` | copies or extracts into `stateDir/extensions` | enables plugin, applies slot selection | records `source: "path"` or `source: "archive"` with managed install path | yes |
| Local single-file plugin | copies into managed extensions location | enables plugin, applies slot selection | managed install record | yes |
| npm | downloads then installs into `stateDir/extensions` | enables plugin, applies slot selection | records npm resolution metadata for later update | yes |
| ClawHub | downloads then installs into `stateDir/extensions` | enables plugin, applies slot selection | records ClawHub metadata for later update | yes |
| marketplace | resolves marketplace entry to local path/archive/repo, then installs via normal path flow | enables plugin, applies slot selection | records marketplace metadata for later update | yes |
| `plugins marketplace list` | no install | no config change | none | no |

Important code-verified details:

- `--link` is only supported for local paths.
- `--link` is explicitly rejected with `--marketplace`.
- `--pin` is explicitly rejected with `--marketplace`.
- Marketplace install is not a distinct runtime activation path. It resolves a marketplace entry, then delegates back into `installPluginFromPath(...)`.

### 2. Install-time config activation order

After a successful install, `persistPluginInstall(...)` performs this order:

1. `enablePluginInConfig(...)`
2. `recordPluginInstall(...)`
3. `applySlotSelectionForPlugin(...)`
4. `replaceConfigFile(...)`
5. emit slot warnings if needed
6. print install success
7. print `Restart the gateway to load plugins.`

This means install is not just disk placement. It also writes the plugin into the host activation config immediately, but still treats the running gateway as stale until restart.

### 3. Enable and disable behavior

#### Enable

`plugins enable <id>` does not install anything. It mutates config only.

Verified order:

1. load config snapshot
2. `enablePluginInConfig(...)`
3. `applySlotSelectionForPlugin(...)`
4. `replaceConfigFile(...)`
5. print `Enabled plugin "...". Restart the gateway to apply.`

`enablePluginInConfig(...)` behavior:

- respects `plugins.enabled === false`
- refuses enablement when plugin is denylisted
- normalizes built-in channel ids through `normalizeChatChannelId(...)`
- writes `plugins.entries[pluginId].enabled = true`
- ensures the plugin is allowlisted
- if the id maps to a built-in channel id, also writes `channels[channelId].enabled = true`

#### Disable

`plugins disable <id>` also mutates config only.

Verified order:

1. load config snapshot
2. `setPluginEnabledInConfig(cfg, id, false)`
3. `replaceConfigFile(...)`
4. print `Disabled plugin "...". Restart the gateway to apply.`

Disable does not remove install records or plugin files. It only changes config posture.

### 4. Slot activation and slot-side effects

Install and enable both run `applySlotSelectionForPlugin(...)`, which delegates to `applyExclusiveSlotSelection(...)`.

Verified slot behavior:

- exclusive slot kinds include `memory` and `contextEngine`
- selecting a slot owner writes `plugins.slots[slotKey] = pluginId`
- selecting a slot owner can also disable competing plugins for that same slot
- warnings are emitted when slot ownership changes

However, the removal side is asymmetric in currently verified code:

- install/enable helper is generic across `memory` and `contextEngine`
- uninstall cleanup only explicitly resets `plugins.slots.memory`

So this packet treats memory-slot cleanup as verified end-to-end, while context-engine slot removal symmetry is not fully confirmed here.

### 5. Update lane matrix

`plugins update` only targets tracked install records with supported sources.

Verified update support:

| Install source | `plugins update` behavior |
| --- | --- |
| `npm` | supported |
| `clawhub` | supported |
| `marketplace` | supported |
| `path` | skipped |
| `archive` | skipped |

Additional timing notes:

- update runs against tracked install metadata, not against arbitrary discovered plugins
- when updates change plugin or hook-pack installs and it is not a dry run, config is rewritten and the CLI prints `Restart the gateway to load plugins and hooks.`
- path-linked developer installs are intentionally not part of the formal update lane

### 6. Uninstall timing and cleanup matrix

`plugins uninstall` removes config first, then optionally deletes managed files.

Verified config-side removal behavior in `removePluginFromConfig(...)`:

- remove `plugins.entries[pluginId]`
- remove `plugins.installs[pluginId]`
- remove plugin id from allowlist
- remove linked source path from `plugins.load.paths` when install source is `path`
- reset memory slot if that plugin owned it
- remove owned channel config keys for installed channel plugins

Verified disk-side behavior in `uninstallPlugin(...)`:

| Install source | File deletion behavior |
| --- | --- |
| linked `path` install | source directory is never deleted |
| managed non-path install | may delete resolved managed directory under extensions root |

Uninstall conclusion:

- config is the source of truth
- directory deletion failure is downgraded to warning
- the CLI still instructs `Restart the gateway to apply changes.`

### 7. Runtime discovery visibility versus running gateway activation

This is the most important operator distinction.

`plugins list`, `plugins inspect`, and `plugins doctor` build a fresh report through `buildPluginStatusReport(...)`, which loads plugins from config/discovery in the CLI process.

That gives immediate visibility in a new CLI invocation:

- newly installed plugin can appear in `plugins list`
- enable/disable state can appear in `plugins inspect`
- loader/discovery diagnostics can appear in `plugins doctor`

But that is not the same as the already-running gateway adopting the new registry.

Code-verified runtime facts:

- `loadOpenClawPlugins(...)` can activate a registry inside the current process via `setActivePluginRegistry(...)`
- active plugin registry state is process-global, not cross-process
- channel and HTTP-route registries can be pinned to startup snapshots
- pinned channel registry is documented to survive later non-primary registry loads

So the CLI can observe the post-write config immediately in its own process, while the running gateway service still needs a restart to rebuild its own active plugin registry.

### 8. Restart versus reload reality

There is strong internal loader machinery for registry reload, but no verified public "plugin hot-reload" operator lane in the plugin CLI itself.

Verified operator-facing behavior:

- install prints restart-required messaging
- enable prints restart-required messaging
- disable prints restart-required messaging
- uninstall prints restart-required messaging
- update prints restart-required messaging after non-dry-run changes
- service restart command exists as `openclaw gateway restart`

So the clean-host contract is:

1. mutate plugin config/install state
2. restart the gateway service
3. then expect runtime activation

This is more precise than saying OpenClaw has no reload capability at all. Internally it does. But that internal capability is not exposed as the primary operator product surface for plugin delivery.

## Key Findings

1. OpenClaw plugin delivery is a two-step operator contract: write install/config state now, activate in the running gateway after restart.
2. `plugins list` visibility is not proof of live gateway activation. It is proof that a fresh CLI-side registry load can now discover and evaluate the plugin.
3. Marketplace install is a packaging source lane, not a separate activation model. It resolves to the normal path installer.
4. Linked-path installs are explicitly a developer lane. They stay outside managed file deletion and outside the formal update path.
5. Slot selection happens during install/enable, so those commands can silently reshape exclusive-slot ownership beyond merely toggling `enabled`.
6. Public operator semantics are restart-based, even though loader internals support in-process reactivation.

## SNC Relevance

For SNC Milestone 2, this packet tightens the delivery boundary that packet 30 already identified.

SNC should be shipped as an ordinary plugin that fits the managed install-and-restart contract. Clean-host delivery should target copied/archive/npm-style managed installs, not `--link`, because `--link` is clearly a development convenience lane with different uninstall and update semantics.

This also sharpens product messaging. If SNC writes operator docs or demo scripts, it should say:

- install or copy the plugin through the normal plugin lane
- write the recommended config profile
- restart the gateway
- then verify with plugin/status commands

It should not imply that a running gateway will immediately hot-adopt a newly installed plugin just because `plugins list` can now see it from a fresh CLI process.

## Modification Guidance

Wrap:

- ordinary plugin install/update/uninstall commands
- restart-required messaging in SNC docs and release rehearsal
- CLI verification steps that read post-write plugin status after install

Extend carefully:

- slot-aware operator guidance, especially when SNC occupies exclusive roles
- clean-host release rehearsal around managed install records and restart sequencing

Defer:

- any SNC product story that depends on public hot-reload or plugin live-swap
- marketplace-first default delivery until SNC actually needs that distribution lane

Do not treat as stable operator contract:

- internal `loadOpenClawPlugins(...)` activation behavior
- process-global active-registry manipulation in plugin runtime internals
- loader cache clearing as if it were an end-user deployment primitive

## Still-unverified Questions

1. This packet confirms that install/enable helper code can write `contextEngine` slot selection, but it does not fully confirm an operator-grade symmetric cleanup path for that slot during uninstall.
2. No public plugin-specific reload command was found in this pass, but this packet did not exhaustively trace every gateway-internal config-reload surface outside the plugin CLI and daemon restart path.
3. The packet confirms fresh CLI discovery visibility after config/install writes, but it does not benchmark or fully map short-lived discovery-cache timing edge cases across repeated commands in the same long-lived process.
