# CC-11 Memory Lifecycle Contract Matrix

## Problem / Subsystem

This packet pins Claude Code's exact memory lifecycle across four different layers that are easy to conflate:

1. baseline instruction memory
2. relevant-memory recall attachments
3. current-session maintained memory
4. durable auto-memory extraction

The value of this packet is contract accuracy:

- which layer owns what
- when each layer enters the turn lifecycle
- which layers are prompt-visible immediately versus later
- how compaction interacts with each layer

## Main Entry Files

- `data/external/claude-code-leeyeel-4b9d30f/src/context.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/claudemd.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/attachments.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/query.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/query/stopHooks.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/extractMemories/extractMemories.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/SessionMemory/sessionMemory.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/SessionMemory/sessionMemoryUtils.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/SessionMemory/prompts.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/compact/sessionMemoryCompact.ts`

## Verified Structure / Mechanisms

### 1. Baseline instruction memory is built in `getUserContext()`

`context.ts` builds baseline user-context memory as:

- `getMemoryFiles()`
- `filterInjectedMemoryFiles(...)`
- `getClaudeMds(...)`
- `getUserContext()`

`utils/claudemd.ts` explicitly documents the baseline load order:

1. managed memory
2. user memory
3. project memory
4. local memory

This is the prompt-baseline instruction path. It is not the same thing as relevant-memory recall or durable extraction.

### 2. Relevant-memory recall is an async side query, not baseline context loading

`query.ts` starts `startRelevantMemoryPrefetch(...)` near the start of the turn and binds it with `using`.

That prefetch:

- only runs when auto-memory is enabled and `tengu_moth_copse` is on
- skips if there is no real user message
- skips single-word prompts
- skips when the surfaced-memory byte budget for the session is already full

The actual selector path is:

- `startRelevantMemoryPrefetch(...)`
- `getRelevantMemoryAttachments(...)`
- `findRelevantMemories(...)`
- `readMemoriesForSurfacing(...)`
- `filterDuplicateMemoryAttachments(...)`

The consume point is later in `query.ts`, after the main turn has already progressed. If the prefetch is settled and not already consumed, the attachments are turned into visible attachment messages and appended to tool results.

So relevant-memory recall is opportunistic mid-turn attachment injection, not baseline memory construction.

### 3. Current-session memory is a maintained artifact dedicated to continuity and compaction

`initSessionMemory()` only registers the session-memory hook when:

- not in remote mode
- auto-compact is enabled

The actual extraction hook then runs only for:

- `querySource === 'repl_main_thread'`
- session-memory gate enabled
- threshold conditions met

Those threshold conditions are based on:

- total context tokens for initialization and update cadence
- tool-call count between updates
- whether the last assistant turn ended in a safe place

When it fires, session-memory extraction:

- creates or loads the session-memory file
- uses a forked agent
- restricts tool access to `Edit` on exactly that file
- records extraction token count
- advances `lastSummarizedMessageId` only when the last assistant turn does not leave orphaned tool-call structure

This is a current-session maintained artifact, not a durable memory topic store.

### 4. Session memory is consumed by compaction, not by baseline injection

`sessionMemoryCompact.ts` shows the consumer side of that artifact.

Before attempting session-memory compaction, CC:

- waits for any in-progress extraction
- loads the session-memory file
- rejects missing or template-only files
- uses `lastSummarizedMessageId` when available, with a resumed-session fallback when not
- preserves API invariants before deciding which messages to keep

So the session-memory file exists primarily as a continuity artifact that can replace part of legacy compaction work.

### 5. Durable memory extraction is a stop-hook sidecar, not the same pipeline as session memory

`query/stopHooks.ts` triggers durable extraction only when:

- not in bare mode
- `EXTRACT_MEMORIES` feature is enabled
- the current turn is not a subagent turn
- extract mode is active

Then it fire-and-forgets `executeExtractMemories(...)`.

`extractMemories.ts` verifies that this path:

- uses closure-scoped state from `initExtractMemories()`
- only runs when auto-memory is enabled
- skips remote mode
- enforces one extraction at a time with `inProgress`
- stashes a trailing context when another turn arrives mid-run
- counts only new model-visible messages since the extraction cursor
- skips forked extraction when the main agent already wrote memory files in that window
- scans the existing memory manifest first
- runs a forked agent with restricted memory-directory tool permissions
- optionally appends a "memory saved" system message after files are written

This is durable topic extraction, not baseline instruction assembly and not current-session compaction memory.

### 6. Compaction interacts with each memory layer differently

The code shows four different compaction interactions:

- baseline instruction memory:
  - main-thread compaction clears `getUserContext` cache and `resetGetMemoryFilesCache('compact')`
  - next turn rebuilds the injected baseline
- relevant-memory recall:
  - `collectSurfacedMemories(messages)` scans transcript attachments
  - compaction naturally resets surfaced-memory state because old attachment messages disappear
- current-session session memory:
  - compaction explicitly waits for extraction and may reuse the session-memory file first
- durable extracted memories:
  - not consumed inline by the stop hook itself
  - they become useful later through relevant recall or other memory discovery paths

## Exact Memory Lifecycle Matrix

| Layer | Entry / Producer | Storage / Visibility | Timing | Owner Boundary | Compaction Interaction |
| --- | --- | --- | --- | --- | --- |
| Baseline instruction memory | `getMemoryFiles()` -> `filterInjectedMemoryFiles()` -> `getClaudeMds()` -> `getUserContext()` | prompt-visible `userContext` text | built as part of context construction and cached | host instruction system | main-thread compaction clears `getUserContext` and memory-file caches so baseline instructions reload next turn |
| Relevant-memory recall | `startRelevantMemoryPrefetch()` -> `getRelevantMemoryAttachments()` -> `readMemoriesForSurfacing()` -> `filterDuplicateMemoryAttachments()` | attachment messages plus `readFileState` de-dup | started near turn start, consumed later if settled | host selective-recall sidecar | compaction naturally resets surfaced-memory history because old attachment messages vanish |
| Current-session session memory | session-memory post-sampling hook in `sessionMemory.ts` | session-memory markdown file, not baseline prompt text | after qualifying main-thread turns | host continuity / compaction artifact | autocompact waits for extraction and may summarize from this file before legacy compact |
| Durable extracted memories | `handleStopHooks()` -> `executeExtractMemories()` -> forked extraction agent | durable memdir topic files and optional "memory saved" system message | after turn stop, fire-and-forget | host durable-memory pipeline | not used inline by stop hook; later candidates for recall or memory discovery |

## Ownership / Timing Notes By Layer

### Baseline memory

- instruction-oriented
- cached at the context layer
- may include memory files discovered from managed, user, project, and local scopes
- `filterInjectedMemoryFiles(...)` can exclude AutoMem and TeamMem from prompt injection when the newer memory mode is active

### Relevant recall

- retrieval-oriented
- bounded by selector budget and surfaced-byte budget
- dedupes against both already-surfaced transcript attachments and `readFileState`
- writes to `readFileState` only after filtering so it does not self-drop its own candidates

### Current-session session memory

- continuity-oriented
- main-thread only
- threshold-gated
- intentionally isolated to one editable file
- directly coupled to compaction reuse

### Durable extraction

- long-lived memory writing
- post-turn and best-effort
- one extraction at a time, with trailing-run coalescing
- separate from the session-memory file and separate from baseline instruction assembly

## Baseline vs Recall vs Extraction Separation

The most important verified separation is:

- baseline memory is instructions assembled into `userContext`
- relevant-memory recall is a non-blocking attachment side query
- session memory is a current-session maintained artifact for continuity and compaction
- extract memories is a stop-hook durable writing pipeline

These are four different contracts, not four names for one memory subsystem.

## SNC Relevance

For SNC, this packet matters because memory work only stays sustainable if these contracts stay separate.

The donor lessons are:

- do not confuse "prompt baseline instructions" with "recall"
- do not confuse "current-session continuity artifact" with "durable memory store"
- do not assume stop-hook extraction is part of the main-turn prompt path
- compaction-safe memory features need explicit ownership and timing

This supports SNC's current milestone direction:

- plugin-owned durable memory helpers
- read-only helper recall surfaces
- policy-aware, hot-pluggable utilities instead of host memory-slot takeover

## Modification Guidance

### Wrap

- wrap SNC durable-memory work as its own layer with explicit ownership
- wrap SNC recall utilities around selective, read-only retrieval rather than baseline-context takeover

### Extend

- extend current-session continuity using SNC-owned artifacts when needed
- extend recall through helper utilities that respect host timing and de-dup behavior

### Defer

- taking over host baseline `CLAUDE.md` assembly
- merging SNC durable memory directly into host stop-hook pipelines before there is a hard product need

### Do-not-touch

- do not collapse baseline injection, recall, session memory, and durable extraction into one SNC abstraction
- do not assume the session-memory file is the durable memory store
- do not casually mutate host `getUserContext` / `getMemoryFiles` lifecycle unless the host path is clearly blocking SNC

## Still-Unverified Questions

- the exact ranking internals inside `findRelevantMemories(...)` were not reopened here; this packet verifies when recall runs and how it is surfaced
- the full AutoMem / TeamMem frontmatter and topic schema were not exhaustively cataloged here
- the long-run interaction between SNC-owned durable memory and CC's stop-hook extraction policy remains a future integration question
