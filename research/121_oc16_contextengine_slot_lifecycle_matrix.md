# OC-16 OpenClaw ContextEngine Slot Lifecycle / Cleanup Symmetry Matrix

## Purpose

Pin down the exact lifecycle of the OpenClaw `contextEngine` slot so SNC Milestone 2 can be installed, enabled, swapped, disabled, updated, and removed without relying on vague "plugin reload" assumptions. This packet is specifically about slot ownership, cleanup symmetry, and operator-safe swap guidance.

## Scope

- Repo: `data/external/openclaw-v2026.4.1`
- Focus:
  - `context-engine` slot selection
  - install / enable / disable / uninstall / update-id-change behavior
  - registry resolution and restart-time failure modes
  - competing `context-engine` plugins
  - safe SNC swap-in / swap-out guidance
- Main entry files:
  - `data/external/openclaw-v2026.4.1/src/plugins/slots.ts`
  - `data/external/openclaw-v2026.4.1/src/cli/plugins-install-persist.ts`
  - `data/external/openclaw-v2026.4.1/src/cli/plugins-cli.ts`
  - `data/external/openclaw-v2026.4.1/src/plugins/uninstall.ts`
  - `data/external/openclaw-v2026.4.1/src/plugins/update.ts`
  - `data/external/openclaw-v2026.4.1/src/plugins/config-state.ts`
  - `data/external/openclaw-v2026.4.1/src/plugins/loader.ts`
  - `data/external/openclaw-v2026.4.1/src/context-engine/registry.ts`

## Verified Structure / Lifecycle / Contract

### 1. Slot model

- `context-engine` plugins map to `plugins.slots.contextEngine`.
- The default `contextEngine` slot id is `legacy`.
- `applyExclusiveSlotSelection(...)` is generic across `memory` and `contextEngine`.
- `resolveContextEngine(config)` resolves in this order:
  1. explicit `config.plugins.slots.contextEngine`
  2. default slot id `legacy`
- If the resolved engine id has no registered factory, OpenClaw throws instead of auto-falling back.

### 2. Selection and activation matrix

| Trigger | Config write | Slot effect | Competing plugin effect | Restart-time meaning |
| --- | --- | --- | --- | --- |
| `plugins install` | enables plugin, records install, persists config | runs `applySlotSelectionForPlugin(...)` | may disable other `context-engine` plugins unless they still own another slot | selected plugin becomes the target engine after restart |
| `plugins enable <id>` | sets `plugins.entries[id].enabled = true` | runs `applySlotSelectionForPlugin(...)` | same as install | selected plugin becomes the target engine after restart |
| `plugins disable <id>` | sets `plugins.entries[id].enabled = false` | no slot cleanup or reselection | none | explicit slot can remain pointed at a now-disabled plugin |
| competing install / enable | rewrites `plugins.slots.contextEngine` to new id | switches ownership away from prior engine | prior single-kind competitor can be disabled | last selected engine wins |

Important asymmetry: selection is generic and shared, but cleanup is not.

### 3. Disable path

Verified disable order:

1. load config snapshot
2. `setPluginEnabledInConfig(cfg, id, false)`
3. `replaceConfigFile(...)`
4. print restart-required message

Verified consequences:

- disable mutates enabled state only
- disable does not clear `plugins.slots.contextEngine`
- `config-state.ts` has memory-slot normalization and memory-slot forced-enable logic, but no equivalent `contextEngine` slot normalization path
- plugin loading skips disabled plugins, so a disabled `context-engine` plugin is not registered
- `resolveContextEngine(...)` still honors the explicit slot id first

Result: if SNC is selected in `plugins.slots.contextEngine` and then disabled, restart can fail at context-engine resolution because the slot still points at `snc` while the registry no longer contains `snc`.

### 4. Uninstall path

Verified uninstall config cleanup:

- removes `plugins.entries[pluginId]`
- removes `plugins.installs[pluginId]`
- removes allowlist entry
- removes linked `plugins.load.paths` entry for `source === "path"`
- removes owned channel config keys for installed channel plugins
- resets `plugins.slots.memory` to its default when the uninstalled plugin owned memory

Notably absent:

- no matching reset of `plugins.slots.contextEngine`

Result: uninstalling a selected context-engine plugin can leave a stale explicit slot behind. After restart, `resolveContextEngine(...)` still tries that explicit id and throws.

### 5. Update-id-change path

`migratePluginConfigId(...)` in `plugins/update.ts` rewrites:

- `plugins.installs`
- `plugins.entries`
- `plugins.allow`
- `plugins.deny`
- `plugins.slots.memory`

It does not rewrite:

- `plugins.slots.contextEngine`

So if a plugin update changes the effective plugin id, memory selection migrates with it but `contextEngine` selection does not.

### 6. Competing-plugin and reselection behavior

`applyExclusiveSlotSelection(...)` disables competitors by slot kind, with one important exception:

- a multi-kind plugin that still owns another slot is not disabled just because it lost one slot

For `contextEngine`, this means:

- selecting SNC can disable another single-kind context-engine plugin
- selecting a later context-engine plugin can disable SNC
- the slot write itself is the real owner signal
- there is no verified automatic re-selection back to `legacy` when the selected plugin later becomes invalid

### 7. Cleanup symmetry matrix

| Lifecycle step | `memory` slot | `contextEngine` slot |
| --- | --- | --- |
| install / enable selection | explicit helper exists | explicit helper exists |
| competing install reselection | yes | yes |
| disable cleanup | no full slot cleanup, but memory has loader-side slot semantics | no cleanup |
| uninstall cleanup | resets to default `memory-core` | no reset |
| update id migration | rewritten | not rewritten |
| config normalization in `config-state.ts` | explicit support | no equivalent support |

This is the core phase-7 host risk: `contextEngine` selection is easy to set and easy to leave stale.

### 8. Safe operator swap matrix for SNC

| Operator goal | Safe sequence |
| --- | --- |
| first activate SNC | install SNC, ensure `plugins.entries.snc.enabled = true`, set `plugins.slots.contextEngine = "snc"`, restart |
| switch from legacy to SNC | explicitly set `plugins.slots.contextEngine = "snc"`, keep SNC enabled, restart |
| switch from SNC to another engine | set `plugins.slots.contextEngine` to the replacement engine first, ensure replacement is enabled, restart, then disable or uninstall SNC |
| temporarily turn SNC off | do not disable SNC while slot still points to `snc`; first reselect another engine or `legacy`, then disable, then restart |
| uninstall SNC | first reselect another engine or `legacy`, then uninstall SNC, then restart |

## Key Findings

1. OpenClaw currently has symmetric `contextEngine` selection but asymmetric `contextEngine` cleanup.
2. An explicit `plugins.slots.contextEngine` value is sticky and outranks the legacy fallback.
3. `disable`, `uninstall`, and update-id migration can all leave a stale `contextEngine` slot behind.
4. `contextEngine` does not currently benefit from the memory-slot normalization and forced-enable logic in `config-state.ts`.
5. Safe SNC removal is a two-step operator action: reselect first, remove second.

## SNC Relevance

This packet directly affects Milestone 2 delivery, docs, and clean-host rehearsal.

SNC is a `context-engine` plugin, so its operator story is only safe if docs explicitly teach:

- slot selection is separate from plugin enabled state
- restart is required after changes
- swapping SNC out requires explicit reselection

Without that guidance, a clean-host operator can disable or uninstall SNC and accidentally leave the host pointing at a non-existent context engine.

## Modification Guidance

- `wrap`:
  - SNC install docs should teach explicit slot selection and explicit re-selection on removal.
  - SNC validation / doctor checks should verify both `plugins.entries.snc.enabled` and `plugins.slots.contextEngine`.
- `extend`:
  - If OpenClaw host code is intentionally improved later, `contextEngine` cleanup should mirror the `memory` cleanup and id-migration paths.
  - A host-side diagnostic for "selected context engine is not registered" would be high-value.
- `defer`:
  - Do not build SNC around loader-internal assumptions about hot reload or automatic fallback.
- `avoid`:
  - Do not tell operators that disabling or uninstalling SNC automatically returns them to `legacy`.
  - Do not treat `plugins list` visibility as proof that the running gateway has already switched engines.

## Still-unverified questions

1. Whether future host code outside the currently verified files adds a recovery path for stale `contextEngine` slot values before first query execution.
2. Whether any non-CLI config editor in OpenClaw already warns on stale `plugins.slots.contextEngine` values.
3. Whether later OpenClaw versions plan to add `contextEngine`-side normalization comparable to the current memory-slot path.
