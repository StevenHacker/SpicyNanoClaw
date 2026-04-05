# SNC-07 Transcript Shaping Utility

## What This Is

This packet extracts a bounded transcript-shaping utility for SNC without taking hook ownership yet.

Implementation file:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/transcript-shaping.ts`

Focused tests:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/transcript-shaping.test.ts`

## Verified Host Evidence

The utility shape is based on current OpenClaw hook contracts and current SNC heuristics, not on generic plugin intuition.

Verified host-side evidence:

- `src/plugins/types.ts`
  - `before_message_write` can mutate or block the message that will be written
- `src/agents/session-tool-result-guard-wrapper.ts`
  - the hook is already wired into transcript persistence
- `extensions/snc/src/engine.ts`
  - current SNC `maintain()` already contains a conservative planning-note rewrite path for old assistant messages

That means a standalone shaping utility is a real next-step building block, not speculative scaffolding.

## Utility Structure

The new utility exposes two layers:

1. `analyzeSncTranscriptMessage(...)`
   - classifies assistant transcript candidates into:
   - `assistant-plan`
   - `assistant-meta`
   - `assistant-story`
   - `assistant-ack`
   - passthrough classes such as `non-assistant` and `already-shaped`

2. `shapeSncTranscriptMessage(...)`
   - rewrites only planning/meta chatter
   - preserves continuity-bearing segments
   - emits a bounded single-note replacement message
   - leaves likely story prose and already-shaped SNC notes untouched

## What Was Actually Implemented

- assistant-only analysis
- text extraction from string or text-block content
- deterministic segment selection
- bounded rewrite prefixes:
  - `Planning note preserved by SNC:`
  - `Meta note preserved by SNC:`
- story-prose guard to reduce accidental rewriting of narrative content

## SNC Relevance

This directly supports the current SNC landing path identified in the migration matrix:

- deterministic transcript shaping
- stable bounded transcript artifacts
- continuity-preserving reduction of assistant planning chatter

It also gives the later hook integration step a reusable pure function instead of embedding heuristics directly into `hook-scaffold.ts`.

## Modification Guidance

- `Wrap preferred`
  - call this utility from `before_message_write` later
  - optionally reuse it from maintenance or transcript repair flows

- `Hot-pluggable seam`
  - the correct first integration seam remains SNC's own hook layer, not OpenClaw host edits

- `Do-not-touch for this packet`
  - no changes to `hook-scaffold.ts`
  - no changes to `engine.ts`
  - no host hook registration changes

## Open Questions

- The current utility deliberately stays English-pattern-heavy even though broader SNC state extraction already has bilingual cues elsewhere.
- Hook integration still needs an explicit policy for when to `replace` versus `block`.
- The future integration step should decide whether maintenance and live write shaping should share a single pattern bank or keep separate safety thresholds.
