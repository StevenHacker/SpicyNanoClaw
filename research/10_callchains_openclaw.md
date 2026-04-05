# OpenClaw Call Chains

## Status

- Round 1 confirmed entry surfaces.
- Round 2 closed the context assembly + system prompt assembly main chain.
- Round 3 closed default context-engine resolution plus compaction stage separation.
- Round 4 closed the default memory recall chain.
- Round 5 closed the package-level external plugin delivery contract.

## Confirmed entry surfaces

- `src/context-engine/index.ts`
- `src/context-engine/types.ts`
- `src/agents/pi-embedded-runner/run/attempt.ts`
- `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`
- `src/agents/pi-embedded-runner/run/attempt.prompt-helpers.ts`
- `src/agents/system-prompt.ts`
- `src/agents/pi-embedded-runner/system-prompt.ts`
- `src/agents/pi-embedded-runner/context-engine-maintenance.ts`
- `src/agents/pi-embedded-runner/compact.ts`
- `src/agents/pi-embedded-runner/compaction-hooks.ts`

## Chain A: System Prompt Assembly

### Verified path

1. `run/attempt.ts` builds runtime metadata via `buildSystemPromptParams(...)`.
2. `run/attempt.ts` computes prompt mode with `resolvePromptModeForSession(...)`.
3. `run/attempt.ts` builds the base runtime prompt with `buildEmbeddedSystemPrompt(...)`.
4. `pi-embedded-runner/system-prompt.ts` forwards to `buildAgentSystemPrompt(...)`.
5. `agents/system-prompt.ts` assembles the actual text sections.
6. `run/attempt.ts` stores that full prompt in `systemPromptText`.
7. `ContextEngine.assemble()` may prepend `systemPromptAddition`.
8. plugin hooks may then override the whole prompt or prepend/append system context.

### Evidence

- `run/attempt.ts:602-668` builds runtime metadata and calls `buildEmbeddedSystemPrompt(...)`.
- `run/attempt.ts:697-699` creates `systemPromptText` from the generated prompt.
- `pi-embedded-runner/system-prompt.ts:11-85` is a thin adapter into `buildAgentSystemPrompt(...)`.
- `agents/system-prompt.ts:39-50` builds the memory section through `buildMemoryPromptSection(...)`.
- `agents/system-prompt.ts` also includes skills, docs, messaging, time, identity, and voice sections.

### Engineering meaning

OpenClaw system prompt assembly is layered, not monolithic:

- base runtime prompt
- context-engine prompt addition
- hook-based prompt override / prepend / append

That means SNC prompt work cannot assume a single safe insertion point yet.

## Chain B: Context Engine Assembly

### Verified contract

From `context-engine/types.ts`, `ContextEngine` owns:

- `assemble(...)`
- `compact(...)`
- `ingest(...)` / `ingestBatch(...)`
- `afterTurn(...)`
- `maintain(...)`
- optional `bootstrap(...)`

`AssembleResult` returns:

- `messages`
- `estimatedTokens`
- optional `systemPromptAddition`

### Verified runtime path

1. `attempt.ts` opens / prepares the active session.
2. session history is already sanitized / limited before engine assembly.
3. `assembleAttemptContextEngine(...)` calls `contextEngine.assemble(...)`.
4. returned `messages` can replace the session's active message list.
5. returned `systemPromptAddition` is prepended to the current system prompt.
6. the session system prompt is then overridden with the modified result.

### Evidence

- `attempt.context-engine-helpers.ts:53-73` directly forwards to `contextEngine.assemble(...)`.
- `attempt.ts:1128-1154`:
  - calls `assembleAttemptContextEngine(...)`
  - replaces `activeSession` messages if assembly returns a new array
  - prepends `assembled.systemPromptAddition`
  - calls `applySystemPromptOverrideToSession(...)`

### Engineering meaning

`ContextEngine` is not just retrieval storage.
It can directly control both:

- the ordered message context
- extra system instructions

This makes it a high-value SNC seam for state anchoring and context shaping.

## Chain C: Bootstrap / Maintenance / After-Turn Lifecycle

### Verified bootstrap path

1. `attempt.ts` creates or opens `SessionManager`.
2. `runAttemptContextEngineBootstrap(...)` runs before full run preparation.
3. if the session file already existed and the engine supports it:
   - `contextEngine.bootstrap(...)` runs
   - then maintenance runs with reason `bootstrap`

### Verified turn-finalization path

1. after the run finishes, `finalizeAttemptContextEngineTurn(...)` is called
2. if `afterTurn(...)` exists, it runs
3. otherwise new messages are sent to `ingestBatch(...)` or `ingest(...)`
4. only when no prompt error / abort / yield-abort occurred and finalization succeeded:
   - maintenance runs again with reason `turn`

### Evidence

- `attempt.ts:739-762` runs bootstrap and bootstrap-time maintenance.
- `attempt.context-engine-helpers.ts:6-51` defines bootstrap behavior.
- `attempt.ts:1715-1746` invokes `finalizeAttemptContextEngineTurn(...)`.
- `attempt.context-engine-helpers.ts:75-168` defines after-turn / ingest / maintenance behavior.

### Engineering meaning

OpenClaw has an explicit post-turn state lifecycle.
So SNC does not necessarily need to invent a brand-new persistence checkpoint layer from scratch.

## Chain D: Hook Interaction With Prompt Build

### Verified ordering

Current observed ordering inside `attempt.ts` is:

1. build base system prompt
2. let `ContextEngine.assemble()` modify messages and optionally prepend `systemPromptAddition`
3. run prompt-build hooks
4. hooks may:
   - override the system prompt entirely
   - prepend system context
   - append system context

### Evidence

- `attempt.ts:1130-1154` applies context-engine assembly results.
- `attempt.ts:1430-1449` applies hook-based system prompt overrides and prepend/append system context.
- `attempt.thread-helpers.ts` `composeSystemPromptWithHookContext(...)` joins prepend/base/append segments.

### Engineering meaning

If SNC injects prompt state through `systemPromptAddition`, plugin hooks can still supersede or surround it.
So later seam decisions must account for hook precedence.

## Chain E: Maintenance Runtime Context

### Verified behavior

Maintenance receives runtime-owned helpers, including transcript rewrite support.

### Evidence

- `context-engine-maintenance.ts:16-39` injects `rewriteTranscriptEntries(...)` into runtime context.
- `context-engine-maintenance.ts:45-82` runs `contextEngine.maintain(...)` and normalizes logging/result handling.

### Engineering meaning

OpenClaw already exposes a safe transcript-rewrite seam to context engines.
That is a strong candidate area for future SNC compaction / state-canonicalization work, but only after compaction ordering is verified.

## Chain F: Default Context Engine Resolution

### Verified default

The default resolved context engine in `v2026.4.1` is `legacy`.

### Evidence

- `context-engine/registry.ts:402-426` resolves:
  - `config.plugins.slots.contextEngine` if explicitly set
  - otherwise `defaultSlotIdForKey("contextEngine")`
- `context-engine/init.ts:4-22` says the legacy engine is always registered as the safe fallback for the default slot
- `context-engine/legacy.ts:21-90` registers the `legacy` engine under id `"legacy"`

### Verified legacy behavior

`LegacyContextEngine` is intentionally thin:

- `assemble(...)` is pass-through
- `ingest(...)` is no-op
- `afterTurn(...)` is no-op
- `compact(...)` delegates to runtime compaction

### Evidence

- `legacy.ts:14-20` documents the intent
- `legacy.ts:38-52` pass-through `assemble(...)`
- `legacy.ts:28-36` no-op `ingest(...)`
- `legacy.ts:54-66` no-op `afterTurn(...)`
- `legacy.ts:68-80` delegates `compact(...)` to runtime

### Engineering meaning

The existence of the `ContextEngine` seam does **not** mean OpenClaw default behavior already uses a rich state engine.
By default, the system still behaves mostly like the pre-context-engine pipeline.

## Chain G: Compaction Ordering

### Verified engine-owned compaction path

In `compact.ts`, when the resolved engine owns compaction:

1. fire `before_compaction` hooks
2. call `contextEngine.compact(...)`
3. if compaction succeeded, run `runContextEngineMaintenance(... reason: "compaction")`
4. if engine owns compaction and compaction succeeded, run post-compaction side effects
5. then fire `after_compaction` hooks

### Evidence

- `compact.ts` resolves engine with `ensureContextEnginesInitialized()` + `resolveContextEngine(...)`
- `compact.ts` checks `engineOwnsCompaction = contextEngine.info.ownsCompaction === true`
- `compact.ts` calls hook runner before compaction
- `compact.ts` calls `contextEngine.compact(...)`
- `compact.ts` then calls `runContextEngineMaintenance(...)`
- `compact.ts` then calls `runPostCompactionSideEffects(...)`
- `compact.ts` then calls `after_compaction`

### Timeout / overflow recovery observations

Inside `run.ts` overflow-recovery path:

1. run owned-compaction before hook
2. call `contextEngine.compact(...)`
3. if compacted, run maintenance with reason `"compaction"`
4. run owned-compaction after hook
5. if compacted and engine owns compaction, run post-compaction side effects

Inside `run.ts` timeout-recovery path:

1. run owned-compaction before hook
2. call `contextEngine.compact(...)`
3. run owned-compaction after hook
4. if compacted and engine owns compaction, run post-compaction side effects

### Important caution

The overflow-recovery path visibly runs maintenance after compaction.
The timeout-recovery branch still does **not** show an immediate `reason: "compaction"` maintenance call in `run.ts`.
What it can get later is only the normal post-turn `reason: "turn"` maintenance path, and only if the retried turn finishes without prompt error / abort / yield-abort and post-turn finalization succeeds.

### Engineering meaning

SNC compaction-aware state work must be careful about three distinct layers:

- compaction itself
- maintenance after compaction
- post-compaction memory sync / transcript update side effects

These are separate concerns, not one lumped step.

### Recovery-branch asymmetry

The timeout and overflow recovery branches are not lifecycle-identical.

Inside `run.ts` timeout-recovery path:

1. run owned-compaction before hook
2. call `contextEngine.compact(...)`
3. run owned-compaction after hook
4. if compacted and engine owns compaction, run post-compaction side effects

Inside `run.ts` overflow-recovery path:

1. run owned-compaction before hook
2. call `contextEngine.compact(...)`
3. if compacted, run maintenance with reason `"compaction"`
4. run owned-compaction after hook
5. if compacted, retry prompt immediately from the overflow branch

### Later indirect maintenance path

If timeout-triggered compaction succeeds and the retried turn later finishes cleanly, OpenClaw can still reach maintenance through the ordinary post-turn lifecycle:

1. `attempt.ts` always calls `finalizeAttemptContextEngineTurn(...)` at the end of the attempt
2. `attempt.context-engine-helpers.ts` only runs maintenance there when:
   - `promptError` is false
   - `aborted` is false
   - `yieldAborted` is false
   - post-turn finalization succeeded
3. that later maintenance runs with `reason: "turn"`, not `reason: "compaction"`

### Engineering caution

SNC should not assume all OpenClaw compaction triggers honor the same post-compact lifecycle.
Timeout-triggered compaction currently does not run the same explicit immediate maintenance step that overflow-triggered compaction does.
At best it may later receive ordinary turn-finalization maintenance, which is both weaker and conditional.

## Chain H: Default Memory Recall / Reindex Path

### Verified default shape

OpenClaw default memory is not silently injected as a persistent memory-summary block into active messages.
The default path is:

1. system prompt includes memory usage guidance through the memory plugin prompt section
2. the model is instructed to call memory tools when prior work / decisions / people / TODOs matter
3. those tools resolve the active memory manager through plugin runtime registration
4. the manager performs search over indexed memory sources
5. freshness is maintained by sync triggers such as session-start, search-time lazy sync, watch / interval sync, and post-compaction targeted session reindex

### Verified prompt-level entry

1. `agents/system-prompt.ts` calls `buildMemoryPromptSection(...)`.
2. `plugins/memory-state.ts` only returns a registered plugin-provided prompt builder result.
3. `extensions/memory-core/index.ts` registers `buildPromptSection(...)` as that builder.
4. `extensions/memory-core/src/prompt-section.ts` emits guidance telling the model to use `memory_search` / `memory_get`.

### Verified tool/runtime path

1. `extensions/memory-core/index.ts` registers:
   - memory runtime
   - `memory_search`
   - `memory_get`
2. `extensions/memory-core/src/tools.ts` routes tool calls into the active memory manager.
3. `plugins/memory-runtime.ts` resolves the active manager from the registered memory runtime.
4. `extensions/memory-core/src/runtime-provider.ts` exposes that manager through `getMemorySearchManager(...)`.
5. `extensions/memory-core/src/memory/manager.ts` executes `search(...)` / `sync(...)`.

### Verified freshness / sync triggers

From `memory-search.ts`, the resolved defaults are:

- `sync.onSessionStart = true`
- `sync.onSearch = true`
- `sync.watch = true`
- `sync.sessions.postCompactionForce = true`

Observed runtime behavior:

1. `manager.search(...)` calls `warmSession(...)`, which can schedule `sync({ reason: "session-start" })`.
2. `manager.search(...)` also schedules `sync({ reason: "search" })` when content is dirty and lazy search sync is enabled.
3. `pi-embedded-runner/compaction-hooks.ts` can force targeted session reindex after compaction through `manager.sync({ reason: "post-compaction", sessionFiles: [...] })`.
4. this post-compaction reindex only runs when session memory search is enabled and `sources` includes `"sessions"`.

### Evidence

- `agents/system-prompt.ts:39-50` builds memory section through `buildMemoryPromptSection(...)`
- `plugins/memory-state.ts` exposes prompt-section and runtime registration hooks
- `extensions/memory-core/index.ts` registers prompt section, runtime, flush plan, and memory tools
- `extensions/memory-core/src/prompt-section.ts` describes when to use `memory_search` / `memory_get`
- `extensions/memory-core/src/tools.ts` implements `memory_search` and `memory_get`
- `plugins/memory-runtime.ts` exposes `getActiveMemorySearchManager(...)`
- `extensions/memory-core/src/runtime-provider.ts` delegates to `getMemorySearchManager(...)`
- `extensions/memory-core/src/memory/manager.ts:414-447` performs session-start warmup and search-time lazy sync
- `agents/memory-search.ts:225-247` resolves sync defaults including `postCompactionForce`
- `agents/pi-embedded-runner/compaction-hooks.ts:19-97` performs targeted post-compaction session-memory sync

### Engineering meaning

For SNC this is a crucial distinction:

- OpenClaw default memory is primarily tool-mediated recall, not an always-injected state anchor
- OpenClaw does have serious freshness machinery around that memory index
- therefore SNC cannot assume "memory exists" means "the model already sees a structured current state every turn"

This keeps the SNC opportunity open:

- either add a stronger state anchor in prompt/context assembly
- or intentionally preserve tool-mediated retrieval and only add canonical state for long-horizon writing continuity

## Chain I: Context-Engine Registration Seam

### Verified seam

OpenClaw exposes a public context-engine registration API and resolves the active engine through the plugin slot system.

### Verified path

1. `context-engine/registry.ts` exposes `registerContextEngine(...)` as the public registration entrypoint.
2. active engine resolution checks `config.plugins.slots.contextEngine`.
3. if no explicit slot override is present, resolution falls back to the default slot id.
4. `context-engine/index.ts` re-exports this API as part of the public context-engine surface.

### Evidence

- `context-engine/registry.ts:371-381` defines public `registerContextEngine(...)`
- `context-engine/registry.ts:402-426` resolves the active engine via plugin slot or default slot id
- `context-engine/index.ts:14-25` re-exports registration and resolution APIs

### Bundled-extension observation

Current bundled extension scan did not surface any non-test extension registering a context engine.

### Engineering meaning

For SNC this is the strongest hot-pluggable seam found so far:

- a custom context engine / slot-based insertion path is real
- bundled OpenClaw extensions do not currently appear to compete for that seam in production code
- this strengthens the case for shipping SNC as a host enhancement layer instead of an invasive runtime rewrite

## Chain J: Two Distinct OpenClaw Extension Layers

### Verified split

OpenClaw currently shows two different extension surfaces, not one:

1. plugin slot / runtime plugin layer
2. embedded-runner internal extension-factory layer

### Verified plugin/runtime layer

This layer is driven by:

- plugin discovery / manifest loading
- runtime plugin registry activation
- `OpenClawPluginApi` registration methods such as:
  - `registerContextEngine`
  - `registerMemoryPromptSection`
  - `registerMemoryRuntime`
  - `registerTool`
  - `registerHook`

It is also the layer tied to `config.plugins.slots.*`.

### Verified embedded internal-extension layer

`pi-embedded-runner/extensions.ts` builds internal extension factories directly from host config and runtime state.
Current visible examples are:

- `compactionSafeguardExtension`
- `contextPruningExtension`

These are selected from `cfg.agents.defaults.*` and depend on session manager / provider / model state.

### Evidence

- `plugins/loader.ts` handles plugin discovery, manifest registry, plugin API build, and active plugin registry state
- `plugins/api-builder.ts:18-44` and `74-117` show plugin API handlers including context-engine and memory registration surfaces
- `plugins/slots.ts:12-20` and `76-161` show slot mapping, defaults, and exclusive slot selection
- `agents/runtime-plugins.ts:5-23` loads runtime plugins via registry resolution
- `agents/pi-embedded-runner/extensions.ts:31-107` builds internal compaction/pruning extension factories from host config

### Engineering meaning

This split matters for SNC delivery:

- the plugin slot / runtime plugin layer looks like the real external distribution seam
- the embedded extension-factory layer looks like host-internal runtime composition

So if SNC is meant to stay hot-pluggable by default, we should treat these two layers differently rather than lumping them together as one generic "extension" mechanism.

## Chain K: Package-Level Plugin Delivery Contract

### Verified shape

OpenClaw hot-pluggable delivery is backed by a concrete package contract, not only by runtime registration APIs.

### Verified path

1. plugin discovery reads a candidate package root and parses its `package.json`
2. `resolvePackageExtensionEntries(...)` reads package metadata under the `openclaw` key and extracts declared extension entry files
3. discovery records those entries as plugin candidates together with package metadata and package-level OpenClaw metadata
4. manifest registry then loads `openclaw.plugin.json` to get the canonical plugin id / kind / config schema / contract metadata
5. the entry module exports a default plugin-definition object, commonly via `definePluginEntry(...)`
6. bundled `memory-core` demonstrates the full pattern:
   - `package.json` declares `"openclaw": { "extensions": ["./index.ts"] }`
   - `openclaw.plugin.json` declares `id: "memory-core"` and `kind: "memory"`
   - `index.ts` uses `definePluginEntry(...)` and registers memory prompt section, runtime, tools, and CLI

### Evidence

- `plugins/discovery.ts:307-325` reads plugin `package.json`
- `plugins/manifest.ts:384-435` defines package-level `openclaw.extensions` metadata and resolves extension entry files
- `plugins/discovery.ts:601-665` and `733-797` use package extension entries or default index candidates during discovery
- `plugins/discovery.ts:400-417` carries package metadata and `packageManifest` into plugin candidates
- `plugins/manifest.ts:8-10` and `226-250` define and load `openclaw.plugin.json`
- `plugins/manifest-registry.ts:42-79` and `210-240` normalize manifest records with id, kind, source, origin, and contracts
- `plugin-sdk/plugin-entry.ts:130-153` defines `definePluginEntry(...)` as the canonical helper for non-channel plugins, including `memory` and `context-engine` kinds
- `extensions/memory-core/package.json` declares package-level OpenClaw extension entry metadata
- `extensions/memory-core/openclaw.plugin.json` declares plugin id and `kind: "memory"`
- `extensions/memory-core/index.ts:21-64` exports the default plugin entry and registers runtime capabilities

### Engineering meaning

This materially strengthens the SNC delivery hypothesis:

- shipping as an OpenClaw plugin package is a real first-class path, not a hack
- the host already expects a manifest + package metadata + entry module shape
- SNC can target hot-pluggable delivery with stronger confidence before considering host-internal surgery

This does **not** yet answer whether SNC should be one plugin or several cooperating plugins, but it closes the question of whether OpenClaw's external plugin seam is concrete enough to support serious delivery.

## Chain L: Slot-Bearing Plugins Can Still Be Capability Hybrids

### Verified shape

In OpenClaw, `kind` controls slot ownership, but it does not force a plugin to expose only one runtime behavior.

### Verified path

1. `PluginKind` is currently only `memory` or `context-engine`
2. slot helpers normalize `kind` as either a string or an array, and map kinds to exclusive slot keys
3. slot selection disables conflicting same-slot plugins, but explicitly preserves a plugin if it still owns another slot
4. bundled `memory-lancedb` claims `kind: "memory"` yet still registers:
   - tools
   - lifecycle hooks
   - context prepend behavior through `before_agent_start`
5. current bundled manifest scan only surfaced single-kind slot plugins:
   - `memory-core`
   - `memory-lancedb`
6. no bundled manifest currently shows a `kind` array or a shipped `context-engine` plugin

### Evidence

- `plugins/types.ts:88` defines `PluginKind = "memory" | "context-engine"`
- `plugins/slots.ts:22-64` normalizes string-or-array kinds and maps them to slot keys
- `plugins/slots.ts:104-123` preserves plugins that still own another slot while disabling same-slot competitors
- bundled manifest scan across `extensions/*/openclaw.plugin.json` only surfaced `memory-core` and `memory-lancedb` with `kind`
- `extensions/memory-lancedb/index.ts:282-350` registers `memory_recall` / `memory_store` / `memory_forget` under a `kind: "memory"` plugin
- `extensions/memory-lancedb/index.ts:536-566` also registers lifecycle hooks that inject recall context and perform auto-capture

### Engineering meaning

This sharpens the SNC packaging decision:

- a slot-bearing plugin can still bundle extra tools and lifecycle behavior, so OpenClaw does **not** force SNC to split every capability into separate packages
- stock bundled patterns still lean toward single-kind manifests, so a multi-slot or multi-kind SNC package would be more adventurous than the current house style
- the safest current read is that SNC could plausibly ship as one slot-bearing core plugin with auxiliary behavior, while keeping open the option to split secondary capabilities later if upgrade friction appears

## Still Open

1. Whether any non-legacy engine currently provides a richer always-on state anchor
2. Whether timeout-triggered compaction later receives an equivalent maintenance pass through another path
3. Whether any non-default memory plugin injects state through context assembly instead of tools
4. Whether SNC should claim one slot-bearing plugin or multiple cooperating plugins at delivery time
