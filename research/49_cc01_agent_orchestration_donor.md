# CC-01 Agent Construction / Query Orchestration

## Purpose

This packet deconstructs the CC conversation runtime and orchestration layer.

The main split is:

- `QueryEngine` owns persistent per-conversation state across turns
- `query.ts` owns the iterative per-turn orchestration loop
- surrounding coordinator, task, buddy, and history files are mixed runtime shell and product shell

For SNC, this packet matters because it tells us which parts of CC's agent quality come from reusable harness structure rather than from prompt prose or shell UX.

## Main Entry Files

### Runtime core

- `data/external/claude-code-leeyeel-4b9d30f/src/QueryEngine.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/query.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/tasks/LocalMainSessionTask.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/tasks/stopTask.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/tasks/types.ts`

### Product-shell or UX-heavy layers

- `data/external/claude-code-leeyeel-4b9d30f/src/coordinator/coordinatorMode.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/assistant/sessionHistory.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/buddy/companion.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/buddy/prompt.ts`

## Verified Read

### 1. `QueryEngine` is a persistent conversation owner

`QueryEngine.ts` explicitly describes itself as one engine per conversation.
Each `submitMessage()` starts a new turn, while messages, file cache, usage, and related state persist across turns.

This is an important donor pattern: keep a persistent session owner object separate from the low-level loop implementation.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/QueryEngine.ts`

### 2. `QueryEngine` assembles more than a raw prompt

Before calling `query()`, `QueryEngine` assembles:

- base user/system context
- optional coordinator worker context
- memory-related prompt/context surfaces

That means CC quality is not produced only by `query.ts`; the owner layer also shapes the turn envelope.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/QueryEngine.ts`

### 3. `query.ts` is a true runtime loop, not a thin API wrapper

`query.ts` keeps loop-local orchestration state and re-enters until terminal conditions are satisfied.
It owns:

- model calls
- tool execution
- pressure control
- compaction/recovery
- queue draining
- hook windows
- continuation decisions

This matters because the good donor ideas here are harness-order ideas, not just helper functions.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/query.ts`

### 4. CC overlaps background work with the main turn

Memory prefetch starts once per user turn and is only consumed later if it has settled.
Skill discovery prefetch runs per iteration and is similarly consumed later.

This is a strong runtime idea:

- use safe background prefetch
- only consume when ready
- hide latency under ongoing model/tool work

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/query.ts`

### 5. Agent-scoped routing is explicit

`query.ts` uses `querySource` and `agentId` to vary orchestration behavior.
The same underlying runtime can distinguish:

- top-level sessions
- subagents
- compact/session-memory side runs
- resume/background paths

This is one of the strongest donor ideas for future SNC multi-worker orchestration.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/query.ts`

### 6. Queue draining is shared but address-scoped

The command queue is process-global but agent-scoped.
Main thread drains items with no `agentId`.
Subagents only drain `task-notification` items addressed to their own `agentId`.

This is clean and important:

- workers share infrastructure
- prompt traffic does not leak into subagents

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/query.ts`

### 7. Budget continuity survives compaction

CC explicitly preserves `taskBudget` across compaction boundaries by recalculating remaining budget after compacts.

This is a subtle but valuable donor pattern for long-running agentic turns:

- compaction should not accidentally reset the economics of the task

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/query.ts`

### 8. Top-level and background tasks are structurally separated

`LocalMainSessionTask` backgrounds a main query as an isolated task with its own transcript path, progress accounting, and notification behavior.
`stopTask()` provides a shared kill path with task-type-aware validation and notification rules.

That separation is donor-worthy even if CC's exact notification formats are not.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/tasks/LocalMainSessionTask.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/tasks/stopTask.ts`

### 9. Several scoped files are mostly product shell

These are not the strongest donors for SNC core:

- coordinator prompt/policy narrative
- buddy companion behavior
- remote session-history HTTP plumbing

They matter to product polish, but not to current SNC continuity architecture.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/coordinator/coordinatorMode.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/assistant/sessionHistory.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/buddy/*`

## Migratable Harness Ideas

### Persistent session owner + separate iterative loop

Strong donor.

SNC should keep a clear split between:

- per-session ownership/state
- per-turn orchestration loop

### Explicit worker identity via `agentId` / source tags

Very strong donor.

SNC should maintain explicit semantics for:

- main-thread writing
- maintenance sidecars
- background tasks
- future subagents

### Background prefetch with deferred consume

Strong donor.

Use this when SNC eventually grows:

- memory retrieval
- research retrieval
- heavier state refresh

### Shared queue, addressed notifications

Strong donor for multi-worker orchestration.

The key idea is:

- shared infrastructure
- explicit addressing
- no prompt leakage across workers

### Isolated transcript/state per background task

Strong donor.

Do not let every maintenance or sidecar path scribble into the main transcript.

### Budget continuity across compaction

Useful donor.

Long-running writing workflows should preserve task/budget continuity even after context relief operations.

### First-class hook windows

Useful donor.

Stop/failure/post-sampling windows should remain explicit orchestration phases rather than incidental callbacks.

## Product-Shell-Tied Ideas To Avoid Copying Literally

- coordinator persona/system prompt text
- buddy companion system
- remote session-history transport
- CC-specific XML notification formats
- slash-command/mobile-shell behavior

These may inspire product design later, but they are not the core harness value.

## Best Migration Candidates

1. Agent-scoped queueing plus task-notification routing.
2. Persistent session owner plus explicit `querySource` / `agentId` semantics.
3. Background prefetch with deferred consume.
4. Isolated transcript/state per background task.
5. Budget continuity across compaction boundaries.

## SNC Takeaway

The most valuable read from this packet is that CC quality is partly structural:

- one persistent conversation owner
- one explicit orchestration loop
- clear worker/source identity
- addressed queueing
- safe background work

Those ideas are more reusable than most of the product-shell layers around them.
