# SNC Next-Step Plan

## Current Starting Point

We now have four things at once:

1. a validated architectural direction for SNC
2. a real incoming plugin baseline
3. a local OpenClaw host workspace where that plugin has been revalidated
4. a git repo for ongoing development

That changes the mode of work.

We are no longer in pure research cold start.
We are now in:

- research-guided implementation planning
- with a live baseline that can be iterated on

## Git Reality Right Now

Current repo state:

- repo root: `C:\Users\Administrator\Documents\codex_project_1`
- current branch: `codex/snc-next-step`
- remote: `origin` -> `git@github-stevenhacker:StevenHacker/SpicyNanoClaw.git`
- SSH auth: verified with successful remote read
- worktree: already dirty with research, data, scripts, and other project files

Implication:

- SNC work should not be mixed casually into the current root history without a branch and commit discipline
- baseline import, tooling/bootstrap, and feature work should be split into separate commit layers

## Status Since This Plan Was Written

What is now already true:

- the canonical OpenClaw development copy exists at:
  - `data/working/openclaw-v2026.4.1-snc-v1`
- the colleague plugin baseline has been locally revalidated there
- the first `session-state` quality pass has already landed
- the first minimal safe `maintain()` slice has already landed
- the first compaction-aware guidance slice has already landed
- the first disabled-by-default hook scaffold has already landed
- focused SNC tests are green again after aligning the engine expectation to the tighter extraction contract

Practical implication:

- the execution order still holds
- but the immediate target has advanced from "first SNC-aware compaction reuse" to "deciding how much deeper phase 4 should go before hook/memory expansion"
- the immediate hook question is now behavior design, not surface creation

## Recommended Development Order

### Phase 1. Baseline Stabilization

Goal:

- turn the colleague plugin from "validated incoming artifact" into the canonical local development base

Primary tasks:

- choose the canonical host workspace for SNC development
- preserve the validated `OpenClaw + SNC` development copy
- add one or two repeatable validation commands for:
  - SNC tests
  - workspace typecheck with 8 GB Node heap
- capture exact bootstrap notes for future contributors

Why first:

- this gives the team a reliable place to develop from
- it prevents later confusion between research snapshots, incoming bundle files, and the real active codebase

### Phase 2. Session-State Quality Pass

Goal:

- improve the value of `session-state.ts` without changing host architecture yet

Primary tasks:

- tighten the story-ledger schema
- reduce false positives in directive / focus / constraint extraction
- improve bilingual handling
- add longer writing-session tests

Why second:

- this is the highest-value low-risk improvement area
- current SNC quality depends more on extraction quality than on host-level innovation right now

Current status:

- first narrow pass completed in the working host copy
- bilingual cues repaired
- false-positive extraction reduced
- user constraints separated from assistant planning text

### Phase 3. Real `maintain()` Pass

Goal:

- make SNC maintenance do useful host-safe work

Primary tasks:

- define what transcript hygiene SNC should own
- use runtime-safe rewrite helpers conservatively
- keep deterministic shaping and cleanup bounded
- add tests around non-destructive maintenance behavior

Why third:

- this is the first major missing capability in the current baseline
- it moves SNC closer to the stronger architecture we already mapped

Current status:

- first narrow slice completed in the working host copy
- requires runtime transcript rewrite support
- only rewrites old assistant planning/meta messages
- explicitly avoids rewriting story prose and recent transcript tail

### Phase 4. SNC-Aware Compaction Pass

Goal:

- let SNC-maintained artifacts influence compaction behavior

Primary tasks:

- decide what compaction should reuse from SNC state
- keep host compaction compatibility unless evidence demands deeper ownership
- test behavior under long-session pressure

Why fourth:

- this is powerful, but it is easier to do well after session state and maintenance are reliable

Current status:

- first safe slice completed in the working host copy
- SNC still delegates host compaction
- SNC now injects writing-aware `customInstructions` from persisted state
- deeper ownership is still deferred

### Phase 5. Hook / Memory Integration Pass

Goal:

- decide whether SNC stays context-engine-centric in v1 or grows helper hooks and optional memory helpers

Primary tasks:

- evaluate `tool_result_persist` and `before_message_write` for transcript shaping
- evaluate `agent_end` / `session_end` sidecars for slower upkeep
- decide whether memory-side helpers belong in v1 or later

Why fifth:

- the baseline plugin already proves the context-engine path
- hook integration should be added intentionally, not all at once

Current status:

- hook scaffold exists
- registration is disabled by default
- active design question is which hook behavior, if any, should be added first

## Immediate Next Build Target

The highest-value next concrete build target is now:

- keep the current plugin architecture
- preserve the tighter `session-state` contract, bounded `maintain()` slice, and delegated compaction shape
- decide whether phase 4 needs stronger result reuse or whether phase 5 hook/memory integration should become the next priority

That is now the shortest path to making SNC materially better without destabilizing the host.

## Recommended Commit Layers

When implementation starts, the cleanest commit order is likely:

1. baseline import / canonicalization
2. validation/bootstrap scripts
3. session-state quality improvements
4. maintenance implementation
5. compaction-aware behavior

This keeps history readable and rollback-safe.

## What Should Wait

- large host-internal OpenClaw rewrites
- broad memory-system redesign
- ToolSearch-like capability exposure experiments
- UI/product-shell polish

These are real future topics, but they are not the best first follow-up to the validated plugin baseline.

## Current Best Read

If we optimize for momentum and quality together, the next development phase should be:

1. stabilize the baseline
2. improve state quality
3. implement real maintenance

That order keeps us aligned with both:

- the current research conclusions
- and the real code we now have in hand
