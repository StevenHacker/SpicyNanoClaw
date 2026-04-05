# SNC Hook Shaping Integration Spec

## Purpose

This spec defines the first real SNC hook-shaping slice for OpenClaw.
The goal is deterministic transcript shaping at write time, with bounded failure behavior and no expansion into durable memory.

Scope is limited to the existing SNC hook targets:

- `before_message_write`
- `tool_result_persist`

`session_end` remains a placeholder lifecycle seam and is not part of this shaping order.

## Integration Order

Implement the hook pipeline in this order:

1. `before_message_write`
2. `tool_result_persist`

That order is intentional.

`before_message_write` is the coarse shaping gate for assistant-facing transcript writes.
`tool_result_persist` is the narrow freeze point for tool output before it becomes long-lived transcript noise.

The integration must preserve this bounded relationship:

- `before_message_write` may normalize, trim, or collapse message-level transcript content.
- `tool_result_persist` may shape tool-result payloads before persistence.
- neither hook may re-open the other hook's completed decision in the same turn.

## State Ownership

SNC owns the shaping policy, not the host.

Required ownership split:

- Host owns the actual session transcript write path.
- SNC owns the transform rules for the two hooks.
- SNC owns only transient in-process coordination state for the current session.
- SNC does not own durable memory, cross-session recall, or long-term transcript reconstruction.

Allowed state:

- per-session in-memory counters
- per-session failure breaker state
- per-session replacement or shaping decisions while the session is active

Disallowed state:

- disk-backed memory
- external persistence for hook decisions
- replayable memory archive structures
- any state whose purpose is to outlive the current session

## Hook Semantics

### `before_message_write`

Use this hook to make the outbound message transcript smaller, more stable, and less noisy.

Implementation-facing behavior:

- operate only on the message payload passed into the hook
- preserve semantics; do not invent new content
- prefer bounded transforms such as collapse, prune, or redact
- keep edits deterministic for a given input

This hook is the right place for:

- trimming assistant planning chatter
- collapsing repeated meta language
- limiting low-value transcript spill

This hook is not the place for:

- summarization that becomes a new memory artifact
- speculative reconstruction of hidden context
- broad rewriting of the conversation history

### `tool_result_persist`

Use this hook as the persistence freeze point for tool output.

Implementation-facing behavior:

- shape the tool result before it is written to the transcript
- keep replacement decisions stable once made
- avoid per-turn drift in how the same tool result is represented

This hook is the right place for:

- shortening large tool payloads
- applying stable preview forms
- preserving a fixed replacement choice for noisy results

This hook is not the place for:

- post-hoc recovery of tool output from other session state
- durable indexing of tool content
- delayed memory capture logic

## Ordering Rules

The runtime must treat the two hooks as sequential and bounded.

Rules:

- `before_message_write` executes before message persistence completes.
- `tool_result_persist` executes before tool-result persistence completes.
- if both apply to related content, each hook must only operate within its own seam.
- a decision made by one hook must not depend on the later hook's output.
- a later turn may reuse a prior shaping decision only through the current session's transient SNC state, not through durable memory.

Practical implication:

- tool-result shaping should be stable enough that `before_message_write` does not need to "fix it later".
- message shaping should not try to reconstruct or reinterpret raw tool payloads.

## Failure and Circuit-Breaker Rules

Hook failures must fail closed to pass-through behavior.

Required breaker policy:

- any hook exception or invalid return must preserve the original payload
- a single failure must not stop the session
- repeated failures must trip a per-session breaker for the affected hook path
- once tripped, the hook must remain inert for the rest of the session

Breaker guidance:

- count consecutive failures per hook target
- keep the threshold low enough to prevent noisy retry loops
- reset the breaker only when a new session starts

When the breaker is open:

- register the hook if needed, but do not transform payloads
- avoid secondary cleanup attempts inside the same session
- emit only minimal diagnostic state

Do not:

- retry transformation in a loop
- stack fallback summarizers
- degrade into repeated rewrite attempts

## Explicit No-Go Zones

These are out of scope for this implementation and should not be introduced through the hook layer:

- durable memory or long-term recall
- cross-session transcript repair
- autonomous compaction ownership
- host-internal OpenClaw edits outside the SNC plugin package
- tool-schema deferral infrastructure
- background harvesting sidecars
- broad conversation-history rewriting
- prompt-only shaping without write-time enforcement

## Implementation Boundary

Keep the first real SNC hook layer narrow:

- shape only at write time
- preserve host transcript ownership
- keep decisions deterministic and session-local
- keep failures bounded and self-disabling

If a transform cannot be expressed as a local write-time decision, it does not belong in this slice.

## Acceptance Criteria

The integration is complete when:

- `before_message_write` and `tool_result_persist` are both wired as real SNC shaping seams
- hook behavior is enabled only through explicit SNC config
- default behavior remains unchanged when hooks are disabled or absent
- the hook path fails open to pass-through on error
- the breaker disables repeated faulty transformations for the rest of the session
- no durable memory or host-wide rewrite mechanism is introduced

