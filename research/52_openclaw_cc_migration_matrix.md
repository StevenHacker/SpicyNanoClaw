# OpenClaw x CC Migration Matrix

## Purpose

This packet synthesizes what is actually migratable now, what should wait, and what is probably not worth importing from CC into SNC given the current OpenClaw deconstruction depth.

It is a dispatcher document, not a donor fan letter.

## Migration Candidate Matrix

| Donor idea | Category | Best OpenClaw seam | SNC read |
| --- | --- | --- | --- |
| Maintained artifact reuse before fresh summary | `Migratable now` | `ContextEngine.afterTurn/maintain/compact` | Best fit. SNC already owns the engine path and can bias delegated compaction with state artifacts. |
| Background sidecars at safe trigger windows | `Migratable now` | `afterTurn`, `maintain`, `session_end`, `agent_end` | Strong fit for state refresh, durable harvest, and low-noise upkeep. |
| Stable replacement decisions across turns | `Migratable now` | `before_message_write`, `tool_result_persist`, plugin-owned ledger | High value for continuity and cache stability; clean hot-plug seam. |
| Local truth vs model-visible projection | `Migratable now` | `assemble` plus write hooks | Strong fit. Keep richer local state, show a shaped working set to the model. |
| Circuit breakers for automatic maintenance | `Migratable now` | SNC-owned scheduler state around `maintain` and sidecars | Low risk and high value. |
| Mode switches over prompt tweaking | `Migratable now` | plugin config, `before_prompt_build`, `assemble` | SNC should expose writing regimes explicitly instead of burying them in one prompt. |
| Layered pressure-relief ladder | `Migratable later` | partial in `assemble/compact` and hooks | Principle is good; exact CC ladder is too tied to CC runtime order. |
| Durable memory harvest + relevance recall loop | `Migratable later` | `session_end` sidecar plus memory/helper surfaces | Worth doing after transcript shaping and state continuity stabilize. |
| Tool/capability deferral like ToolSearch | `Migratable later` | no strong first-class seam yet | Valuable in theory, but OpenClaw's current capability control plane is not yet equally clear. |
| Full compaction ownership | `Migratable later` | `ownsCompaction: true` engine path | Too early because OpenClaw timeout/overflow recovery is asymmetric. |
| Cached microcompact wire-edit path | `Likely not worth migrating` | none cleanly equivalent | Principle matters; CC's exact API-layer cache-edit mechanism does not map well to OpenClaw. |
| Exact ToolSearch `tool_reference` transport model | `Likely not worth migrating` | weak / model-gateway-specific | Too Anthropic-beta-specific for SNC v1 priorities. |
| CC's GrowthBook-heavy `tengu_*` gating model | `Likely not worth migrating` | plugin config could imitate it, but should not | Keep the mode-switch idea, not the remote-flag architecture. |
| Exact SessionMemory markdown-edit workflow | `Likely not worth migrating` | possible, but wrong core abstraction | Preserve maintained-state concept; do not port the exact note-file editing protocol. |

## Best Donor Ideas Usable Now

### 1. Deterministic replacement bookkeeping

Strongest immediate donor.

Why it fits:

- CC shows stable replacement fate across turns is valuable
- OpenClaw already has transcript-write seams
- SNC already has a hook scaffold waiting for real shaping logic

Best current host seams:

- `before_message_write`
- `tool_result_persist`
- plugin-owned replacement ledger

### 2. Maintained-artifact-first compaction

Strong donor and already partially aligned with SNC.

Why it fits:

- CC prefers maintained artifacts before fresh summary
- SNC already has session-state
- SNC already biases delegated compaction through `customInstructions`

### 3. Safe-window sidecars

Strong donor.

Why it fits:

- CC runs memory maintenance outside the main turn
- OpenClaw already exposes `afterTurn`, `maintain`, `session_end`, and other lifecycle windows

### 4. Local truth vs model-visible projection

This should become a hard SNC design rule.

Read:

- local state can be richer
- model-visible projection should be shaped and bounded
- write-time transcript shaping and assemble-time projection are different layers

### 5. Circuit breakers for maintenance

Simple but important.

If SNC adds more automatic shaping/sidecars, it needs a bounded failure ceiling rather than retrying forever.

## Blocked Ideas Pending More Host Clarity

### Full pressure ladder

The principle is good, but exact runtime ordering is blocked by current OpenClaw recovery asymmetry between timeout and overflow compaction paths.

### Full compaction ownership

Blocked for the same reason.

SNC can guide compaction now, but taking `ownsCompaction: true` would force SNC to absorb host recovery and side-effect duties that are not yet safe to mirror.

### Tool/capability deferral in the ToolSearch sense

Blocked because OpenClaw does not yet show an equally strong first-class deferred schema-exposure plane.

### CC-style memory presentation regimes

The regime idea is usable.
The exact prefetch + injection + extraction package should wait until SNC transcript shaping and durable memory direction are chosen more deliberately.

## Likely Not Worth Migrating

- CC's exact cached-microcompact API-edit path
- CC's exact `tool_reference` transport model
- CC's `tengu_*` remote-flag sprawl
- CC's exact SessionMemory markdown-note editing workflow
- CC product-shell-specific stop-hook extras

## Recommended Next Implementation Frontier

Implement deterministic transcript shaping as SNC's first real hook layer.

Concrete read:

1. Make `before_message_write` real, not scaffold-only.
2. Use it to rewrite or collapse assistant planning/meta chatter into stable bounded forms.
3. Add a plugin-owned replacement ledger keyed by message/tool identity.
4. Pair that ledger with `tool_result_persist` so replacement fate is frozen across turns.
5. Keep `ContextEngine.assemble/afterTurn/maintain/compact` as the continuity spine.
6. Keep `ownsCompaction: false`.
7. Add a simple circuit breaker around automatic rewrites and sidecars.

## Dispatcher Takeaway

The bridge is now much clearer:

- OpenClaw gives us the hot-pluggable seams
- CC gives us the harness ideas
- the best near-term intersection is deterministic shaping + maintained-state reuse + safe-window sidecars

That is the current best path toward SNC becoming an OpenClaw enhancement rather than a host fork.
