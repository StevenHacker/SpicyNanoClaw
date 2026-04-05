# CC-10 Pressure / Compaction Lifecycle Matrix

## Problem / Subsystem

This packet pins the exact pressure-relief and compaction order in Claude Code's query loop.

The goal is not to restate "CC compacts context". The goal is to verify:

- what runs first when a turn is under pressure
- which reductions are proactive versus reactive
- where maintained artifacts are reused before full summarization
- how cleanup and failure tracking are threaded back into later turns

This packet stays on lifecycle and trigger ordering, not shell/product UX.

## Main Entry Files

- `data/external/claude-code-leeyeel-4b9d30f/src/query.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/compact/autoCompact.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/compact/sessionMemoryCompact.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/compact/compact.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/compact/postCompactCleanup.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/toolResultStorage.ts`

## Verified Structure / Mechanisms

### 1. Main-turn pressure order is explicit in `query.ts`

Inside the main query loop, CC does not jump straight from "large context" to "full compact".

The verified order is:

1. start from `getMessagesAfterCompactBoundary(messages)`
2. run `applyToolResultBudget(...)`
3. run history snip if `HISTORY_SNIP` is enabled
4. run `deps.microcompact(...)`
5. project or commit context-collapse state before autocompact
6. run `deps.autocompact(...)`
7. if compaction succeeds, replace the turn input with `buildPostCompactMessages(result)`
8. only then continue toward blocking-limit checks and the API request

So CC has a real pressure ladder, not a single compaction switch.

### 2. Tool-result budgeting is the first reducer, not a late cleanup

`applyToolResultBudget(...)` runs before snip, microcompact, and autocompact.

That matters because this layer is content-budget control, not transcript summarization:

- large tool results can be persisted to disk
- old content can be replaced with a placeholder such as `[Old tool result content cleared]`
- later reducers operate on the already-budgeted transcript

This is one of the cleanest examples of "pressure relief before full summarization".

### 3. Microcompact and context-collapse both sit in front of autocompact

`query.ts` explicitly runs microcompact before autocompact, and its comments also state that context-collapse runs before autocompact so collapse can get the turn back under threshold without forcing a single summary.

This yields a layered behavior:

- tool-result budgeting tries to shrink bulky payloads
- snip can remove older history
- microcompact can shrink cached/tool-centric context
- context-collapse can project a more granular collapsed view
- only then does proactive autocompact get a chance

### 4. Proactive autocompact first tries the maintained artifact path

`autoCompactIfNeeded(...)` does not go directly to `compactConversation(...)`.

Its verified order is:

1. `shouldAutoCompact(...)` checks whether proactive compact should run at all
2. if allowed, it first calls `trySessionMemoryCompaction(...)`
3. only if that returns `null` does it fall back to `compactConversation(...)`

This is the core maintained-artifact reuse pattern in CC's compaction system.

### 5. Session-memory compaction is a true reuse path, not a cosmetic summary swap

`trySessionMemoryCompaction(...)` verifies several conditions before it can replace full compact:

- waits for any in-flight session-memory extraction via `waitForSessionMemoryExtraction()`
- loads the maintained session-memory file via `getSessionMemoryContent()`
- rejects template-only or missing session memory
- uses `lastSummarizedMessageId` when available, or a resumed-session fallback when not
- calculates `messagesToKeep` with invariant-preserving adjustment so tool pairs and other API-sensitive boundaries are not split casually
- runs `processSessionStartHooks('compact', ...)`
- adds plan attachment when needed
- computes post-compact token count and declines if the result would still exceed the autocompact threshold

So this path is not "inject session notes and hope". It is a bounded compaction constructor built around a maintained artifact.

### 6. Full compaction rebuilds a post-compact context package, not just a summary message

Inside `compactConversation(...)`, the verified post-summary sequence is:

- clear read-file and nested-memory caches
- rebuild post-compact attachments:
  - restored file attachments
  - async agent attachments
  - plan attachment
  - plan-mode attachment
  - skill attachment
  - deferred-tools delta
  - agent-listing delta
  - MCP-instructions delta
- run `processSessionStartHooks('compact', ...)`
- create the compact boundary marker
- create the compact summary user message
- compute resulting-context size and log the compaction event
- call `notifyCompaction(...)`
- call `markPostCompaction()`
- call `reAppendSessionMetadata()`
- optionally write transcript segment data
- run post-compact hooks

So "compact" in CC means reconstituting a new runnable context packet, not merely generating prose.

### 7. Cleanup is centralized and carefully scoped

`runPostCompactCleanup(...)` always resets microcompact state, but only resets main-thread shared state when the compact came from the main thread or SDK path.

Verified cleanup behavior:

- always reset microcompact state
- reset context-collapse store only for main-thread compacts
- clear `getUserContext` cache and `resetGetMemoryFilesCache('compact')` only for main-thread compacts
- clear system-prompt sections
- clear classifier approvals
- clear speculative bash checks
- clear beta tracing state
- clear session message cache
- intentionally do not reset sent skill names

This is a strong signal that CC treats compaction as a state-boundary event, but not every state bucket is safe to wipe from subagents.

## Exact Pressure / Compaction Matrix

| Stage | Trigger | Output | Verified Notes |
| --- | --- | --- | --- |
| Tool-result budgeting | Every main-loop iteration before other reducers | message content may be persisted or cleared | Runs first in `query.ts`; composes with later reducers |
| History snip | `HISTORY_SNIP` feature path | shorter message list plus `snipTokensFreed` | Autocompact later subtracts snip delta from token estimate |
| Microcompact | Every iteration after snip | reduced message view, optional deferred cache-edit boundary | Boundary message for cached microcompact may be yielded after the API response |
| Context-collapse projection | Collapse-enabled path before autocompact | projected collapsed view and possible committed collapses | Intended to avoid full autocompact when granular collapse is enough |
| Proactive autocompact gate | `shouldAutoCompact(...)` says yes | enter compaction path or no-op | Suppressed for `session_memory`, `compact`, `marble_origami`, reactive-only mode, and collapse-owned mode |
| Session-memory compaction | First proactive compaction attempt | compaction result built from maintained session memory plus kept tail | Waits for extraction, rejects empty/template-only memory, rejects threshold-exceeding result |
| Legacy full compaction | Session-memory path returns `null` or manual compact path | boundary + summary + rebuilt attachments + hook results | `compactConversation(...)` rebuilds a post-compact runnable context |
| Reactive overflow recovery | Real API overflow / prompt-too-long survives to recovery logic | collapse-drain retry first, then reactive compact | Triggered after real API failure, not in the proactive ladder |
| Post-compact cleanup | Successful session-memory or legacy compaction | reset of caches and tracking state | Shared-state resets are scoped to main-thread compacts |
| Failure tracking | Proactive compact throws | incremented failure count in query state | Circuit breaker stops future autocompact after 3 consecutive failures |

## Trigger Order Notes

### Proactive path

- proactive reducers run before the API stream
- session-memory reuse is attempted before full summarization
- successful proactive compaction replaces the turn input with `buildPostCompactMessages(...)`

### Reactive path

- `query.ts` deliberately avoids certain synthetic preempts when reactive compact or context-collapse should own overflow recovery
- on withheld prompt-too-long recovery, collapse drain gets the first retry
- reactive compact is the next fallback, and the turn tracks `hasAttemptedReactiveCompact` to avoid loops

### Post-compact turn tracking

After a successful autocompact, later turns increment `tracking.turnCounter` and emit a `tengu_post_autocompact_turn` event. When autocompact fails, the failure count is threaded forward instead.

## Maintained-Artifact Reuse Notes

The most important donor pattern here is not "summarize harder". It is:

1. maintain a current-session artifact continuously
2. wait for that artifact to finish updating before compaction
3. reuse it first
4. fall back to full summarization only when reuse is unavailable or insufficient

This is materially stronger than naive compact-and-forget behavior.

## Failure / Circuit-Breaker Notes

- `MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES` is `3`
- once the tracked failure count reaches that cap, proactive autocompact stops retrying for the session
- session-memory compaction can decline cleanly by returning `null`; that is a fallback decision, not a failure
- only successful compaction paths run post-compact cleanup and reset the session-memory cursor

## SNC Relevance

For SNC, the important lesson is that CC's pressure handling is layered:

- content-budget relief
- transcript-shape relief
- maintained-artifact reuse
- full compact fallback
- reactive overflow recovery

That supports SNC's current direction:

- prefer plugin-owned artifacts and helpers before host rewrites
- treat compaction as a state-boundary event
- keep post-compact reconstruction explicit when adding SNC-owned context

## Modification Guidance

### Wrap

- wrap SNC extensions around post-turn artifacts and explicit post-compact context rebuilding
- wrap SNC-owned continuity data so it can survive compaction as an attachment or maintained artifact

### Extend

- extend the maintained-artifact pattern for SNC-owned continuity structures
- extend release-safe utilities that operate before host-level full compaction becomes necessary

### Defer

- deep changes to reactive compact internals
- any attempt to reorder the host query-loop pressure ladder without a blocking host deficiency

### Do-not-touch

- do not casually reorder `query.ts` pressure stages
- do not bypass `runPostCompactCleanup(...)` if SNC later cooperates with compaction
- do not assume subagent compacts can safely clear main-thread shared state

## Still-Unverified Questions

- the exact internal mechanics of `reactiveCompact.ts` were not traced in this packet; this packet verifies when it is entered and how it is sequenced from `query.ts`
- the full behavior of context-collapse internals was not reopened here; this packet verifies its position relative to autocompact
- the long-run interaction between prompt-cache-break detection and SNC-owned post-compact attachments remains a future integration question
