# OC-07 Memory / Recall / Durable Memory Substrate

## Purpose

This packet isolates how OpenClaw memory actually works so SNC can extend the right seams without fighting host internals too early.

The important split is not "memory on" vs "memory off". The host already separates memory into four distinct concerns:

- prompt-visible memory presentation
- tool-mediated recall
- background sync and freshness
- durable store management and writeback

The code proves those are different layers, not one blob.

## Main Entry Files

Host memory API and state:

- `data/external/openclaw-v2026.4.1/src/plugins/api-builder.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/memory-state.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/memory-runtime.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/memory-embedding-providers.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/registry.dual-kind-memory-gate.test.ts`

Agent/runtime consumers:

- `data/external/openclaw-v2026.4.1/src/agents/system-prompt.ts`
- `data/external/openclaw-v2026.4.1/src/agents/memory-search.ts`
- `data/external/openclaw-v2026.4.1/src/agents/pi-embedded-runner/run/attempt.ts`
- `data/external/openclaw-v2026.4.1/src/auto-reply/reply/memory-flush.ts`

Stock memory plugin:

- `data/external/openclaw-v2026.4.1/extensions/memory-core/index.ts`
- `data/external/openclaw-v2026.4.1/extensions/memory-core/openclaw.plugin.json`
- `data/external/openclaw-v2026.4.1/extensions/memory-core/src/prompt-section.ts`
- `data/external/openclaw-v2026.4.1/extensions/memory-core/src/flush-plan.ts`
- `data/external/openclaw-v2026.4.1/extensions/memory-core/src/tools.ts`
- `data/external/openclaw-v2026.4.1/extensions/memory-core/src/tools.shared.ts`
- `data/external/openclaw-v2026.4.1/extensions/memory-core/src/memory/index.ts`
- `data/external/openclaw-v2026.4.1/extensions/memory-core/src/memory/search-manager.ts`
- `data/external/openclaw-v2026.4.1/extensions/memory-core/src/memory/manager.ts`
- `data/external/openclaw-v2026.4.1/extensions/memory-core/src/memory/qmd-manager.ts`

Alternative memory plugin:

- `data/external/openclaw-v2026.4.1/extensions/memory-lancedb/index.ts`
- `data/external/openclaw-v2026.4.1/extensions/memory-lancedb/config.ts`
- `data/external/openclaw-v2026.4.1/extensions/memory-lancedb/lancedb-runtime.ts`
- `data/external/openclaw-v2026.4.1/extensions/memory-lancedb/openclaw.plugin.json`

Shared host SDK contracts:

- `data/external/openclaw-v2026.4.1/packages/memory-host-sdk/src/runtime-core.ts`
- `data/external/openclaw-v2026.4.1/packages/memory-host-sdk/src/runtime-files.ts`
- `data/external/openclaw-v2026.4.1/packages/memory-host-sdk/src/engine-storage.ts`
- `data/external/openclaw-v2026.4.1/packages/memory-host-sdk/src/engine-qmd.ts`
- `data/external/openclaw-v2026.4.1/packages/memory-host-sdk/src/engine-foundation.ts`
- `data/external/openclaw-v2026.4.1/packages/memory-host-sdk/src/engine-embeddings.ts`

## Memory Architecture Map

| Layer | Code evidence | What it owns | What it does not own |
| --- | --- | --- | --- |
| Prompt-visible memory presentation | `src/plugins/memory-state.ts`, `src/agents/system-prompt.ts`, `extensions/memory-core/src/prompt-section.ts` | The text the model sees about when to use memory, plus citation guidance | It does not inject retrieved memory snippets by default |
| Tool-mediated recall | `extensions/memory-core/index.ts`, `extensions/memory-core/src/tools.ts`, `extensions/memory-core/src/tools.shared.ts`, `src/plugins/memory-runtime.ts` | `memory_search` and `memory_get`, plus disabled/unavailable responses and manager resolution | It does not decide writeback policy or index freshness by itself |
| Background sync and freshness | `src/agents/memory-search.ts`, `extensions/memory-core/src/memory/manager.ts`, `extensions/memory-core/src/memory/manager-sync-ops.ts`, `extensions/memory-core/src/memory/qmd-manager.ts` | Watchers, session-delta sync, interval sync, session-start warmup, search-triggered sync, post-compaction targeted sync | It does not control prompt wording or direct model recall flow |
| Durable store management | `src/plugins/api-builder.ts`, `src/plugins/memory-state.ts`, `src/plugins/memory-embedding-providers.ts`, `extensions/memory-core/src/memory/search-manager.ts`, `extensions/memory-core/src/memory/manager.ts`, `extensions/memory-core/src/memory/qmd-manager.ts`, `extensions/memory-lancedb/index.ts` | Backend selection, embedding provider registry, cache, fallback, SQLite/QMD/LanceDB ownership | It does not need to be copied into SNC as a host fork |
| Durable writeback | `src/auto-reply/reply/memory-flush.ts`, `extensions/memory-core/src/flush-plan.ts`, `src/agents/pi-embedded-runner/run/attempt.ts` | Pre-compaction durable note creation and append-only write targeting | It is not the same thing as recall or indexing freshness |

## Indexing / Recall Lifecycle Map

### 1. Configuration and presentation

- `src/agents/memory-search.ts` merges defaults and overrides into `ResolvedMemorySearchConfig`.
- That config gates `sources`, `experimental.sessionMemory`, `sync.onSessionStart`, `sync.onSearch`, `sync.watch`, `sync.intervalMinutes`, and `sync.sessions.postCompactionForce`.
- `src/plugins/memory-state.ts` stores the registered memory prompt builder and flush resolver.
- `src/agents/system-prompt.ts` calls `buildMemoryPromptSection(...)` only in non-minimal modes, so subagents can skip memory guidance entirely.

### 2. Tool-mediated recall

- `extensions/memory-core/index.ts` registers `memory_search` and `memory_get`.
- `src/plugins/api-builder.ts` exposes `registerMemoryPromptSection`, `registerMemoryFlushPlan`, `registerMemoryRuntime`, and `registerMemoryEmbeddingProvider` as optional no-op host seams.
- `src/plugins/memory-runtime.ts` resolves the active runtime and then delegates to `getMemorySearchManager(...)`.
- `extensions/memory-core/src/tools.shared.ts` resolves whether memory is enabled for the current agent and builds tool context.
- `extensions/memory-core/src/tools.ts` sends `memory_search` to `manager.search(...)` and `memory_get` to `manager.readFile(...)`.
- `tools.ts` returns structured `disabled` / `unavailable` payloads instead of throwing away the turn.
- `memory_search` can clamp injected text when the backend is QMD-backed.

### 3. Backend selection and search

- `extensions/memory-core/src/memory/search-manager.ts` chooses QMD first when configured, otherwise builtin memory.
- If QMD fails after startup, `FallbackMemoryManager` switches to builtin memory and keeps the failure visible in status.
- `MemoryIndexManager.get(...)` caches live managers by agent, workspace, resolved settings, and purpose.
- `purpose: "status"` gets a separate manager path so status probes do not tear down the live search manager.

### 4. Freshness and sync

- `MemoryIndexManager` enables watchers, session listeners, and interval sync for normal managers.
- `warmSession(sessionKey)` can trigger `session-start` sync.
- `search()` can trigger background sync when `dirty` or `sessionsDirty` is set.
- `onSessionTranscriptUpdate(...)` feeds session delta tracking, which debounces and then queues `session-delta` sync work.
- `sync()` supports targeted `sessionFiles`, and concurrent targeted syncs are queued instead of racing.
- `runSyncWithReadonlyRecovery(...)` reopens SQLite and retries when the database is read-only.
- `qmd-manager.ts` has its own boot, interval, watcher, and session-export lifecycle, which is distinct from the builtin SQLite path.

### 5. Durable writeback

- `src/auto-reply/reply/memory-flush.ts` gates preflight flush runs and dedupes them per compaction cycle.
- `extensions/memory-core/src/flush-plan.ts` turns that writeback into a dated `memory/YYYY-MM-DD.md` append-only instruction set.
- `src/agents/pi-embedded-runner/run/attempt.ts` forwards `memoryFlushWritePath` into tool creation, which is how the append-only guard becomes active in a run.

### 6. Alternative plugin lifecycle

- `extensions/memory-lancedb/index.ts` is a separate plugin that proves OpenClaw can host a more hook-heavy memory design without core edits.
- It injects relevant memories in `before_agent_start`.
- It captures memory in `agent_end`.
- It exposes `memory_recall`, `memory_store`, and `memory_forget` tools.
- Its config explicitly supports `autoRecall`, `autoCapture`, and embedding setup.

## Verified Structural Map

- Prompt-visible presentation starts in `extensions/memory-core/index.ts` and is carried by `src/plugins/memory-state.ts` into `src/agents/system-prompt.ts`.
- Tool-mediated recall starts in `extensions/memory-core/index.ts`, flows through `src/plugins/memory-runtime.ts`, and lands in `extensions/memory-core/src/memory/search-manager.ts`.
- Background sync starts in `src/agents/memory-search.ts` config and becomes watcher, interval, and session-delta activity inside `extensions/memory-core/src/memory/manager.ts` and `qmd-manager.ts`.
- Durable writeback starts in `src/auto-reply/reply/memory-flush.ts` and is materialized by `extensions/memory-core/src/flush-plan.ts`.
- The LanceDB plugin is a proof that memory can also be delivered as a hook-driven package rather than only as the stock file/QMD search stack.

## Durable-Memory Extension Seams

- Hot-pluggable seam: the memory registration methods in `src/plugins/api-builder.ts` are optional and isolated from the rest of plugin registration.
- Hot-pluggable seam: `src/plugins/memory-state.ts` is a tiny state holder for prompt builder, flush resolver, and runtime.
- Hot-pluggable seam: `src/plugins/memory-embedding-providers.ts` is a global registry for memory embedding provider adapters.
- Hot-pluggable seam: `extensions/memory-core/index.ts` and `extensions/memory-lancedb/index.ts` are both ordinary plugin entrypoints with `kind: "memory"`.
- Host-owned seam: `src/plugins/registry.dual-kind-memory-gate.test.ts` shows that dual-kind plugins only register memory runtime when the memory slot is selected.
- Host-owned seam: `extensions/memory-core/src/memory/search-manager.ts` encapsulates backend choice and fallback policy.
- Host-owned seam: `extensions/memory-core/src/memory/manager.ts` owns the builtin indexer's lifecycle, sync, recovery, and status.
- Host-owned seam: `extensions/memory-core/src/memory/qmd-manager.ts` owns the QMD-backed indexer's collection/export/sync lifecycle.
- Packaging seam: `extensions/memory-lancedb/package.json` declares install metadata and npm release metadata, which means memory can be distributed as a package, not only as source.

## What SNC Should Reuse Vs Not Fight

### Reuse

- Reuse the host memory API shape in `src/plugins/api-builder.ts` and `src/plugins/memory-state.ts`.
- Reuse the explicit `memory_search` and `memory_get` contract for tool-mediated recall.
- Reuse the config-gated session-memory model in `src/agents/memory-search.ts`.
- Reuse append-only durable writeback with separate recall and freshness paths.
- Reuse targeted post-compaction session reindex when SNC needs to keep session artifacts fresh.

### Wrap preferred

- Wrap memory presentation with a plugin-level prompt section instead of stuffing durable memory into the base system prompt.
- Wrap durable-memory sidecars around safe lifecycle windows such as `session-start`, `afterTurn`, `maintain`, `agent_end`, and `session_end`.
- Wrap extra memory backends as plugins or runtime adapters instead of editing the builtin manager first.

### Internal edit only if proven necessary

- Edit the builtin manager only if SNC truly needs new indexing semantics that the current seam cannot express.
- Edit QMD routing only if the backend split itself is the blocker, not just the data source.
- Edit readonly recovery or cache internals only if there is no host-safe workaround.

### Out of SNC v1 scope

- Full replacement of `MemoryIndexManager`.
- Folding recall, sync, and writeback into one opaque SNC module.
- Making memory always inject into the prompt for every mode.
- Rewriting QMD collection management as a first step.

## SNC Relevance

The strongest SNC lesson is that OpenClaw already has enough surface area for a durable-memory feature without a host fork.

The host already separates:

- what the model sees
- what the model can ask for
- how freshness is maintained
- where durable data lives

That is exactly the shape SNC needs if it wants continuity without taking over OpenClaw internals.

The practical implication is:

- SNC should stay plugin-first for memory.
- SNC should use prompt projection and lifecycle sidecars before it tries to own the indexer.
- SNC should only fight host internals after a missing seam is proven, not because a different memory style feels nicer.

## Modification Guidance

- `Hot-pluggable seam`: prompt section registration, flush plan registration, runtime registration, embedding-provider registration, alternative memory plugins.
- `Host-owned seam`: backend selection, sync policy, readonly recovery, QMD collection management, manager caching.
- `Wrap preferred`: prompt projection, tool-mediated recall, lifecycle sidecars, post-compaction targeted sync, append-only durable writeback.
- `Internal edit only if proven necessary`: builtin manager internals, QMD fallback mechanics, vector/FTS schema changes, embedding batch plumbing.
- `Out of SNC v1 scope`: a wholesale memory-system rewrite or a single unified "memory blob" that hides recall/writeback/freshness differences.

## Still-Unverified Questions

- Which backend is actually dominant in real use: builtin SQLite, QMD, or the LanceDB plugin.
- Whether `experimental.sessionMemory` is enabled in the current production configs or mostly exists as an opt-in path.
- Whether SNC should ship its own memory plugin first or extend the existing memory runtime first.
- Whether the LanceDB plugin is a real production lane or mainly a proof that hook-heavy memory delivery is possible.
- Whether any future SNC durable-memory design will need multimodal embeddings, which would expand the backend seam materially.
