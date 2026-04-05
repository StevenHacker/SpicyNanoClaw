# CC Call Chains

## Status

- Round 1 created the file and confirmed the primary entry surfaces.
- Round 2 closed the query-loop memory recall / post-turn extraction / session-memory compaction chains.
- Round 3 closed the baseline `MEMORY.md` injection / replacement path.
- Round 4 extracted the first harness-pattern packet from query / compact / ToolSearch runtime control.

## Confirmed entry surfaces

- `src/QueryEngine.ts`
- `src/query.ts`
- `src/services/compact/*`
- `src/services/SessionMemory/*`
- `src/services/extractMemories/*`
- `src/memdir/*`
- `src/tools/ToolSearchTool/*`

## To reconstruct next

1. ToolSearch / deferred tools exposure chain
2. microcompact and tool-result budget enforcement details
3. feature-gate defaults that decide which memory presentation mode is actually dominant

## Chain A: Query-Time Memory Recall

### Verified path

1. `query.ts` starts `startRelevantMemoryPrefetch(...)` once per user turn, before the main loop iterations.
2. the prefetch uses the last real user message as input and skips weak prompts such as single-word input.
3. `attachments.ts` calls `findRelevantMemories(...)`, which scans memory headers and asks a side Sonnet query to pick up to 5 relevant files.
4. selected files are read and converted into `relevant_memories` attachments.
5. later in the query loop, once the prefetch promise has settled, `filterDuplicateMemoryAttachments(...)` injects only memories not already present in `readFileState`.

### Evidence

- `query.ts:301-304` starts `startRelevantMemoryPrefetch(...)`
- `query.ts:1595-1609` consumes prefetched memory attachments during the loop
- `utils/attachments.ts:2361-2419` defines the prefetch entry and gating
- `utils/attachments.ts:2211-2237` calls `findRelevantMemories(...)` and reads selected memories
- `utils/attachments.ts:2516-2536` filters duplicates and marks surfaced files in `readFileState`
- `memdir/findRelevantMemories.ts:39-75` scans candidates and returns ranked memory paths
- `memdir/findRelevantMemories.ts:97-130` uses `sideQuery(...)` plus JSON schema output to select filenames
- `memdir/memoryScan.ts:25-93` provides shared frontmatter scan + manifest formatting

### Engineering meaning

CC durable-memory recall is not just "read MEMORY.md".
It has a real query-time relevance pass:

- scan memory headers
- rank with a side model
- inject only selected files
- dedupe against already-read files

This is much closer to an SNC long-horizon recall subsystem than OpenClaw's default tool-guidance memory layer.

## Chain B: SessionMemory Trigger / Writeback

### Verified trigger logic

1. `initSessionMemory()` registers a post-sampling hook, but only when auto-compact is enabled and not in remote mode.
2. the hook runs only on the main REPL thread.
3. extraction requires a token threshold, and then either:
   - tool-call threshold is also met, or
   - the latest assistant turn ended without tool calls
4. when triggered, SessionMemory sets up `summary.md`, builds an update prompt, and runs a forked agent with restricted file-edit permission to update that file.

### Evidence

- `services/SessionMemory/sessionMemory.ts:134-180` defines `shouldExtractMemory(...)`
- `services/SessionMemory/sessionMemory.ts:272-349` runs the extraction workflow
- `services/SessionMemory/sessionMemory.ts:357-375` registers the post-sampling hook in `initSessionMemory()`
- `services/SessionMemory/sessionMemory.ts:387-444` exposes manual extraction with the same forked-agent pattern
- `query.ts:998-1007` fires post-sampling hooks after a model response completes

### Engineering meaning

SessionMemory is a rolling intra-session state summary, not durable project memory.
Its design intent is:

- low-disruption background upkeep
- update only at safe conversational breakpoints
- keep a session summary file ready for later compaction

That makes it a strong candidate analogue for SNC's "current work state" layer.

## Chain C: SessionMemory-Assisted Compaction

### Verified path

1. `trySessionMemoryCompaction(...)` is used by auto-compact and `/compact`.
2. it only runs when both session-memory and session-memory-compaction gates are enabled.
3. before compaction, it waits for any in-flight SessionMemory extraction to finish.
4. it reads the current session memory and uses it as the compact summary instead of generating a fresh traditional summary.
5. it keeps only the unsummarized tail of the conversation, adjusts boundaries safely, and emits standard post-compact messages.

### Evidence

- `services/compact/sessionMemoryCompact.ts:403-431` defines feature gating
- `services/compact/sessionMemoryCompact.ts:514-620` defines the main compaction flow
- `services/compact/sessionMemoryCompact.ts:527-530` waits for extraction and reads session memory
- `services/compact/sessionMemoryCompact.ts:571-581` computes the kept tail and strips old compact boundaries
- `services/compact/sessionMemoryCompact.ts:591-600` builds the compaction result and post-compact messages
- `commands/compact/compact.ts:58-99` tries SessionMemory compaction before fallback compact
- `services/compact/autoCompact.ts:288-308` also tries SessionMemory compaction

### Engineering meaning

This is the most SNC-relevant CC pattern found so far:

- maintain a continuously updated session-state artifact
- when compaction hits, reuse that artifact instead of asking the model to reconstruct state from scratch

That directly maps to the writing problem of "don't lose the thread when context pressure forces compression."

## Chain D: extractMemories Trigger / Durable Writeback

### Verified trigger logic

1. `initExtractMemories()` creates closure-scoped extractor state.
2. `handleStopHooks(...)` calls `executeExtractMemories(...)` fire-and-forget at the end of a completed query loop.
3. extraction is main-agent only, local-only, gated, and skipped if auto-memory is disabled.
4. overlapping runs are coalesced: a newer context is stashed and replayed as one trailing extraction.
5. if the main agent already wrote memory files directly, the forked extractor skips the range and advances the cursor.
6. otherwise the extractor builds a prompt from the current transcript slice plus a manifest of existing memories, then uses a restricted forked agent to write durable memory files.

### Evidence

- `query.ts:1264-1273` calls `handleStopHooks(...)`
- `query/stopHooks.ts:141-152` fires `executeExtractMemories(...)`
- `services/extractMemories/extractMemories.ts:296-325` initializes closure-scoped mutable state
- `services/extractMemories/extractMemories.ts:340-359` skips when direct memory writes already happened
- `services/extractMemories/extractMemories.ts:374-380` throttles extraction by eligible turns
- `services/extractMemories/extractMemories.ts:398-427` builds extraction prompt and runs the forked agent
- `services/extractMemories/extractMemories.ts:455-496` reports saved durable memories back into the session
- `services/extractMemories/extractMemories.ts:527-614` defines public execute/drain behavior
- `cli/print.ts:968` drains pending extraction before shutdown

### Engineering meaning

`extractMemories` is durable project-memory distillation, clearly separate from SessionMemory.
Its role is:

- run after a turn is truly complete
- write reusable project memories
- avoid duplicate work if the main agent already did the write
- preserve responsiveness through coalesced trailing runs

For SNC, this looks like the right analogue for "long-term memory harvesting", not for the current-state anchor itself.

## Chain E: Baseline `MEMORY.md` Injection / Relevant-Memory Replacement

### Verified normal assembly path

1. `QueryEngine.ts` asks `fetchSystemPromptParts(...)` for the system-prompt parts plus `userContext`.
2. `fetchSystemPromptParts(...)` calls `getSystemPrompt(...)` and `getUserContext()`.
3. `getSystemPrompt(...)` includes a memory section through `systemPromptSection('memory', () => loadMemoryPrompt())`.
4. `loadMemoryPrompt()` returns memory-behavior instructions and write discipline.
5. separately, `getUserContext()` builds `claudeMd` from `getClaudeMds(filterInjectedMemoryFiles(await getMemoryFiles()))`.
6. `getMemoryFiles()` includes the AutoMem / TeamMem entrypoint files when those systems are enabled.
7. `getClaudeMds(...)` serializes those files into the injected CLAUDE.md-style context blob.

### Verified special custom-prompt path

1. if an SDK caller supplies `customSystemPrompt`
2. and also opts in with `CLAUDE_COWORK_MEMORY_PATH_OVERRIDE`
3. then `QueryEngine.ts` explicitly appends `await loadMemoryPrompt()` as a `memoryMechanicsPrompt`

This is a compatibility path for custom-prompt callers, not the main default query path.

### Verified replacement mode

When `tengu_moth_copse` is enabled:

1. `loadMemoryPrompt()` sets `skipIndex = true`
2. `filterInjectedMemoryFiles(...)` removes `AutoMem` and `TeamMem` from the baseline injected memory-file set
3. code comments explicitly say relevant-memory prefetch now surfaces memory files via attachments instead of injecting the `MEMORY.md` index
4. the query-time `startRelevantMemoryPrefetch(...)` / `findRelevantMemories(...)` path becomes the main durable-memory surfacing mechanism for active turns

### Evidence

- `QueryEngine.ts:288-325` fetches prompt parts, then conditionally appends `memoryMechanicsPrompt`
- `utils/queryContext.ts:44-73` defines the shared prompt-part fetch path through `getSystemPrompt(...)` and `getUserContext()`
- `constants/prompts.ts:491-507` includes `systemPromptSection('memory', () => loadMemoryPrompt())`
- `constants/prompts.ts:466-488` also injects `loadMemoryPrompt()` in the proactive simple path
- `context.ts:170-186` injects `claudeMd` from `getClaudeMds(filterInjectedMemoryFiles(await getMemoryFiles()))`
- `utils/claudemd.ts:978-1005` adds AutoMem / TeamMem entrypoint files to `getMemoryFiles()`
- `utils/claudemd.ts:1135-1149` filters AutoMem / TeamMem when `tengu_moth_copse` is enabled
- `utils/claudemd.ts:1152-1165` serializes loaded memory files through `getClaudeMds(...)`
- `memdir/memdir.ts:196-197` documents that `loadMemoryPrompt` uses user-context injection for content rather than embedding content itself
- `memdir/memdir.ts:419-489` defines `loadMemoryPrompt()` and its `skipIndex` behavior
- `memdir/memdir.ts:318-325` documents that `MEMORY.md` is still loaded into context via `claudemd.ts`

### Engineering meaning

CC is not using one single "memory prompt" trick.
It has at least three distinct delivery modes:

- behavioral memory instructions in the system prompt
- baseline memory-file content injection through the CLAUDE.md-style context path
- selective relevant-memory attachments for active-turn recall

This is extremely important for SNC:

- current-state anchoring and durable recall do not need to share the same transport
- CC already demonstrates a migration path from blanket index injection toward more selective attachment-based recall
- SNC can likely keep a stable writing-state anchor while making long-term recall selective and query-sensitive

One more structural implication is now clear:

- `tengu_moth_copse` is not a cosmetic prompt flag
- it cuts across prefetch activation, baseline memory-file injection, memory-prompt shape, and extraction-prompt shape

So if SNC borrows this pattern, we should treat "index injection vs selective recall" as an architectural mode switch, not as a tiny prompt tweak.

## Current SNC Read

CC now looks like a two-layer memory architecture:

1. `SessionMemory`
   current-session rolling state, maintained in the background, reused during compaction
2. `extractMemories` + `memdir`
    durable cross-session memory extraction plus relevance-based recall
3. memory presentation mode
   behavioral instructions plus either baseline index injection or attachment-based relevant recall, depending on the active feature path

That split is highly promising for SNC because the writing problem also has two different horizons:

- current arc / active chapter / immediate constraints
- long-term world facts / character facts / prior decisions / reusable knowledge

## Prompt Vs Runtime Notes

### Runtime-heavy mechanisms already confirmed

- SessionMemory trigger timing is enforced by hook timing plus token/tool thresholds
- extractMemories trigger timing is enforced by stop hooks, coalescing, trailing-run control, and forked-agent limits
- session-memory compaction waits for in-flight extraction before reusing the summary
- microcompact enforces compactable-tool sets, token estimates, image token caps, time-based triggers, and cache-edit paths
- ToolSearch runtime implements exact-match, prefix-match, keyword ranking, and description-cache invalidation

### Prompt-heavy constraints already confirmed

- SessionMemory template fixes the section schema and explicitly prioritizes `Current State`
- SessionMemory update prompt forces structure preservation and instructs over-budget condensation
- extractMemories prompt enforces:
  - last-N-message scope
  - no extra verification rabbit holes
  - parallel read-then-write behavior
  - no duplicate durable memories
  - two-step memory file + `MEMORY.md` index discipline
- ToolSearch prompt defines which tool classes should stay immediately visible versus deferred

### Engineering meaning

CC effectiveness is not coming from prompt wording alone.
The stronger pattern is:

- runtime enforces when and how these sidecars run
- prompts constrain what the sidecar agents are allowed to do once triggered

For SNC this means we should borrow mechanisms and prompts together where they are tightly paired, but we should not mistake one for the other.

## Harness Read

The most SNC-relevant CC takeaway is now broader than any single module:

- context pressure is handled as a staged control problem
- background maintenance is scheduled through safe trigger windows
- maintained artifacts are reused during compaction instead of always regenerating summaries
- automatic maintenance paths have circuit breakers
- capability exposure is actively throttled through deferred-tool discovery

That synthesized read is maintained separately in:

- `research/30_harness_patterns_cc.md`
