# CC-15 SessionMemory / ExtractMemories Failure-Skip-Control Matrix

## Purpose

Isolate the donor-value control logic in CC's memory sidecars: when work is deliberately skipped, when failures degrade to no-op/fallback, and how the system avoids overlapping maintenance loops or useless writes. The point is to guide SNC durable-memory controls, not to restate product-shell commands.

## Scope

- repo: `data/external/claude-code-leeyeel-4b9d30f`
- primary files:
  - `src/services/SessionMemory/sessionMemory.ts`
  - `src/services/SessionMemory/sessionMemoryUtils.ts`
  - `src/services/compact/sessionMemoryCompact.ts`
  - `src/services/extractMemories/extractMemories.ts`
  - `src/query/stopHooks.ts`
  - `src/query.ts`
- focus:
  - SessionMemory skip/failure/update-control
  - extractMemories skip/backoff/coalescing
  - main-agent short-circuit rules that prevent deadlocks or maintenance thrash
  - donor-value versus shell/service coupling

## Verified Structure / Lifecycle / Contract

### 1. SessionMemory skip/control matrix

| Control point | Verified behavior | Why it matters |
| --- | --- | --- |
| initialization gate | `initSessionMemory()` returns early in remote mode or when auto-compact is disabled | the subsystem is not treated as universally active |
| thread boundary | `extractSessionMemory` only runs when `querySource === 'repl_main_thread'` | no background/subagent pollution |
| feature gate | `tengu_session_memory` must be enabled; disabled gate logs once per ant session | bounded, low-noise gate failure behavior |
| extraction threshold | `shouldExtractMemory(messages)` requires token growth threshold; tool-call threshold helps trigger, but token threshold is always required | prevents update spam |
| natural-break rule | if token threshold is met and the last assistant turn has no tool calls, extraction can run even without tool-call threshold | updates happen at safe breaks instead of only after tool-heavy turns |
| serialization | `extractSessionMemory` is wrapped in `sequential(...)` | no overlapping extractions |
| stale wait guard | `waitForSessionMemoryExtraction()` waits only up to 15s and bails if extraction has been stale for >60s | maintenance loop breaker |
| safe cursor advance | `lastMemoryMessageUuid` advances only when extraction should run; compaction also keeps a safe summarized cursor | avoids silent starvation and API-invariant breakage |

### 2. SessionMemory compaction fallback matrix

`trySessionMemoryCompaction(...)` in `sessionMemoryCompact.ts` deliberately returns `null` instead of forcing a bad compact when:

- feature gates are off
- no session memory file exists
- session memory file is effectively template-only / empty
- `lastSummarizedMessageId` is missing from current messages
- post-compact token count would still exceed the target threshold
- any error is thrown during the attempt

It also waits for in-progress extraction before attempting compaction.

This is a very clear donor pattern: when the maintenance artifact is not ready or not useful, fall back rather than force a corrupt or low-value rewrite.

### 3. SessionMemory keeps API-safe message boundaries

Two controls are especially donor-worthy:

- `updateLastSummarizedMessageIdIfSafe(messages)` only advances the summarized cursor when the last assistant turn has no tool calls
- `adjustIndexToPreserveAPIInvariants(...)` expands the kept range so tool-use/tool-result pairs and split assistant messages sharing the same `message.id` remain valid

So SessionMemory is not just "write a summary file." It also carries defensive logic to avoid creating invalid or orphaned post-compaction history.

### 4. `extractMemories` skip/backoff/coalescing matrix

| Control point | Verified behavior | Why it matters |
| --- | --- | --- |
| stop-hook trigger boundary | `handleStopHooks()` only fires extractMemories when not bare mode, feature is built in, extract mode is active, and there is no `agentId` | sidecar runs only in bounded main-agent conditions |
| main-agent-only rule | `executeExtractMemoriesImpl(...)` immediately returns for subagent turns | no recursive memory-writing swarm |
| global gates | returns early when feature gate off, auto-memory disabled, or remote mode | explicit skip rather than partial degraded run |
| overlap guard | if `inProgress`, latest context is stashed into `pendingContext` and the call returns | no concurrent forked maintenance |
| trailing-run coalescing | after current run finishes, only the newest stashed context gets one trailing run | catches newest work without flooding |
| direct-write short-circuit | if the main agent already wrote memory files in the relevant range, skip forked extraction and advance the cursor | avoids redundant second writer |
| eligible-turn throttle | non-trailing runs only execute every N eligible turns via feature-config throttle | anti-thrash cadence control |
| run hard cap | forked agent uses `maxTurns: 5` | bounded maintenance budget |
| success-only cursor advance | `lastMemoryMessageUuid` advances only after successful extraction or direct-write skip | failures do not silently discard work |
| best-effort error handling | errors log debug/event and return; they do not break the main query loop | sidecar remains optional, not critical-path fragile |

### 5. Main-agent short-circuit rules around compaction/recovery

`query.ts` contains an additional class of control logic that protects maintenance paths from self-deadlock:

- prompt-too-long preemption is explicitly skipped for `compact/session_memory` style queries
- similar skip comments exist around reactive compact/context-collapse recovery paths

The intent is code-explicit: the maintenance query that exists to fix pressure must not be blocked by the same preemptive guard in a way that creates loops or starvation.

### 6. Donor value versus product/shell convenience

High-value donor mechanisms:

- threshold-gated updates
- main-thread-only and non-subagent boundaries
- sequential/coalesced background maintenance
- stale wait timeout and success-only cursor advance
- null/fallback return instead of forced bad compaction
- direct-write short-circuit when the main agent already performed the write
- safe boundary logic for tool-use/tool-result invariants

Lower-value shell/product convenience:

- manual command affordances like `/summary`
- user-facing memory browsing shells
- analytics/event names themselves
- product-specific remote/service wiring around the memory surfaces

## Key Findings

1. CC's memory sidecars are intentionally conservative: skip, coalesce, back off, or fall back is the default when state is not clearly ready.
2. The most valuable donor logic is not "extract memory" itself, but the control plane around when not to extract or compact.
3. SessionMemory and extractMemories use different artifacts, but both protect the main loop from redundant work, overlapping maintenance, and invalid cursor movement.
4. CC repeatedly prefers `no-op` or `null` over forcing a write when evidence or state quality is weak.

## SNC Relevance

For `SNC-Milestone2-04 Durable Memory Diagnostics And Controls`, the strongest donor ideas are:

- no write when there is no meaningful new evidence
- no overlapping background memory maintenance
- success-only cursor/state advancement
- weak/stale evidence should age out rather than be force-projected
- main-agent and sidecar paths should be mutually exclusive when one already performed the useful write

This supports explainable SNC durable-memory behavior far better than copying CC's product shell or memory UI surface.

## Modification Guidance

- `wrap`:
  - SNC should keep durable-memory harvesting/promotion bounded and explainable, with explicit reasons for "no update" conditions.
  - If SNC adds controls, they should bias toward skip/coalesce/fallback rather than unconditional writes.
- `extend`:
  - SNC can adopt stronger donor-style diagnostics around stale/weak evidence, saturated projection, and "main path already handled this."
- `defer`:
  - Manual memory shell commands or browsing surfaces are not required for Milestone 2 from current evidence.
- `avoid`:
  - Do not run overlapping durable-memory sidecars.
  - Do not advance durable-memory cursors/state when the write actually failed.
  - Do not treat every turn as worthy of a new durable-memory write.

## Still-unverified questions

1. The full later-stage archival/GC story outside the SessionMemory and extractMemories paths covered here.
2. Whether other CC product modes add additional remote/service-specific skip controls around these same memory sidecars.
3. How much of the TEAMMEM branch shares the same coalescing/skip contract versus introducing materially different write behavior.
