# SNC Durable Memory V1 Design

## 1. Problem / subsystem

SNC already has a short-horizon continuity layer:

- `extensions/snc/src/session-state.ts` persists session-local structured state
- `extensions/snc/src/engine.ts` reinjects that state during `assemble(...)`
- `maintain(...)` and compaction guidance already operate on bounded transcript/session artifacts

What SNC still does not have is a true durable layer that survives beyond one session snapshot and can resurface stable writing facts later without turning the host into a memory fork.

So the v1 problem is not "build a general memory system".
The v1 problem is:

1. harvest a small set of durable writing facts from SNC's existing structured artifacts
2. store them outside the per-session snapshot
3. project only a few relevant durable cues back into future turns
4. keep the whole layer hot-pluggable and host-safe

This packet is design-grade, not generic intuition. It builds directly on:

- `research/55_oc07_memory_recall_substrate.md`
- `research/61_cc06_memory_mode_feature_matrix.md`
- current SNC working-host code under `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc`

## 2. Main entry files

### Current SNC baseline

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/config.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/hook-scaffold.ts`

### OpenClaw host seams

- `data/external/openclaw-v2026.4.1/src/plugins/api-builder.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/memory-state.ts`
- `data/external/openclaw-v2026.4.1/src/agents/system-prompt.ts`
- `data/external/openclaw-v2026.4.1/src/agents/memory-search.ts`
- `data/external/openclaw-v2026.4.1/src/auto-reply/reply/memory-flush.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/registry.dual-kind-memory-gate.test.ts`
- `data/external/openclaw-v2026.4.1/extensions/memory-core/index.ts`
- `data/external/openclaw-v2026.4.1/extensions/memory-core/src/flush-plan.ts`
- `data/external/openclaw-v2026.4.1/extensions/memory-core/src/memory/manager.ts`
- `data/external/openclaw-v2026.4.1/extensions/memory-lancedb/index.ts`

### CC donor evidence

- `data/external/claude-code-leeyeel-4b9d30f/src/context.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/constants/prompts.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/attachments.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/extractMemories/extractMemories.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/query/stopHooks.ts`

## 3. Verified structure / mechanisms

## 3.1 SNC already has the right short-horizon substrate

Current working-host code shows:

- `engine.ts` persists session state in `afterTurn(...)`
- `engine.ts` reinjects session snapshot through `systemPromptAddition`
- `engine.ts` keeps `ownsCompaction: false` and delegates host compaction
- `engine.ts` already adds bounded compaction instructions from SNC state
- `session-state.ts` already stores:
  - `storyLedger.userDirectives`
  - `storyLedger.assistantPlans`
  - `storyLedger.continuityNotes`
  - `storyLedger.events`
  - `chapterState.focus`
  - `chapterState.latestUserDirective`
  - `chapterState.latestAssistantPlan`
  - `chapterState.constraints`
  - `autoCompactionSummary`

This matters because durable memory v1 should sit on top of existing structured SNC artifacts, not restart from raw transcript mining.

## 3.2 OpenClaw memory is already split into separate ownership planes

Host code and the accepted OC-07 packet show that OpenClaw separates:

1. prompt-visible memory presentation
2. tool-mediated recall
3. freshness/index sync
4. durable writeback

Direct code evidence:

- `api-builder.ts` exposes `registerMemoryPromptSection`, `registerMemoryFlushPlan`, `registerMemoryRuntime`, and `registerMemoryEmbeddingProvider`
- `memory-state.ts` stores prompt builder, flush resolver, and runtime as separate registrations
- `extensions/memory-core/index.ts` registers prompt section, flush plan, runtime, and tools
- `extensions/memory-core/src/flush-plan.ts` hard-codes the canonical append-only target pattern `memory/YYYY-MM-DD.md`
- `extensions/memory-core/src/memory/manager.ts` owns watcher/interval/session sync lifecycle and targeted `sessionFiles` sync
- `extensions/memory-lancedb/index.ts` proves a different memory plugin can use a hook-heavy shape with `memory_recall`, `memory_store`, `memory_forget`, `before_agent_start`, and `agent_end`

Implication:
OpenClaw already gives SNC memory seams, but those seams are not one blob and the active memory lane is slot-shaped.

## 3.3 Slot coupling is real, so "just make SNC a dual-kind plugin" is not a free move

`src/plugins/registry.dual-kind-memory-gate.test.ts` shows:

- a plugin with `kind: ["memory", "context-engine"]` cannot register memory runtime unless it is selected for the memory slot
- if it is not selected for the memory slot, memory registration is blocked and a warning is emitted

Implication:
combining SNC's current context-engine ownership with memory-slot ownership in one plugin is possible in theory, but it adds slot-selection coupling immediately.

That makes an all-in-one memory takeover a worse v1 move than it first appears.

## 3.4 CC's strongest donor pattern is separation of baseline, recall, and extraction

CC code and the accepted CC-06 packet show:

- `context.ts` and `constants/prompts.ts` supply baseline memory injection/prompt mechanics
- `utils/attachments.ts` supplies `relevant_memories` attachments as a separate runtime recall path
- `services/extractMemories/extractMemories.ts` and `query/stopHooks.ts` keep extraction as a sidecar/background write path

Implication:
the strongest donor is not "copy MEMORY.md".
The strongest donor is:

1. stable baseline continuity surface
2. separate selective recall surface
3. slower background harvest/write surface

SNC should borrow that shape, not CC's literal product mechanics.

## 3.5 Current SNC state is usable, but not all fields are durable-safe

`session-state.ts` still computes `latestUserDirective` and `latestAssistantPlan` by best-match selection, not by a strict recency ledger.

Implication:

- `storyLedger` and event history are stronger promotion evidence than a single `latest*` field
- `recentMessages` are session steering material, not durable memory
- raw assistant plans should not be promoted directly into durable truth in v1

## 4. Recommended durable memory v1 design

## 4.1 Core shape

The recommended v1 is:

1. keep `extensions/snc` as the context-engine owner
2. do not take memory-slot ownership in v1
3. add an SNC-owned durable-memory sidecar inside the same plugin package
4. store durable entries under SNC's own `stateDir`
5. project a bounded durable-memory section during `assemble(...)`
6. treat host memory-runtime integration as a later adapter, not a v1 dependency

This is the most host-safe path because it avoids:

- dual-kind slot coupling
- dependence on which memory plugin is currently selected
- premature takeover of `memory-core` or `memory-lancedb` semantics

## 4.2 Three planes

### Plane A: harvest

Primary source of truth:

- `storyLedger.userDirectives`
- `storyLedger.continuityNotes`
- `storyLedger.events`
- `chapterState.constraints`
- `chapterState.focus`
- `autoCompactionSummary`

Primary trigger:

- `session_end`

Why:

- current SNC already persists session state incrementally in `afterTurn(...)`
- `session_end` is already a real hook target in current config/hook scaffolding
- this keeps durable promotion off the critical path of every turn

Fallback upkeep window if `session_end` proves unreliable in some modes:

- bounded maintenance-time harvest

Not recommended as the default v1 trigger:

- every-turn durable writes

### Plane B: store

Recommended canonical path family:

- `stateDir/durable-memory/catalog.json`
- `stateDir/durable-memory/entries/<entry-id>.json`

Recommended v1 record shape:

```ts
type SncDurableMemoryEntry = {
  version: 1;
  id: string;
  category: "directive" | "constraint" | "continuity" | "fact";
  text: string;
  tags: string[];
  strength: "explicit-user" | "repeated" | "derived";
  firstCapturedAt: string;
  lastConfirmedAt: string;
  confirmationCount: number;
  evidence: Array<{
    sessionId: string;
    sessionKey?: string;
    source: "story-ledger" | "chapter-state" | "auto-compaction-summary";
  }>;
};
```

Why this store is preferred in v1:

- it matches SNC's existing JSON-based artifact style
- it stays independent from whichever OpenClaw memory plugin is active
- it avoids coupling durable-memory correctness to `memory-core` file naming rules or `memory-lancedb` tool contracts

### Plane C: projection

Projection should happen inside SNC `assemble(...)`, not through a new tool runtime in v1.

Recommended prompt shape:

- a dedicated bounded section such as `Durable memory cues`

Recommended projection inputs:

- latest user turn text
- current `chapterState.focus`
- current constraints
- current continuity notes

Recommended scorer:

- lexical overlap with entry text/tags
- category bonus for directives/constraints
- confirmation-count bonus
- recency bonus

Recommended limits:

- top `3-5` entries only
- strict byte cap
- no projection when the score floor is weak

This keeps projection closer to "relevant reminders" than "memory dump".

## 4.3 Promotion rules

Promotable in v1:

- stable user-authored directives
- recurring style/voice/POV/continuity constraints
- reinforced continuity facts
- project facts that recur across sessions or are confirmed by compaction summaries

Not durable by default:

- `recentMessages`
- raw assistant planning chatter
- one-turn operational instructions
- hook-owned tool-result previews
- a single `latestAssistantPlan` with no reinforcement

Promotion threshold:

- explicit user instruction, or
- repeated appearance across harvested states, or
- continuity note reinforced by later evidence

This keeps durable memory closer to confirmed continuity than to speculative extraction.

## 4.4 OpenClaw host fit

The recommended host fit is deliberately conservative:

- SNC keeps owning only the `contextEngine` slot in v1
- SNC does not call `registerMemoryRuntime(...)` in v1
- SNC does not take over `memory-core` backend choice, sync policy, or flush-plan semantics
- SNC does not depend on `memory-lancedb` hook/tool semantics

Why this is the right fit:

1. the host already exposes memory seams, but they are slot-shaped and backend-sensitive
2. `memory-core` and `memory-lancedb` do not expose the same operational contract
3. dual-kind memory registration introduces immediate slot-selection coupling
4. current SNC value comes from writing continuity quality, not from shipping a second host-wide indexer

If later evidence shows SNC needs deeper host integration, the cleaner next step is:

- a companion SNC memory adapter/plugin, or
- an explicit export bridge into the selected host memory lane

Not a stealth takeover of memory ownership inside the current context-engine plugin.

## 4.5 CC donor fit

What SNC should borrow from CC:

- keep baseline continuity projection separate from selective recall
- keep harvest/write as a sidecar
- surface only a few relevant memory items
- treat mode changes explicitly rather than letting memory presentation sprawl

What SNC should not copy literally:

- `MEMORY.md` as the primary abstraction
- `relevant_memories` attachments as a required v1 feature
- GrowthBook/feature-flag sprawl
- helper-model ranking as the first retrieval strategy

Best translation into SNC:

- short-horizon session snapshot remains the baseline continuity layer
- durable memory becomes a narrower, slower, confirmed-memory layer
- selective projection inside `assemble(...)` plays the role that CC separates into baseline + runtime recall, but in a smaller and more host-safe form for v1

## 5. SNC relevance

This design directly serves SNC landing because it gives a next-step memory layer that can be built in the current working host copy without reopening host ownership questions.

It turns the current SNC stack into a clean ladder:

1. `session-state` for short-horizon continuity
2. durable-memory sidecar for slower confirmed continuity
3. bounded projection during `assemble(...)`
4. optional host-memory adapter later if the dataset or UX demands it

This is stronger than staying session-only, but safer than taking over OpenClaw memory internals now.

## 6. Modification guidance

### Wrap

- harvest durable candidates from existing SNC session artifacts
- use `session_end` as the primary durable-write trigger
- read durable store during `assemble(...)`
- project bounded durable cues into `systemPromptAddition`
- gate the whole feature in SNC plugin config

### Extend

- current `stateDir` ownership
- current session-state schema as v1 evidence source
- current context-engine projection path
- current bounded maintenance/compaction-aware behavior

### Keep hot-pluggable

- storage stays under SNC-owned paths
- projection stays inside SNC plugin logic
- no OpenClaw core patch is required
- no host memory slot takeover is required
- no global workspace memory format is imposed by SNC v1

### Explicitly deferred

- registering an SNC memory runtime in v1
- dual-kind `["context-engine", "memory"]` ownership by the current SNC plugin
- taking over `memory-core` search-manager internals
- taking over `memory-core` flush-plan semantics
- depending on `memory-lancedb` as the primary host lane
- vector/embedding-backed SNC retrieval
- helper-model ranking or CC-style side-query retrieval
- tool-facing CRUD APIs for durable memory
- team/shared memory
- remote sync or cross-workspace sync
- every-turn durable harvesting by default
- host compaction ownership

### Do-not-touch unless later evidence forces it

- `src/plugins/memory-state.ts` ownership model
- `extensions/memory-core/src/memory/manager.ts` lifecycle internals
- `extensions/memory-core/src/flush-plan.ts` canonical host rules
- `extensions/memory-lancedb/index.ts` plugin contract
- OpenClaw slot-selection behavior itself

## 7. Still-unverified questions

1. Does `session_end` fire reliably enough across all SNC usage modes, or will v1 need a bounded fallback harvest trigger?
2. Is the current `session-state` schema stable enough for durable promotion, or does it need a small schema pass first, especially around event categorization?
3. Should durable continuity split into two categories in v1.1:
   - writing preferences / directives
   - story-world / canon facts
4. After v1 lands, is a companion adapter into the active host memory lane worth the extra complexity, or is local projection enough for the foreseeable dataset size?
5. Are there usage modes where prompt-only durable projection is insufficient and a helper-tool lane becomes necessary sooner than expected?

## 8. Conclusion

The strongest current read is:

1. durable memory v1 should be SNC-owned, but not memory-slot-owned
2. v1 should harvest from existing SNC session artifacts, store locally under `stateDir`, and project selectively during `assemble(...)`
3. host memory-runtime takeover should stay deferred until the current plugin-local layer proves too small

That is the cleanest evidence-backed path from today's SNC baseline to a real durable continuity layer.
