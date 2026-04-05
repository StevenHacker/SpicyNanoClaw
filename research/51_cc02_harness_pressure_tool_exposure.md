# CC-02 Harness / Pressure-Control / Tool Exposure

## Purpose

This packet isolates the Claude Code mechanisms that control context pressure, tool-surface noise, and compaction recovery behavior.

This is valuable for SNC because these mechanisms are closer to harness policy than to product shell polish.

## Core Read

### 1. CC uses a staged pressure ladder

CC does not jump straight from "context is large" to "summarize everything."
The main loop explicitly spends cheaper and more deterministic reductions first:

1. per-message tool-result budget
2. snip
3. microcompact
4. context-collapse view projection
5. autocompact

This ordering matters because it preserves more structure and pays summary cost later.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/query.ts`
- especially the ordered sections around `applyToolResultBudget`, snip, microcompact, collapse, and autocompact

### 2. Tool-result replacement decisions are frozen across turns

`toolResultStorage.ts` tracks replacement state by `tool_use_id`.
Once CC has seen a tool result, its fate becomes stable for the conversation:

- replaced results get the exact same preview text re-applied later
- frozen full results stay full
- new decisions are persisted so resume/fork flows reconstruct the same behavior

This is a very strong donor pattern because it reduces token noise without destabilizing prompt-cache prefixes or resume behavior.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/utils/toolResultStorage.ts`

### 3. CC prefers maintained artifacts over fresh re-summarization

Autocompact tries session-memory compaction first before falling back to heavier summary-based compaction.
That means the harness prefers previously maintained state artifacts when they are available and sufficient.

This maps well to SNC because SNC already has a session-state artifact.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/services/compact/autoCompact.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/compact/sessionMemoryCompact.ts`

### 4. Recovery is bounded and ownership-aware

CC does not let every pressure subsystem fight at once.
It has source-aware guards, fallback ordering, and a consecutive-failure breaker for autocompact.

That is an important harness lesson:

- pressure relief needs ownership boundaries
- doomed recovery loops need a breaker

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/query.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/compact/autoCompact.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/compact/postCompactCleanup.ts`

### 5. Tool exposure is deferred instead of eagerly flooding the model

`ToolSearch` is not a cosmetic helper.
It acts as a capability-supply control plane:

- small tool identity exposure first
- full schema only when requested
- a small always-available exception set remains inline

This is a genuine anti-noise harness idea, not just a prompt trick.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/tools/ToolSearchTool/ToolSearchTool.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/tools/ToolSearchTool/prompt.ts`

## Donor Patterns Worth Carrying

### Deterministic tool-result shaping

Best current donor for SNC.

Why:

- high signal-to-risk ratio
- deterministic
- transcript-visible
- compatible with OpenClaw's existing write-time hook seam

Recommended SNC interpretation:

- shape large tool results before they become long-lived transcript noise
- preserve stable replacement decisions once made
- avoid per-turn drift in what the model re-sees

### Staged SNC pressure policy

Carry the policy, not the exact CC mechanism stack.

Recommended current SNC order:

1. deterministic tool-result shaping
2. `maintain()` transcript hygiene
3. delegated host compaction influenced by SNC state

This is the minimal useful version of the CC pressure ladder inside current OpenClaw seams.

### Maintained-artifact-first compaction guidance

Carry this now.

SNC already persists session-state.
The next donor-worthy step is to make compaction increasingly prefer that artifact over ad hoc summary generation.

### Centralized cleanup after compaction-sensitive mutations

If SNC starts mutating cache-relevant or transcript-relevant content more aggressively, it should have one cleanup point with source-aware guards.

Carry the pattern, not CC's exact helper implementation.

### Deferred tool schema exposure

Carry this later, not now.

It becomes relevant once SNC grows a larger helper-tool surface.

## Donor Patterns To Reject Or Defer

### Reject as-is

- cached microcompact implementation
- API-native context-management edits from `apiMicrocompact.ts`
- CC's exact ToolSearch exception matrix

Reason:

- too provider-specific
- too product-shell-coupled
- not needed for SNC's current stage

### Defer

- full session-memory compaction port
- continuation-nudge behavior tied to token-budget/product UX
- literal reinjection-cleanup details tied to CC artifact layout

Reason:

- the harness idea is useful
- the concrete code path is too coupled to CC runtime assumptions

## Host-Fit Read For OpenClaw

### Strong fit now

- deterministic write-time tool-result shaping via plugin hooks
- SNC-owned context-engine pressure guidance
- artifact-first compaction policy using SNC session-state

Existing host evidence:

- `research/44_oc01_runtime_core_deconstruction.md`
- `research/42_oc02_plugin_host_deconstruction.md`
- `research/45_snc_hook_scaffold_v1.md`

### Weak fit now

- full ToolSearch-style deferred schema control plane
- deep cache-edit microcompact semantics

Existing host evidence:

- current OpenClaw read shows strong transcript/hook seams
- current OpenClaw read does not yet show an equally strong built-in deferred-tool supply plane

## Best Migration Candidates For The Current SNC Stage

1. Deterministic tool-result shaping before host compaction.
2. A staged SNC pressure policy instead of a single compaction jump.
3. State-artifact-first compaction guidance using SNC session-state.
4. A single centralized cleanup point once SNC transcript shaping becomes more aggressive.
5. Deferred tool exposure only when SNC helper tools grow enough to justify it.

## SNC Takeaway

The main lesson from this packet is not "copy CC compaction."
It is:

- make pressure relief staged
- make reductions deterministic where possible
- reuse maintained state before asking the model to summarize again
- keep ownership and failure boundaries explicit
