# CC Harness Patterns

## Purpose

This file does **not** try to restate the entire CC architecture.

Its job is narrower:

- identify the CC mechanisms that behave like harness design
- separate those from ordinary feature logic
- judge which ones are actually valuable for SNC

Here, "harness" means runtime control logic that shapes:

- what the model sees
- when auxiliary processes run
- how much context/noise is allowed through
- how the system avoids instability under pressure

## What Currently Looks Most Valuable

### 1. Layered Pressure-Relief Ladder

### Confirmed shape

CC does not jump straight to full compaction when context pressure rises.
It runs a staged ladder of increasingly invasive controls:

1. aggregate tool-result budget enforcement
2. snip
3. microcompact
4. context collapse
5. autocompact

### Why this is harness

This is not "one compact feature."
It is a host-level control strategy that preserves granular context whenever lighter interventions already solved the pressure problem.

### Why SNC should care

Long-form writing is especially sensitive to premature summarization.
This ladder is one of the strongest CC ideas because it says:

- compress the cheapest junk first
- keep structure if possible
- only summarize when lower-cost hygiene failed

### Portability read

High.
This looks much more portable than most CC prompt text because it is mainly runtime ordering and threshold discipline.

### Evidence

- `src/query.ts:369-467`
- `src/services/compact/microCompact.ts`
- `src/services/compact/autoCompact.ts`

## 2. Stable Replacement Decisions Across Turns

### Confirmed shape

CC keeps a per-conversation `ContentReplacementState` that freezes tool-result replacement decisions.
Once a tool result has been seen and either replaced or left alone, later passes preserve that same fate.

### Why this is harness

This is not just storage.
It is a determinism layer for prompt-cache stability and for making repeated runtime passes produce byte-stable outcomes.

### Why SNC should care

SNC will likely need repeated context shaping over long writing sessions.
If the host keeps changing what gets rewritten or replaced on each turn, cache stability and narrative continuity will both suffer.

### Portability read

High.
This principle is more important than the exact CC implementation details.

### Evidence

- `src/utils/toolResultStorage.ts:367-478`
- `src/utils/toolResultStorage.ts:924-1007`

## 3. Separate Local State From Wire State

### Confirmed shape

CC sometimes edits what is sent to the API without rewriting local message history in the same way.

Examples:

- cached microcompact deletes old tool results at the API layer while leaving local messages unchanged
- aggregate tool-result budgeting groups messages the same way API normalization will merge them
- persisted large outputs are replayed through exact replacement strings instead of re-derived previews

### Why this is harness

This is a host/runtime mapping discipline:

- preserve one internal state for product logic
- project a different transport view when talking to the model

That is much more architectural than "truncate this message."

### Why SNC should care

For writing systems, local truth and model-visible truth should not be assumed identical.
SNC will probably need its own projected working context without corrupting the richer internal state used for persistence, diagnostics, or future rebuilds.

### Portability read

High, but dangerous.
The principle is excellent; the implementation must be handled carefully because local/wire drift can create debugging pain if not explicitly tracked.

### Evidence

- `src/services/compact/microCompact.ts:295-399`
- `src/utils/toolResultStorage.ts:372-388`
- `src/utils/toolResultStorage.ts:575-620`

## 4. Background Sidecars With Safe Trigger Windows

### Confirmed shape

CC does not let every maintenance task run inline in the main turn path.
Instead it uses bounded sidecars with explicit trigger timing:

- `SessionMemory` updates via post-sampling hook at safe breakpoints
- `extractMemories` runs from stop hooks after the query loop is truly done
- session-memory compaction waits for in-flight extraction before reusing the summary

### Why this is harness

This is host orchestration.
The core idea is not "have memory," but "run maintenance at safe times, with explicit coordination, without polluting the main turn."

### Why SNC should care

SNC will need state upkeep, long-memory harvesting, maybe style-state refresh, maybe chapter-state rollups.
CC's strongest lesson is that these should be scheduler decisions, not just more prompt instructions.

### Portability read

Very high.
This is one of the best donor ideas from CC for SNC.

### Evidence

- `src/services/SessionMemory/sessionMemory.ts`
- `src/services/extractMemories/extractMemories.ts`
- `src/services/compact/sessionMemoryCompact.ts:514-620`

## 5. Reuse Maintained Artifacts Before Generating New Summaries

### Confirmed shape

When autocompact fires, CC first tries `SessionMemory` compaction.
That means it prefers reusing an already-maintained session summary instead of always asking the model to generate a fresh compaction summary from scratch.

### Why this is harness

This is not a better prompt.
It is a host policy that says runtime-maintained state should be treated as a first-class artifact in later recovery paths.

### Why SNC should care

This is almost directly aligned with long-form writing continuity.
If SNC maintains chapter/scene/current-state artifacts, then compaction should ideally reuse them rather than reconstruct continuity under pressure.

### Portability read

Very high.
This is likely one of the clearest CC-to-SNC transfers.

### Evidence

- `src/services/compact/autoCompact.ts:287-309`
- `src/services/compact/sessionMemoryCompact.ts:526-600`

## 6. Automatic Maintenance Needs Circuit Breakers

### Confirmed shape

CC tracks consecutive autocompact failures and stops retrying after a bounded threshold.
This prevents irrecoverable sessions from repeatedly burning turns on doomed compaction attempts.

### Why this is harness

This is self-protection for the host.
It is not a product feature so much as a guard against runaway automation loops.

### Why SNC should care

Any SNC layer that auto-summarizes, auto-refreshes anchors, or auto-harvests memory will need failure ceilings.
Without this, long writing sessions can degrade into repeated corrective work instead of actual authoring.

### Portability read

Very high.
This is generic host hygiene and should travel well.

### Evidence

- `src/services/compact/autoCompact.ts:257-265`
- `src/services/compact/autoCompact.ts:334-349`

## 7. Delay Capability Exposure Until Needed

### Confirmed shape

CC does not always expose every tool schema inline.
It can defer tools, especially MCP/workflow-specific ones, and use `ToolSearch` to:

- discover tools by exact name / prefix / keyword
- return `tool_reference` blocks instead of dumping all schemas inline
- auto-enable or suppress the mode based on model support, gateway constraints, and threshold checks

### Why this is harness

This changes the host's capability-supply model.
It is not "a search feature"; it is a control plane for how much callable surface is visible to the model at once.

### Why SNC should care

Writing-specialized assistants usually do not need the full operational tool surface on every turn.
A delayed capability model could help SNC keep the writing context clean while still retaining deep tooling for exceptional cases.

### Portability read

Medium-high.
The principle is strong, but SNC must be careful not to hide writing-critical tools behind extra round trips.

### Evidence

- `src/tools/ToolSearchTool/prompt.ts`
- `src/tools/ToolSearchTool/ToolSearchTool.ts`
- `src/utils/toolSearch.ts`

## 8. Mode Switches Matter More Than Prompt Tweaks

### Confirmed shape

Some CC behavior changes that look small from the outside are actually cross-cutting runtime mode switches.
The clearest example so far is `tengu_moth_copse`, which affects:

- relevant-memory prefetch activation
- baseline memory-file injection
- `loadMemoryPrompt()` index behavior
- extract-memory prompt shape

### Why this is harness

This is a reminder that important product behavior may be controlled by host mode selection, not by one prompt block.
The system is choosing between different memory presentation regimes.

### Why SNC should care

SNC should avoid framing major context-policy changes as "just tweak the prompt."
The better framing is likely:

- choose a mode
- route the runtime accordingly
- keep the prompt as only one component of that mode

### Evidence

- `src/utils/attachments.ts:2361-2395`
- `src/utils/claudemd.ts:1135-1149`
- `src/memdir/memdir.ts:419-489`
- `src/services/extractMemories/extractMemories.ts:362-369`

## Current Ranking For SNC

### Tier A: strongest donor ideas

- layered pressure-relief ladder
- background sidecars with safe trigger windows
- reuse maintained artifacts before generating fresh summaries
- automatic maintenance circuit breakers

### Tier B: strong but needs host-shape adaptation

- stable replacement decisions across turns
- local-state / wire-state separation
- delayed capability exposure

### Tier C: important framing lesson

- mode switches matter more than prompt tweaks

## Current Bottom Line

The most valuable CC contribution is **not** a single memory module or a single prompt file.

The deeper donor value is the harness philosophy:

- treat context pressure as a staged control problem
- treat maintenance as scheduled side work
- treat reused state artifacts as first-class runtime assets
- treat automatic recovery as something that needs guards
- treat model-visible capability/context surface as actively managed, not passively dumped

That is the part most worth carrying into SNC.
