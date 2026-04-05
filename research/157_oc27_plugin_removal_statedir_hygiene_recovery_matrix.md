# OC-27 Plugin Removal / StateDir Hygiene Recovery Matrix

## Purpose

Pin down what OpenClaw actually cleans during plugin disable, uninstall, update, and manual recovery, and separate host-owned cleanup from plugin-owned `stateDir` residue.

## Scope

Focused on plugin config/install surfaces, slot cleanup symmetry, and packaged-versus-linked removal behavior. This packet is not a generic storage-management design and does not redefine SNC persistence ownership.

## Verified Structure / Lifecycle / Contract

### Primary entry files

- `data/external/openclaw-v2026.4.1/src/cli/plugins-cli.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/uninstall.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/update.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/enable.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/config-state.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/slots.ts`
- `data/external/openclaw-v2026.4.1/src/context-engine/registry.ts`

### Host action matrix

| Action | Verified host-owned effect | Verified non-effect |
| --- | --- | --- |
| Disable | flips plugin enabled flag in config | does not clear slots, install record, load path, files, or plugin-owned state |
| Enable | flips enabled flag and may apply exclusive slot selection | does not migrate or clean prior plugin-owned state |
| Uninstall (packaged install) | removes config/install records, allowlist/channel config, may delete installed package dir, resets `plugins.slots.memory` to default | does not symmetrically clean `plugins.slots.contextEngine`; does not clean plugin-owned `stateDir` |
| Uninstall (path/link install) | detaches config/load-path entry | does not recursively delete source dir; does not clean plugin-owned `stateDir` |
| Update | updates host-managed package source for `npm`/`marketplace`/`clawhub` installs | skips `path` installs; does not own plugin `stateDir`; no symmetric `contextEngine` slot migration |
| Manual cleanup | operator can edit config/remove files by hand | host gives no automatic SNC-specific `stateDir` cleanup |

### Slot cleanup asymmetry

`plugins enable` can select both `memory` and `contextEngine` exclusive slots. But uninstall/update/migration logic only shows symmetric cleanup for `plugins.slots.memory`. Verified code paths migrate/reset `slots.memory`, while `plugins.slots.contextEngine` can remain stale.

`resolveContextEngine(...)` later reads `config.plugins.slots.contextEngine` or defaults to `legacy`, so a stale selected context-engine id can survive disable/uninstall/update and turn into resolution failure or stale selection after restart.

### Config normalization truth

`normalizePluginsConfig(...)` is currently memory-focused. It normalizes `slots.memory`, but no equivalent `contextEngine` cleanup/normalization path was verified in the same layer.

### Clean-host vs linked-dev cleanup

| Delivery lane | Host uninstall ownership | Safe operator conclusion |
| --- | --- | --- |
| Packaged/plugin-managed install | host may remove installed package dir and config/install records | host cleans its own install surface, not plugin-owned `stateDir` |
| Linked/path dev install | host detaches config/load-path references only | source tree remains; plugin-owned state remains |

### `stateDir` ownership boundary

No verified uninstall/update flow claims ownership of plugin-defined `stateDir`. Host cleanup is about host-managed plugin installation/config surfaces. SNC files under its own resolved `stateDir` remain operator-owned residue until explicitly cleaned.

## Key Findings

1. Disable is only an enablement flip, not removal or hygiene.
2. OpenClaw currently has cleanup symmetry for the `memory` slot, but not for `contextEngine`.
3. Plugin-owned `stateDir` residue is outside host uninstall ownership in both packaged and linked-dev lanes.

## SNC Relevance

SNC is a `context-engine` plugin, so stale `plugins.slots.contextEngine` is a real operator hazard. Milestone 2 remove/update guidance must explicitly tell operators to reselect a safe context engine before or during SNC removal, and to treat SNC `stateDir` cleanup as a separate deliberate action.

## Modification Guidance

- Wrap: operator docs/checklists for disable, uninstall, update, and manual cleanup.
- Extend: lightweight doctor/validator warnings for stale selected `contextEngine` ids.
- Defer: automated deletion of plugin-owned `stateDir` until there is explicit operator intent and safety policy.
- Avoid: promising that OpenClaw uninstall fully removes SNC state.
- Do-not-touch: recursive deletion behavior for path installs; current host safety posture is intentionally conservative.

## Still-unverified questions

- Whether future OpenClaw versions will add `contextEngine` cleanup symmetry in uninstall/update/normalize paths.
- Whether future host doctor surfaces will warn directly on stale selected `contextEngine` ids.
- Whether SNC should eventually ship an explicit operator cleanup helper for its own `stateDir`, separate from host uninstall.
