# SNC-08 Replacement Ledger Utility

## What This Is

This packet adds a plugin-owned replacement ledger utility that can later freeze transcript-shaping and tool-result shaping decisions across turns.

Implementation file:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/replacement-ledger.ts`

Focused tests:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/replacement-ledger.test.ts`

## Verified Host Evidence

The ledger design follows the currently verified host hook surfaces:

- `src/plugins/types.ts`
  - `before_message_write` provides `agentId` and `sessionKey`
  - `tool_result_persist` provides `agentId`, `sessionKey`, `toolName`, and `toolCallId`
- `src/agents/session-tool-result-guard-wrapper.ts`
  - `tool_result_persist` and `before_message_write` are both on the real persistence path

That makes a plugin-side deterministic ledger structurally compatible with the host as it exists now.

## Utility Structure

The new utility provides:

1. stable key construction
   - prefer `toolCallId` for tool-result persistence
   - otherwise fall back to session/agent scope plus message fingerprint

2. decision recording
   - `keep`
   - `replace`
   - `block`

3. decision lookup
   - lookup requires both the stable key and the original-message fingerprint
   - this prevents stale reuse when scope matches but content changes

4. serialization helpers
   - JSON serialization
   - parse-and-normalize reconstruction
   - bounded entry window trimming

## What Was Actually Implemented

- SHA-1-backed stable fingerprints for persisted-message shape
- preview fields for debugging and future inspection
- immutable record/update flow with `hitCount`
- JSON round-trip helpers
- trimming to a bounded ledger window

## SNC Relevance

This is the missing state primitive for the migration-matrix recommendation:

- deterministic replacement bookkeeping
- frozen replacement fate across turns
- clean separation between local truth and model-visible projection

Without a ledger, later hook shaping would have to recompute replacement fate every time and would be more likely to drift.

## Modification Guidance

- `Hot-pluggable seam`
  - keep the ledger owned by the SNC plugin package
  - consume it from `before_message_write` and `tool_result_persist` later

- `Wrap preferred`
  - use the ledger as a hook-side helper
  - do not move this logic into OpenClaw core unless the host later proves missing identity data

- `Do-not-touch for this packet`
  - no hook registration changes
  - no host persistence-path edits
  - no durable-file persistence decision yet

## Open Questions

- The utility currently gives serialization helpers, but not a final persistence location.
- Future hook integration must decide whether the ledger should live inside SNC session state, a parallel sidecar file, or another plugin-owned store.
- Tool-result entries currently require fingerprint match in addition to scope match; later real-world usage will confirm whether that is conservative enough or too strict.
