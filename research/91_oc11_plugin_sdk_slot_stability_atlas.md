# OC-11 OpenClaw Plugin SDK / Slot Stability Atlas

## Purpose

This packet identifies which OpenClaw plugin seams are public enough to build on and which ones are still host-internal plumbing.

The goal is not to restate "OpenClaw has plugins". The goal is to answer:

- which extension seams are explicitly exported and guarded as SDK surface
- which slot and manifest contracts are real host contracts
- which loader/registry/runtime details are implementation plumbing rather than stable donor substrate
- what SNC and a future custom Claw should wrap, extend, defer, or avoid

This packet supports two program goals:

1. keep SNC Milestone 1 hot-pluggable against the current host
2. build durable architecture assets for future custom-Claw work without binding to loader internals

## Scope

This packet stays on OpenClaw's plugin/sdk surface and slot stability.

It covers:

- package-exported `openclaw/plugin-sdk/*` surfaces
- `openclaw.plugin.json` and package-manifest entry metadata
- plugin entry helpers and injected registration API
- slot behavior for `memory` and `context-engine`
- loader / registry / alias / runtime-state boundaries

It does not reopen MCP, memory-recall internals, runner timing, or product-shell behavior except where they touch extension-surface stability.

## Main Entry Files

- `data/external/openclaw-v2026.4.1/package.json`
- `data/external/openclaw-v2026.4.1/docs/plugins/architecture.md`
- `data/external/openclaw-v2026.4.1/src/plugin-sdk/entrypoints.ts`
- `data/external/openclaw-v2026.4.1/src/plugin-sdk/index.ts`
- `data/external/openclaw-v2026.4.1/src/plugin-sdk/core.ts`
- `data/external/openclaw-v2026.4.1/src/plugin-sdk/plugin-entry.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/types.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/manifest.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/manifest-registry.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/discovery.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/loader.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/registry.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/runtime.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/sdk-alias.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/slots.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/api-builder.ts`
- `data/external/openclaw-v2026.4.1/src/config/types.plugins.ts`
- `data/external/openclaw-v2026.4.1/src/config-state.ts`
- `data/external/openclaw-v2026.4.1/src/context-engine/registry.ts`
- `data/external/openclaw-v2026.4.1/src/extensionAPI.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/contracts/plugin-sdk-index.test.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/contracts/plugin-sdk-subpaths.test.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/contracts/plugin-sdk-package-contract-guardrails.test.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/contracts/plugin-sdk-runtime-api-guardrails.test.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/contracts/plugin-registration.contract.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/openclaw.plugin.json`

## Verified Structure / Lifecycle / Contract

### 1. OpenClaw has a real public SDK surface, not just accidental internal exports

The strongest evidence is in `package.json` and `src/plugin-sdk/entrypoints.ts`.

`package.json` exports a curated set of `./plugin-sdk` and `./plugin-sdk/<subpath>` entrypoints from `dist/plugin-sdk/*`.

`src/plugin-sdk/entrypoints.ts` generates that public specifier list and the package export map from a shared entrypoint manifest.

This is reinforced by contract tests:

- `plugin-sdk-index.test.ts` checks that the root runtime surface stays intentionally tiny
- `plugin-sdk-subpaths.test.ts` checks that the public subpath list stays curated and excludes internal helper paths
- `plugin-sdk-package-contract-guardrails.test.ts` checks that package exports stay synchronized with the declared public list and docs/tests

So `openclaw/plugin-sdk/*` is a deliberate public surface, not an incidental source-tree leak.

### 2. The root SDK surface is intentionally tiny; most public API is subpath-based

`src/plugin-sdk/index.ts` is intentionally narrow.

The root runtime exports are guarded by test to remain only:

- `emptyPluginConfigSchema`
- `registerContextEngine`
- `delegateCompactionToRuntime`
- `onDiagnosticEvent`

This matters because OpenClaw is deliberately pushing most reusable helper surface onto focused subpaths such as:

- `openclaw/plugin-sdk/core`
- `openclaw/plugin-sdk/runtime`
- channel/provider-specific helpers

So for long-range stability, `openclaw/plugin-sdk` root is more stable but much narrower; broader use should happen through explicit subpaths, not through host-internal module reach-ins.

### 3. The manifest layer is a first-class static contract

`src/plugins/manifest.ts` and `src/plugins/manifest-registry.ts` show that OpenClaw expects native plugin discovery and validation to work from metadata before runtime code is imported.

Verified stable manifest pieces:

- file name `openclaw.plugin.json`
- required `id`
- required `configSchema`
- optional `kind`
- optional `channels`, `providers`, `cliBackends`
- optional `providerAuthEnvVars`, `providerAuthChoices`
- optional `contracts`
- optional `channelConfigs`
- package-manifest metadata under the OpenClaw key:
  - `extensions`
  - `setupEntry`
  - `startup.deferConfiguredChannelFullLoadUntilAfterListen`

The docs in `docs/plugins/architecture.md` match the code path: discovery and config validation are meant to work from manifest/schema metadata without executing plugin runtime.

That makes manifest/schema one of the strongest stable seams in the whole plugin system.

### 4. Plugin entry helpers are canonical public seams

OpenClaw ships explicit entry helpers:

- `definePluginEntry(...)` in `src/plugin-sdk/plugin-entry.ts`
- `defineChannelPluginEntry(...)` in `src/plugin-sdk/core.ts`
- `defineSetupPluginEntry(...)` in `src/plugin-sdk/core.ts`

These helpers are not wrappers around unstable private names. They are the intended authoring surface for native plugins.

Important verified behavior:

- `definePluginEntry(...)` is the canonical non-channel entry helper
- `defineChannelPluginEntry(...)` handles channel registration and respects `api.registrationMode`
- `defineSetupPluginEntry(...)` exists specifically for separate channel `setupEntry` modules

`defineChannelPluginEntry(...)` is especially important because it already hides host load-mode branching:

- `cli-metadata` mode only emits CLI metadata
- non-full setup modes still register the channel
- only `full` mode runs full extra registration

That means plugin authors should depend on the helper, not re-implement host registration-mode branching themselves.

### 5. The injected `OpenClawPluginApi` is public, but not every field is equally stable

`src/plugins/types.ts` defines `OpenClawPluginApi` and `OpenClawPluginDefinition`.

The public API includes registration methods for:

- tools
- hooks
- HTTP routes
- channels
- gateway methods
- CLI and CLI backends
- providers
- speech/media/image/web-search providers
- interactive handlers
- custom commands
- context engines
- memory prompt / flush / runtime / embedding providers
- typed lifecycle hooks via `on(...)`

This is clearly intended as the main native registration contract.

But the same file also makes an important distinction:

- `api.runtime` is an in-process trusted runtime helper surface
- comments explicitly say to prefer hooks for third-party automation/integration unless native registry integration is needed

So `OpenClawPluginApi` is public, but `api.runtime` is the broadest and least conservative part of that public surface.

### 6. `buildPluginApi(...)` is host assembly, not plugin contract

`src/plugins/api-builder.ts` builds the injected `OpenClawPluginApi` object with default no-op handlers.

`src/plugins/registry.ts` then populates handlers conditionally based on `registrationMode`.

This is a strong signal that:

- `OpenClawPluginApi` type is public contract
- `buildPluginApi(...)` itself is host implementation plumbing
- the exact no-op/default assembly pattern should not be treated as external contract

This packet therefore classifies `api-builder.ts` as internal.

### 7. Registration modes are real runtime states, but they are host orchestration details

`src/plugins/types.ts` defines:

- `full`
- `setup-only`
- `setup-runtime`
- `cli-metadata`

`src/plugins/loader.ts` decides which mode to use based on:

- enablement state
- whether the plugin is a configured channel
- whether `setupEntry` exists
- whether startup defers full load until after listen
- validate-only vs full load

`src/plugins/registry.ts` then gates which handlers are actually live in that mode.

This means `registrationMode` is not fake; plugins can observe it.

But it should still be treated as host load-pipeline detail rather than a stable cross-host protocol:

- it is chosen by loader heuristics
- it is tightly coupled to setup/runtime split
- it exists to optimize startup and wiring, not to define a minimal long-term external standard

The safe pattern is: use helper functions that already respect `registrationMode`, not handwritten branching that assumes current loader strategy.

### 8. The slot system is real, but `memory` is more mature than `context-engine`

`src/plugins/slots.ts` maps plugin `kind` to exclusive slot keys:

- `memory -> memory`
- `context-engine -> contextEngine`

Default slot ids are:

- `memory-core`
- `legacy`

`src/config/types.plugins.ts` exposes both in `PluginSlotsConfig`.

But the live code paths are not equally mature.

#### 8.1 Memory slot

The `memory` slot is deeply integrated:

- `config-state.ts` normalizes it
- `resolveMemorySlotDecision(...)` gates plugin enablement
- `registry.ts` only allows memory prompt/flush/runtime registration for memory plugins
- dual-kind plugins are gated by actual slot selection before memory registration proceeds

This is a strong, host-owned, stable exclusive-slot mechanism.

#### 8.2 Context-engine slot

The `context-engine` slot is real, but narrower and less integrated.

Verified code facts:

- `slots.ts` defines it
- `PluginSlotsConfig` exposes it
- `context-engine/registry.ts` resolves the engine from `config.plugins.slots.contextEngine` or default `"legacy"`
- public `registerContextEngine(...)` exists
- public registration cannot claim the core-owned default engine id `"legacy"`

But unlike `memory`, the main plugin-config normalization path in `config-state.ts` currently only normalizes the `memory` slot.

So the current host reality is:

- `contextEngine` slot is public and active
- but its loader/config integration is lighter than `memory`

This makes `context-engine` slot usable, but less mature as a "stable slot subsystem" than memory.

### 9. Context-engine registration is public but intentionally unprivileged

`src/context-engine/registry.ts` exposes two different trust paths:

- privileged `registerContextEngineForOwner(...)`
- public `registerContextEngine(...)`

The public path is intentionally constrained:

- it registers under owner `public-sdk`
- it cannot claim the core-owned default id `legacy`
- it cannot safely replace somebody else's registration

This is a strong public-stability signal: the host intentionally exposes context-engine extension, but keeps core ownership boundaries enforced.

For SNC, this is exactly the kind of seam we want.

### 10. Loader / discovery / alias / global registry state are host-internal churn zones

The following files are clearly host plumbing rather than stable plugin contract:

- `src/plugins/discovery.ts`
- `src/plugins/manifest-registry.ts`
- `src/plugins/loader.ts`
- `src/plugins/runtime.ts`
- `src/plugins/sdk-alias.ts`

Reasons:

- they manage cache windows and compatibility heuristics
- they perform safety checks and ownership checks
- they pin active registries for HTTP route and channel surfaces
- they choose between source and dist plugin-sdk aliases
- they maintain global singleton runtime registry state
- they decide when `setupEntry` vs full runtime module is loaded

These layers are essential to host behavior, but they are not seams a plugin or custom Claw should casually depend on.

### 11. `openclaw/extension-api` is explicitly deprecated and temporary

`src/extensionAPI.ts` is a narrow compatibility bridge for older plugins importing `openclaw/extension-api`.

The file itself emits a deprecation warning that directs users toward:

- injected `api.runtime.agent.*`
- focused `openclaw/plugin-sdk/<subpath>` imports

It also explicitly states the compatibility bridge is temporary.

So `openclaw/extension-api` is compatibility ballast, not a future-facing seam.

### 12. The docs themselves explicitly warn that exported helper subpaths are not all equally frozen

`docs/plugins/architecture.md` makes the most important policy statement for this packet:

- capability registration is the intended direction
- legacy hooks remain the safest compatibility baseline for external plugins
- exported helper subpaths are not all equal
- external plugins should prefer the narrow documented contract rather than incidental helper exports

So the host does not promise that every exported helper is equally stable just because it is exported.

That pushes the public/stability ranking into three buckets rather than two.

## Stable-Public vs Likely-Churn Atlas

### Public / stable enough to build on now

| Surface | Why it looks stable |
| --- | --- |
| `openclaw.plugin.json` core fields | Required for discovery and validation before runtime import |
| package `openclaw.extensions` / `setupEntry` metadata | Used directly by manifest/discovery/loader pipeline |
| `openclaw/plugin-sdk` exports map | Package-level curated export contract with guardrail tests |
| `openclaw/plugin-sdk/core` | Canonical entry helpers and channel plugin helpers |
| `definePluginEntry(...)` / `defineChannelPluginEntry(...)` / `defineSetupPluginEntry(...)` | Explicit plugin-authoring helpers rather than internal host names |
| `OpenClawPluginApi` registration methods | Main native plugin contract delivered into `register(api)` |
| `registerContextEngine(...)` | Public unprivileged extension seam with enforced owner guardrails |
| `memory` slot semantics | Deeply integrated exclusive slot with clear host policy |

### Public but use narrowly / cautiously

| Surface | Why caution is needed |
| --- | --- |
| `api.runtime` | Public, but broad trusted-native helper surface rather than conservative external baseline |
| `registrationMode` | Real and observable, but driven by loader strategy and setup/runtime heuristics |
| `contextEngine` slot | Public and active, but less integrated than memory slot in current config-state path |
| broad `plugin-sdk/*` helper subpaths | Exported, but docs explicitly say not all exported helpers are equally frozen |

### Likely-churn host internals

| Surface | Why to avoid depending on it |
| --- | --- |
| `buildPluginApi(...)` | Host-side API assembly with handler injection and no-op fallback |
| `createApi(...)` in `registry.ts` | Internal gating of handlers by registration mode |
| `loader.ts` registration-mode heuristics | Startup optimization and load orchestration, not plugin contract |
| `discovery.ts` and `manifest-registry.ts` caches/safety checks | Host scanning and validation plumbing |
| `runtime.ts` active registry pinning | Process-global runtime state management |
| `sdk-alias.ts` dist/src alias resolution | Build/runtime compatibility machinery |
| `openclaw/extension-api` bridge | Explicitly deprecated temporary compatibility path |

## Key Findings

### 1. OpenClaw's real public plugin substrate is `manifest + plugin-sdk exports + injected registration API`

Those three layers are reinforced by package exports, source helpers, docs, and contract tests.

### 2. The slot story is asymmetric: memory is mature, context-engine is exposed but lighter-weight

This is the single most important slot-stability finding for SNC and future custom Claw work.

### 3. `registrationMode` and loader strategy are observable but should not become architectural dependencies

They are real host states, but they are still orchestration plumbing.

### 4. `api.runtime` is public, but it is not the safest baseline seam

The host comments and docs both point plugin authors toward narrower documented seams first.

### 5. OpenClaw is actively defending its public SDK boundary with tests

The contract tests around root exports, subpath lists, package exports, and runtime-api allowlists mean the maintainers are explicitly curating what counts as public surface.

## SNC relevance

This packet directly matters to SNC in six ways.

1. SNC should continue to live as a `context-engine` plugin with a manifest-led boundary and avoid any need to claim host loader ownership.

2. SNC should treat `openclaw.plugin.json`, `definePluginEntry(...)`, `OpenClawPluginApi.registerContextEngine(...)`, and the context-engine lifecycle contract as the primary stable host seam.

3. SNC should not bind to loader internals such as source/dist alias resolution, global registry pinning, or setup-runtime heuristics just because those internals are reachable in the source tree.

4. If SNC grows more plugin-owned helpers, they should prefer focused `openclaw/plugin-sdk/<subpath>` imports over `openclaw/extension-api`.

5. If SNC ever needs slot-aware coordination, the safest current host-grade exclusive slot is still `memory`; `context-engine` slot usage is valid, but the surrounding config plumbing is lighter and should be treated more conservatively.

6. For a future custom Claw, the durable donor asset is not "copy OpenClaw's loader". The durable donor asset is "copy the public-contract discipline: manifest-first discovery, narrow exported SDK entrypoints, and enforced owner boundaries".

## Modification guidance

### Wrap / extend

- Build on `openclaw.plugin.json` and package metadata as the canonical plugin identity/config seam.
- Use `definePluginEntry(...)`, `defineChannelPluginEntry(...)`, and `defineSetupPluginEntry(...)` instead of recreating host registration patterns.
- Use injected `OpenClawPluginApi` registration methods rather than reaching into loader or registry internals.
- For context-engine work, prefer `registerContextEngine(...)` and the existing context-engine lifecycle contract.

### Extend carefully

- Use `api.runtime` only when SNC genuinely needs trusted native integration and there is no narrower hook or registration seam.
- Treat `registrationMode` as helper input, not as a stable host-to-plugin protocol to be reimplemented externally.
- Treat `contextEngine` slot support as real but still less battle-hardened than memory slot behavior.

### Defer

- Defer any attempt to build SNC around loader caching, registry pinning, or alias-resolution details.
- Defer adoption of broad helper subpaths that are exported but not clearly documented as stable for external use.

### Avoid

- Do not depend on `buildPluginApi(...)`, `createApi(...)`, registry cache behavior, or plugin discovery internals.
- Do not build new work on `openclaw/extension-api`.
- Do not assume every exported `plugin-sdk/*` helper has the same compatibility promise as manifest, entry helpers, and core registration methods.

## Still-unverified questions

1. This packet confirms that `contextEngine` slot is real but lighter-weight than `memory`; it does not prove how aggressively the host team intends to stabilize that path across future releases.

2. The public/exported helper subpath list is curated, but the exact stability tier of each individual subpath is not uniformly documented yet.

3. This packet does not fully map every bundled plugin's private `runtime-api.ts` surface; it only confirms those surfaces are individually guarded and should not be confused with the core host SDK.

4. It remains unproven which current loader/registry internals will be extracted into a more explicit external contract later versus kept host-private permanently.
