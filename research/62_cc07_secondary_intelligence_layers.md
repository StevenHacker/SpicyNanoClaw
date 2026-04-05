# CC-07 Secondary Intelligence Layers

## What This Subsystem Is

This packet covers Claude Code's secondary intelligence layers: modules that
make the product feel more helpful, more contextual, or more alive without
being the core turn-execution harness.

The code evidence shows a broad family of sidecar behaviors:

- analytics and experiment gates
- prompt suggestions
- agent progress summaries
- tool-use summaries
- contextual tips
- MagicDocs background upkeep

These layers do not define the main query loop. They sit beside it, around it,
or after it.

For SNC, this matters because some of Claude Code's "smartness" is product-feel
infrastructure, not core orchestration.

## Main Entry Files

### Layer implementations

- `data/external/claude-code-leeyeel-4b9d30f/src/services/analytics/index.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/analytics/growthbook.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/PromptSuggestion/promptSuggestion.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/AgentSummary/agentSummary.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/toolUseSummary/toolUseSummaryGenerator.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/tips/tipRegistry.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/tips/tipScheduler.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/MagicDocs/magicDocs.ts`

### Wiring / activation points

- `data/external/claude-code-leeyeel-4b9d30f/src/query/stopHooks.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/query.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/tools/AgentTool/AgentTool.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/backgroundHousekeeping.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/main.tsx`

## Verified Structure / Mechanisms

### 1. Analytics and feature gating are sidecar control layers, not harness logic

`src/services/analytics/index.ts` implements a queueable analytics sink with
strong typing around metadata safety and with explicit decoupling to avoid
dependency cycles.

`src/services/analytics/growthbook.ts` adds feature-flag / experiment behavior
with cached values, refresh, and user-context reinitialization.

This is measurement and product-governance infrastructure. It influences the
experience, but it is not the main runtime harness.

### 2. Several product-feel layers are explicitly deferred until after first render

`src/main.tsx` `startDeferredPrefetches()` defers:

- `getRelevantTips()`
- analytics gate initialization
- other cache-warming/product-feel prefetches

The code comment explicitly says these are not needed before first render and
are moved out of setup to reduce startup contention. That is strong evidence
that these layers are secondary, not core execution prerequisites.

### 3. Prompt suggestion runs after the main turn and is heavily gated

`src/query/stopHooks.ts` fires `executePromptSuggestion(...)` as a fire-and-
forget background action after a turn, outside bare mode.

`src/services/PromptSuggestion/promptSuggestion.ts` shows that prompt
suggestions are:

- disabled in non-interactive sessions
- disabled for swarm teammates
- disabled in plan mode or while permissions/elicitations are pending
- generated via `runForkedAgent(...)`
- tool-denied via callback
- `skipTranscript`-safe side work rather than part of the main answer path

That makes prompt suggestion a classic sidecar intelligence layer.

### 4. Agent summary is a periodic UI/progress helper for subagents

`src/services/AgentSummary/agentSummary.ts` forks every ~30 seconds to summarize
subagent progress in 3-5 words or a short phrase.

The verified pattern is:

- read the current agent transcript
- filter incomplete tool calls
- fork with `runForkedAgent(...)`
- deny tools
- write summary back to task/app state

`src/tools/AgentTool/AgentTool.tsx` wires summarization into agent lifecycle
when coordinator/fork/progress-summary modes are enabled.

This is progress UX, not core reasoning or tool orchestration.

### 5. Tool-use summary is a best-effort labeler for client-facing progress

`src/services/toolUseSummary/toolUseSummaryGenerator.ts` uses Haiku to turn a
batch of completed tool calls into a short one-line label.

`src/query.ts` yields the pending tool-use summary from the previous turn once
it resolves during current-turn model streaming.

Important characteristics:

- summary generation is asynchronous and non-blocking
- failure returns `null` and does not break the main turn
- output is optimized for mobile/client progress rows, not reasoning quality

This is product-density polish around the runtime, not the runtime itself.

### 6. Tips are contextual shell guidance with analytics feedback

`src/services/tips/tipRegistry.ts` contains a large library of contextual tips
covering settings, memory, plan mode, permissions, plugins, agents, desktop,
mobile, and more.

`src/services/tips/tipScheduler.ts`:

- checks settings to see whether tips are enabled
- asks `getRelevantTips(...)` for context-filtered candidates
- selects the least-recently-shown eligible tip
- records analytics when a tip is shown

This is clearly a product-feel education layer, not execution harness logic.

### 7. MagicDocs is a background documentation-maintenance sidecar

`src/services/MagicDocs/magicDocs.ts` watches file reads for a `# MAGIC DOC:`
header, tracks matching files, and registers a post-sampling hook.

When conditions are met, it:

- rereads the doc
- rebuilds an update prompt
- runs a built-in agent
- only allows edit on the same tracked file

The code also shows it is gated to `USER_TYPE === 'ant'`.

This is a strong example of sidecar intelligence: it uses the runtime and tool
stack, but it is not part of the main conversational harness.

### 8. Common non-core pattern across these layers

Across prompt suggestion, agent summary, tool-use summary, tips, analytics, and
MagicDocs, the code repeatedly uses the same secondary-layer pattern:

- initialize late or defer after first render
- gate aggressively by mode, feature flag, user type, or session type
- run best-effort and avoid taking down the main turn on failure
- write to UI/app state, telemetry, or auxiliary files rather than core turn state
- prefer forked/subagent execution with denied tools when model help is needed

This repeated pattern is the clearest signal that these are non-core layers.

### 9. Boundary note: `autoDream` is adjacent but not central to this packet

`src/query/stopHooks.ts` and `src/utils/backgroundHousekeeping.ts` also wire in
`autoDream`, but its code is closer to memory consolidation and long-horizon
state maintenance than to purely product-feel intelligence.

So, code current state suggests:

- `autoDream` is adjacent infrastructure
- but the clearest CC-07 donor set is prompt suggestion, summaries, tips,
  analytics/experimentation, and MagicDocs-style sidecars

## Secondary-Intelligence Atlas

### Measurement / experiment layer

- analytics sink
- GrowthBook gate/experiment wiring

Purpose: observe, gate, and tune the product without changing the core harness
shape.

### Guidance / suggestion layer

- prompt suggestion
- contextual tips

Purpose: reduce dead air, suggest next moves, and improve perceived smoothness.

### Progress summarization layer

- agent summary
- tool-use summary

Purpose: compress internal activity into readable progress signals for the user
or client surface.

### Background maintenance intelligence layer

- MagicDocs

Purpose: turn conversation context into best-effort upkeep for side documents.

## Donor-Value Note

The strongest donor ideas here are patterns, not vendor-specific modules:

- optional post-turn sidecars
- forked-agent helpers with tools denied
- best-effort summary generation that never owns the main turn
- UI/state-facing assistive layers that can be enabled or suppressed by mode
- contextual suggestion/tip systems that improve perceived flow without touching
  core correctness

The weakest donor targets are:

- analytics vendor implementation details
- experiment framework specifics
- background auto-edit features that take strong ownership of files

## Non-Core Pattern Summary

These layers consistently behave like sidecars rather than harness primitives:

- they can be skipped in bare/non-interactive/restricted modes
- they are often launched from stop hooks or deferred startup paths
- they degrade gracefully on error
- they primarily improve UX density, discoverability, or perceived intelligence
- the main turn can still function without them

For SNC, this is the key separation to preserve.

## SNC Relevance

This packet is directly useful for SNC landing because it shows how to improve
product feel without over-editing host internals.

High-value SNC takeaways:

- prompt suggestion can become a pluggable post-turn helper
- tool-use and worker-progress summaries can make multi-worker flows legible
- contextual tips can help operators discover SNC-specific capabilities
- sidecar intelligence should remain optional and mode-aware

Just as important, the code evidence warns against conflating "feels smart" with
"is the runtime spine." SNC should keep these layers outside the core
orchestration substrate.

## Modification Guidance

### Wrap

- implement SNC secondary intelligence as post-turn hooks, UI helpers, or
  context-engine sidecars
- keep assistive layers switchable by mode, session type, and operator policy
- prefer app-state writes, annotations, or auxiliary outputs over core message
  ownership

### Extend

- add SNC worker-progress summaries for long-running threaded work
- add tool-batch labels for operator visibility
- add opt-in prompt suggestions or contextual reminders for SNC-specific flows

### Defer

- analytics vendor parity
- full experiment/growthbook-style framework parity
- automatic documentation editing unless SNC has a clear file-ownership story

### Do-Not-Touch

- do not wire secondary layers into correctness-critical turn execution
- do not make core SNC orchestration depend on tip/suggestion/summary success
- do not mistake product-feel layers for the runtime harness decisions covered
  elsewhere

## Still-Unverified Questions

- which of these layers are shipped across all Claude Code surfaces versus only
  selected clients or internal builds
- how broadly prompt suggestion and tool-use summary are surfaced outside the
  files inspected here
- whether MagicDocs is widely used or mostly an internal/product experiment
- how much additional closed-source analytics wiring exists beyond the files
  inspected in this pass

