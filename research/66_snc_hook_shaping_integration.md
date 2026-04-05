# SNC Hook Shaping Integration

## Purpose

Land the first real SNC hook-layer shaping slice without taking host compaction ownership or broadening into durable memory.

This packet integrates bounded behavior into the existing SNC hook scaffold so SNC can:

- collapse assistant planning/meta chatter into stable continuity notes
- bound oversized or synthetic tool-result persistence
- freeze replacement fate per session
- clear hook-owned state on `session_end`

## Scope And Constraints

Claim `13` allows writes only to:

- `extensions/snc/src/hook-scaffold.ts`
- `extensions/snc/src/config.ts`
- `extensions/snc/src/hook-scaffold.test.ts`
- `extensions/snc/src/config.test.ts`

No host compaction ownership was added.
No durable-memory behavior was added.
No host runtime internals were edited.

## Verified Integration Shape

### 1. `before_message_write`

SNC now registers a synchronous shaping handler that:

- only targets assistant messages
- only rewrites plain-text planning/meta chatter
- skips obvious story prose
- emits a bounded `SNC planning note: ...` replacement
- stops rewriting after a per-session assistant rewrite budget

### 2. `tool_result_persist`

SNC now registers a synchronous persistence shaper that:

- examines tool-result transcript payloads before they are persisted
- converts synthetic or oversized payloads into bounded previews
- drops `details` from replaced tool-result messages
- stores the first replacement decision in a session-scoped replacement ledger
- reuses that frozen decision for the same tool call on later writes

### 3. `session_end`

SNC now clears hook-owned session state on `session_end` so the rewrite budget and replacement ledger do not leak across completed sessions.

## Config Surface

Hook behavior remains disabled by default.

When `hooks.enabled: true`, SNC now resolves three bounded-shaping controls:

- `maxRewritesPerSession`
- `maxReplacementBytes`
- `maxToolResultBytes`

These are normalized to safe integer minimums during config resolution.

## SNC Relevance

This is the first real landing of the migration-matrix recommendation to make transcript shaping an actual hook-layer behavior instead of a scaffold.

Why it matters for SNC:

- it keeps continuity shaping hot-pluggable
- it reduces transcript noise before touching host-owned compaction paths
- it makes replacement decisions deterministic within a live session
- it keeps state ownership inside the SNC plugin rather than the OpenClaw host

## Modification Guidance

- `Wrap preferred`: `before_message_write`, `tool_result_persist`, `session_end`
- `Hot-pluggable seam`: SNC-owned hook runtime state and config gating
- `Defer`: persistent on-disk ledger storage and broader durable-memory coupling
- `Do not touch`: host compaction ownership, host session manager internals, broader memory pipeline

## Claim vs Code Reality

Claim `13` depended on packets `11` and `12`, and those packet outputs now exist in the working tree:

- `transcript-shaping.ts` / `transcript-shaping.test.ts`
- `replacement-ledger.ts` / `replacement-ledger.test.ts`

Current code reality is therefore stronger than the original claim shape:

- hook shaping is landed and validated
- the standalone utilities exist and are accepted
- `hook-scaffold.ts` still carries its own shaping logic instead of importing the transcript utility directly

That last point is not a blocker for claim acceptance.
It is a follow-on refactor opportunity once the next dispatcher cycle decides whether utility convergence is worth the churn.

## Open Questions

1. Whether assistant-plan shaping should later move into a dedicated utility once the dispatcher-owned packet for that module is fully merged.
2. Whether the replacement ledger should remain session-memory-only or gain bounded persisted reconstruction.
3. Whether later SNC slices want a stronger preview format for structured tool results beyond text-plus-`details` inputs.
