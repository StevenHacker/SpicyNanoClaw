# SNC v1 Host Shape

## Purpose

This note turns the current seam read into a narrower engineering read:

- if SNC owns the OpenClaw `contextEngine` slot
- what is the smallest useful v1 host shape
- which behavior should stay in hooks instead of being forced into the engine

This is not the final implementation memo.

It is the first bounded landing read.

## What OpenClaw Requires From A Context Engine

From `src/context-engine/types.ts`, a real engine must implement at least:

- `info`
- `ingest(...)`
- `assemble(...)`
- `compact(...)`

Optional lifecycle capabilities include:

- `bootstrap(...)`
- `maintain(...)`
- `afterTurn(...)`
- `ingestBatch(...)`

The stock `legacy` engine proves this contract can be minimal:

- `ingest` is a no-op
- `assemble` is pass-through
- `afterTurn` is a no-op
- `compact` delegates back to runtime

So "owning the slot" does **not** automatically mean SNC must replace all host behavior on day one.

## What SNC v1 Likely Needs

### Engine-owned on day one

#### 1. `assemble(...)`

This is the key SNC surface.

Why:

- SNC needs stronger control over the model-visible working set
- SNC likely needs a current-state anchor stronger than OpenClaw default memory-tool guidance
- SNC needs local truth vs model-visible projection

This is where SNC can:

- order the active working context
- inject a writing-state anchor
- selectively surface maintained artifacts
- keep noisy transcript history out of the model-visible turn

#### 2. `compact(...)`

SNC likely needs to own compaction policy at least partially, even if early versions still reuse host machinery under the hood.

Why:

- maintained-artifact reuse is one of the strongest CC donor patterns
- if SNC wants compaction to prefer canonical state artifacts over fresh reconstruction, the best seam is the engine lifecycle itself

The v1 read is not "rewrite all compaction."
It is:

- own the decision layer
- reuse host behavior where possible
- stop compaction from being blind to SNC state artifacts

### Strongly recommended in v1

#### 3. `afterTurn(...)`

If SNC wants stable writing continuity, `afterTurn` is the cleanest place to maintain canonical state after a successful turn.

This is where SNC can update:

- current writing state
- scene/chapter continuity notes
- active intent / objective state

without stuffing that logic into the main model turn.

#### 4. `maintain(...)`

This is strongly recommended because OpenClaw already gives engines a runtime-owned safe transcript rewrite helper.

That makes `maintain(...)` the right place for:

- deterministic transcript shaping
- bounded cleanup passes
- canonicalization after compaction or turn completion

This also aligns well with circuit-breaker style automation.

## What Should Stay Hook-Driven In v1

### `tool_result_persist`

Use for deterministic persistence decisions and tool-result shrinking before transcript write.

This is a better fit than engine logic because it acts at the exact persistence boundary.

### `before_message_write`

Use for final transcript shaping and selective write blocking or replacement.

This is the cleanest hook for keeping stored history cleaner than raw tool chatter.

### `agent_end` / `session_end`

Use for sidecars that do not need to sit inside the core engine loop.

Examples:

- durable memory harvesting
- analytics
- slow background classification
- style-state refresh that can tolerate delayed application

### `before_prompt_build` / `before_agent_start`

Use for regime or mode overlays that do not justify engine ownership by themselves.

This keeps SNC mode switching flexible without putting every policy toggle into engine code.

## Current Minimal Package Read

### SNC core plugin

Likely responsibilities:

- register `contextEngine`
- own current-state assembly
- own compaction policy around SNC artifacts
- maintain canonical writing-state artifacts after successful turns

### SNC helper hooks

Likely responsibilities:

- deterministic transcript shaping
- tool-result persistence control
- background harvesting / maintenance sidecars
- optional mode overlays

### Optional SNC helpers later

- custom tools for inspecting SNC state
- durable writing-memory helpers
- author-facing commands

## What SNC v1 Probably Should Not Do

### 1. Rebuild CC's whole pressure stack first

The host already has compaction paths.
The first value is better state ownership and cleaner projection, not reproducing every CC ladder stage immediately.

### 2. Force all sidecars into the context engine

Some maintenance belongs there.
Not all background work does.

If SNC puts every asynchronous concern into engine lifecycle methods, the engine becomes harder to reason about and more fragile under timeout/overflow asymmetry.

### 3. Start by editing OpenClaw internals

Current evidence still says plugin + slot + hook delivery is sufficient for the first serious SNC shape.

Host edits should remain reserved for:

- proven lifecycle blockers
- proven ordering blockers
- or proven missing seam problems

## Current Bounded Read

If forced to define the current smallest meaningful SNC host shape, it looks like this:

1. one SNC plugin package
2. that package owns the `contextEngine` slot
3. its engine does:
   - `assemble`
   - `compact`
   - `afterTurn`
   - `maintain`
4. the same package also installs:
   - `tool_result_persist`
   - `before_message_write`
   - `agent_end`
   - `session_end`
5. OpenClaw internals remain untouched unless later evidence shows the host ordering blocks SNC quality goals

That is the first host shape that currently looks both:

- strong enough to matter for writing continuity
- conservative enough to preserve OpenClaw as the host
