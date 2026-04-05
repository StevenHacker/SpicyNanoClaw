# CC Repo Map - Round 1

## Frozen Snapshot

- Root: `data/external/claude-code-leeyeel-4b9d30f`
- Commit: `4b9d30f7953273e567a18eb819f4eddd45fcc877`

## Top-Level Shape

Observed top-level structure is shallow and runtime-focused:

- `src`
- `README.md`

Within `src`, the main runtime directories include:

- `commands`
- `context`
- `hooks`
- `memdir`
- `query`
- `services`
- `tools`
- `utils`

## SNC-Relevant Paths Confirmed

All of these exist in the frozen snapshot:

- `src/QueryEngine.ts`
- `src/query.ts`
- `src/Tool.ts`
- `src/tools`
- `src/services/SessionMemory`
- `src/services/extractMemories`
- `src/services/compact`
- `src/memdir`

This is a strong structure-level match with the instruction memo.

## Main Runtime Spine Candidates

### 1. Query lifecycle owner

- `src/QueryEngine.ts`

Evidence:

- File comment says `QueryEngine owns the query lifecycle and session state for a conversation.`
- Constructor stores mutable messages, usage, abort controller, read-file state, and discovered skill / nested memory path tracking.

### 2. Query loop + compaction boundary

- `src/query.ts`
- `src/services/compact/*`

Evidence:

- `src/query.ts` imports:
  - `calculateTokenWarningState`
  - `isAutoCompactEnabled`
  - `buildPostCompactMessages`
  - `applyToolResultBudget`
  - `handleStopHooks`
  - `StreamingToolExecutor`
- `createMicrocompactBoundaryMessage` is imported from `src/utils/messages.js`

### 3. Memory prompt / persistence spine

- `src/memdir/memdir.ts`
- `src/memdir/*`
- `src/services/SessionMemory/*`
- `src/services/extractMemories/*`

Evidence:

- `src/memdir/memdir.ts` defines `ENTRYPOINT_NAME = 'MEMORY.md'`
- same file encodes prompt rules for memory directory use, line/byte truncation, index discipline, and duplicate-memory avoidance
- search results confirm `SessionMemory` and `extractMemories` are first-class services, not incidental helpers

### 4. Tool surface shaping

- `src/Tool.ts`
- `src/tools/*`
- `src/tools/ToolSearchTool/*`

Evidence:

- search hits show `ToolSearch` in `README.md`, `main.tsx`, `Tool.ts`, and `tools.ts`
- this suggests tool exposure control is not just docs-level; it is wired into runtime/UI/tool metadata surfaces

## Structural Observations

1. CC's runtime map is easier to traverse from a small number of files than OpenClaw's current `v2026.4.1` layout.
2. `MEMORY.md` is already treated as an explicit indexed entrypoint with truncation guards and duplicate-avoidance guidance.
3. Compaction, stop hooks, tool-result budget, and memory prompt loading are all visible from the main query path, which is useful for later SNC comparison.

## Directory Shortlist For Round 2

- `src/QueryEngine.ts`
- `src/query.ts`
- `src/services/compact/*`
- `src/services/SessionMemory/*`
- `src/services/extractMemories/*`
- `src/memdir/*`
- `src/tools/ToolSearchTool/*`
- `src/query/stopHooks.ts`

## Engineering Value

If the goal is to borrow mechanisms for long-form writing stability, CC currently looks especially relevant for:

- memory entrypoint design
- post-turn memory extraction
- duplicate-control discipline
- compact / microCompact behavior
- tool surface throttling

These are still structure-level leads, not implementation guidance yet.
