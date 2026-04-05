# OC-23 Ambiguous Worker Launch Inspection / Recovery Matrix

## Purpose

Clarify how OpenClaw should be interpreted when worker launch returns `error` but still surfaces identifiers such as `childSessionKey` or `runId`. The goal is to separate retry-safe launch failures from inspect-first ambiguity so SNC does not accidentally duplicate helpers or lose track of partially created child sessions.

## Scope

In scope:

- `src/agents/subagent-spawn.ts`
- `src/agents/acp-spawn.ts`
- `src/agents/tools/session-status-tool.ts`
- `src/agents/tools/sessions-history-tool.ts`
- `src/agents/tools/sessions-list-tool.ts`
- `src/agents/tools/subagents-tool.ts`
- `src/agents/subagent-control.ts`
- `src/auto-reply/reply/subagents-utils.ts`

Out of scope:

- success-path launch semantics already covered by earlier worker packets
- broad retry/backoff policy beyond ambiguous launch handling
- SNC implementation edits

## Verified Structure / Lifecycle / Contract

### Ambiguity classes

OpenClaw launch outcomes fall into three materially different recovery classes.

#### 1. No-identity failure

The launch returns `error` and exposes no usable child identity.

Verified implication:

- the host gives the caller no inspectable child handle
- this is the clearest retry-safe lane

#### 2. Child-session-only ambiguity

The launch returns `error` but includes `childSessionKey`.

Verified implication:

- a concrete child session may already exist
- the launch error may reflect dispatch, tracking, or cleanup trouble after partial creation
- the safe next move is session-first inspection, not blind relaunch

#### 3. Child-session plus run-id ambiguity

The launch returns `error` and includes both `childSessionKey` and `runId`.

Verified implication:

- some amount of launch identity was created
- the caller may be able to inspect either session-centric state or controller-owned subagent state
- the presence of `runId` is stronger than no identity, but still not a universal guarantee of public control

### Where ambiguous identities come from

Verified from `subagent-spawn.ts` and `acp-spawn.ts`:

- the host may dispatch or create the child session successfully, then fail during later tracking or registration
- cleanup is attempted, but cleanup itself is best-effort
- therefore an `error` response can still refer to a child that briefly existed, still exists, or was successfully cleaned up

This is why "launch returned error" is not by itself enough to decide between retry and inspection.

### Public inspection seams after ambiguous launch

#### Session-centric seams

`sessions_list`

- lists visible sessions
- can reveal a spawned child session, its key, status, and related metadata

`session_status`

- resolves by `sessionKey` or equivalent session identifier
- returns current status for a visible session

`sessions_history`

- resolves by `sessionKey` or equivalent session identifier
- reveals transcript history for a visible session

These are the most reliable public seams when `childSessionKey` is present.

#### Controller-owned subagent seams

`subagents list`

- enumerates controller-known child runs
- can expose `runId`, labels, and session references when registry tracking succeeded

`subagents kill`

- can terminate a controller-known child target

`subagents steer`

- can redirect a controller-known child by resolving the target through controller-owned subagent state

Important verified nuance:

- run targeting by `runId` only works when the run is still visible in controller-owned registry state
- `runId` is therefore a conditional public handle, not a universal recovery key

### Resolution order for controller-owned targeting

Verified in `subagents-utils.ts`, target resolution can use:

- `last`
- numeric index
- exact `childSessionKey`
- exact label
- label prefix
- `runId` prefix

This means `childSessionKey` is the broadest cross-surface handle. `runId` becomes useful only after controller registry visibility is confirmed.

### Inspect-first versus retry-safe matrix

| Launch result shape | Immediate interpretation | Inspect-first lane | Retry-safe? | Safe operator guidance |
| --- | --- | --- | --- | --- |
| `error` with no identity | launch failed before any usable child handle was exposed | none available | yes, usually | "No child identity was created; retry is safe." |
| `error` with `childSessionKey` only | child session may exist or may have been cleaned up | `session_status`, `sessions_history`, `sessions_list` | not immediately | "Inspect the child session before retrying." |
| `error` with `childSessionKey` and `runId`, registry visible | child exists and controller may still track it | session tools first, then `subagents list/kill/steer` if visible | not immediately | "Inspect first; if registry still sees the run, use controller verbs." |
| `error` with identifiers, but no visible session or registry record | ambiguous partial creation followed by cleanup or failed registration | check both session and subagent visibility, then conclude stale ambiguity | maybe, after inspection | "No live child is visible now; note ambiguity, then consider retry." |

### Host truth versus SNC-local memory

The host's visible session/subagent surfaces are authoritative for recovery. Any SNC-local worker record is only a cached memory of prior launch attempts. If SNC state says a child exists but current host inspection says otherwise, recovery should follow host truth.

## Key Findings

- `childSessionKey` is the primary public recovery handle after ambiguous launch. It maps cleanly onto `sessions_list`, `session_status`, and `sessions_history`.
- `runId` is useful only when controller-owned subagent registry state still exists. It is not a universal inspection key.
- Ambiguous launch is produced by real partial-creation sequences, not just by vague error wording. The host may fail after dispatch or after identity creation.
- A later "nothing found" result after an ambiguous launch can be legitimate cleanup success, not proof that the earlier identifiers were fake.
- The safe doctrine is inspect first when any child identity exists; only identity-free failure is cleanly retry-first.

## SNC Relevance

SNC already persists worker records under `stateDir`, including `childSessionKey` and `runId`. This packet clarifies how those records should be used:

- `childSessionKey` should be treated as the first recovery anchor
- `runId` should be treated as a conditional convenience handle, not the core recovery truth
- when SNC-local state and host visibility disagree, host inspection wins

That directly supports Milestone 2 worker diagnostics and operator-facing recovery notes.

## Modification Guidance

- Wrap: expose ambiguous-launch diagnostics in child-session-first terms, not run-id-first terms.
- Extend: if SNC adds an inspect helper, have it check `session_status` and `sessions_history` before offering relaunch.
- Defer: any richer automatic recovery policy should wait until SNC can reliably correlate host-visible sessions with its local worker ledger.
- Avoid: do not blindly relaunch when an `error` payload still includes `childSessionKey` or other child identity.

## Still-unverified questions

- This packet does not prove whether future OpenClaw versions will add more machine-readable failure subcodes for ambiguous launch.
- The exact survivability of registry visibility across every ACP and non-ACP failure branch was not exhaustively enumerated here.
- Gateway-owner-only tooling was not used as a recovery foundation in this packet; only public worker/session seams were considered stable enough for operator guidance.
