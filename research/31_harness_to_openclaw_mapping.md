# CC Harness -> OpenClaw Mapping

## Purpose

This file is the bridge between:

- `research/30_harness_patterns_cc.md`
- the OpenClaw host/plugin/context-engine seam read
- SNC landing decisions

It is deliberately conservative.

The question here is **not** "is a CC idea interesting?"

The question is:

- can SNC carry it into OpenClaw cleanly
- can it stay hot-pluggable
- and is it worth doing for writing quality

## Mapping Rule

Each pattern is judged by four filters:

1. best-fit OpenClaw seam
2. whether that seam is truly hot-pluggable
3. what breaks if we copy it too literally
4. whether SNC should adopt, adapt, or defer it

## Pattern Mapping

| CC harness idea | Best OpenClaw seam | Portability read | SNC read |
| --- | --- | --- | --- |
| Layered pressure-relief ladder | `ContextEngine.compact/assemble/afterTurn/maintain`; secondarily `tool_result_persist` and `before_message_write` for lighter hygiene | Medium-low for the full CC shape. OpenClaw hooks can observe or trim around compaction, but a true multi-stage ladder likely needs SNC to own the `contextEngine` slot, and maybe later host-level ordering changes if pre-compaction stages must happen earlier than current runtime flow. | Adapt, do not copy literally in v1. SNC should borrow the principle "compress cheapest junk first", but not begin by rebuilding the whole CC ladder. First value is likely deterministic transcript shaping plus state-aware compaction reuse. |
| Stable replacement decisions across turns | `tool_result_persist`; `before_message_write`; optional SNC-owned bookkeeping outside the transcript | High. OpenClaw already separates tool-result persistence from general message-write interception, so SNC can freeze replacement decisions and keep repeated turns deterministic without patching host internals. | Adopt early. This is one of the cleanest writing-safe harness imports because it improves cache stability and continuity without forcing a new model of the runtime. |
| Separate local state from wire state | `ContextEngine.assemble` for model-visible projection; `before_message_write` and `tool_result_persist` for stored transcript shape | High in principle, medium for one-to-one CC behavior. OpenClaw already has the right separation surfaces, but not the exact same API-layer cache-edit path as CC. | Adopt as a design rule. SNC should keep richer local truth than what the model sees, especially for long-form writing state and transcript diagnostics. |
| Background sidecars with safe trigger windows | `agent_end`; `session_end`; if SNC owns the engine, also `afterTurn` / `maintain` | High. OpenClaw already supports end-of-run hooks, session lifecycle hooks, and engine post-turn maintenance. `memory-lancedb` proves plugin-side recall/capture scheduling is real rather than theoretical. | Adopt early. This is a strong fit for SNC state refresh, long-memory harvesting, style-state upkeep, and chapter/scene artifact maintenance. |
| Reuse maintained artifacts before generating new summaries | SNC-owned `ContextEngine.afterTurn/maintain/compact`; supporting hook signals from `before_compaction` / `after_compaction` | High if SNC owns the `contextEngine` slot; weak otherwise. OpenClaw's current host shape already supports maintained artifacts, but the best reuse path sits inside the engine lifecycle rather than in detached hook subscribers. | Adopt, and treat it as a major reason for SNC to own the `contextEngine` slot. This is one of the most SNC-aligned CC ideas. |
| Circuit breakers for automatic maintenance | SNC plugin-side scheduler state; `agent_end`; `session_end`; engine maintenance state if SNC owns context engine | High. The guard logic itself is easy to carry over. The main caveat is lifecycle asymmetry: timeout and overflow compaction do not currently feed identical immediate maintenance signals. | Adopt early, but keep the breaker in SNC-owned state rather than assuming host compaction callbacks are symmetric. |
| Delay capability exposure until needed | No strong first-class seam found yet. Closest current surfaces are `registerTool`, `before_tool_call`, and prompt shaping. | Low-medium. OpenClaw evidence so far shows call-time interception, not a CC-style ToolSearch/control-plane for schema exposure. | Defer for v1. This is valuable in general, but it is not yet the cleanest path to writing quality, and the host seam looks weaker than for memory/state work. |
| Cross-cutting mode switches matter more than prompt tweaks | plugin config + `registerMemoryPromptSection`; `before_prompt_build` / `before_agent_start`; `ContextEngine.assemble` `systemPromptAddition` | High. OpenClaw already exposes multiple points where SNC can switch regimes without editing the host. | Adopt early. SNC should likely ship explicit writing modes or state regimes instead of one monolithic prompt/persona. |

## What This Changes For SNC

### 1. SNC should probably own the `contextEngine` slot

Not because every CC idea needs a new engine.

Because the most SNC-aligned donor patterns do:

- reuse maintained artifacts
- project a model-visible working context distinct from stored transcript truth
- attach a stronger current-state anchor than OpenClaw default memory-core provides

This is still hot-pluggable in the OpenClaw sense.
It does **not** imply editing host internals first.

### 2. SNC v1 should avoid copying CC's whole pressure stack

The biggest risk right now is overfitting to CC's exact runtime order.

What SNC should borrow first is the policy:

- reduce noise before summary
- prefer maintained state over fresh reconstruction
- make repeated shaping deterministic
- keep maintenance bounded and failure-aware

That gives most of the value without immediately fighting OpenClaw's current runtime order.

### 3. The best early SNC package shape is no longer "just a better memory plugin"

The stronger current read is:

- SNC core plugin owns `contextEngine`
- SNC also uses lifecycle hooks
- SNC may optionally expose supporting tools or memory-facing helpers

That is a broader package than memory-core, but it still matches OpenClaw's plugin/slot model better than host surgery.

## Current Landing Read

### Tier A: should directly inform SNC v1

- stable replacement decisions
- local truth vs model-visible projection
- background sidecars
- maintained-artifact reuse
- circuit breakers
- mode switches

### Tier B: worth partial carry-over

- pressure-relief ladder, but only as a principle first

### Tier C: likely later or optional

- delayed capability exposure in the CC ToolSearch sense

## Main Risk To Watch

The cleanest SNC architecture is now pulling toward:

- a slot-bearing core plugin that owns `contextEngine`
- plus auxiliary hook behavior

That is still hot-pluggable, but it is not the same thing as "tiny plugin that leaves all host orchestration untouched."

So the remaining design question is no longer "can SNC stay pluggable?"

It is:

- how much SNC should centralize inside its own plugin-owned engine
- while still preserving OpenClaw host defaults that are already good enough
