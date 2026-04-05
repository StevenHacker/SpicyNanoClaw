# OC-24 Worker Late-Reply / Announce Visibility Matrix

## Purpose

Clarify what OpenClaw can still make visible after `sessions_send` has already returned, and separate three things that are easy to blur together:

- the synchronous tool result
- later announce-flow work
- later session-visible reply state

This packet exists so SNC can say "a reply may arrive later" only when the host actually leaves a later visibility lane open.

## Scope

In scope:

- `src/agents/tools/sessions-send-tool.ts`
- `src/agents/tools/sessions-send-tool.a2a.ts`
- `src/agents/tools/agent-step.ts`
- `src/agents/tools/sessions-send-helpers.ts`
- `src/agents/tools/sessions-announce-target.ts`
- `src/agents/openclaw-tools.sessions.test.ts`

Out of scope:

- broader worker-control semantics already covered by `OC-21` and `OC-22`
- SNC implementation changes
- generic channel-plugin delivery architecture outside the `sessions_send` lane

## Verified Structure / Lifecycle / Contract

### The late-visibility lane only exists when the tool actually starts it

`sessions_send` has two different post-return behaviors:

1. it may start `runSessionsSendA2AFlow(...)`
2. it may return without any later fetch/announce work still alive

That distinction depends on the synchronous branch that just finished.

### Synchronous result versus later flow start

Verified in `sessions-send-tool.ts`:

| Immediate result shape | Does this call start a later A2A flow? | What later work remains possible? |
| --- | --- | --- |
| `status: "accepted"` from `timeoutSeconds === 0` | yes | background wait, late reply fetch, optional ping-pong, optional announce send |
| `status: "ok"` with `reply` | yes | optional ping-pong, optional announce send |
| `status: "ok"` without `reply` | yes, but it immediately self-terminates | no late fetch and no announce from this call |
| `status: "timeout"` | no | no host-managed late announce path from this call |
| `status: "error"` | no | no host-managed late announce path from this call |

The important non-obvious row is `ok` without `reply`:

- the tool does call `startA2AFlow(reply ?? undefined)`
- but that flow receives neither `roundOneReply` nor `waitRunId`
- `runSessionsSendA2AFlow(...)` then exits at `if (!latestReply) return`

So "wait finished but no fresh reply was observed" is not the same as "the host will keep trying later."

### What the late A2A flow actually does

Verified in `sessions-send-tool.a2a.ts`:

1. If it has no `roundOneReply` but does have `waitRunId`, it does one more best-effort `agent.wait`
2. If that later wait succeeds, it reads the latest assistant reply from the target session
3. If there is still no reply, the flow returns with no announce
4. If there is a reply, it may run bounded requester/target ping-pong turns
5. It then runs an announce step on the target session
6. It only calls gateway `send` if:
   - an `announceTarget` exists
   - the announce step returned non-empty text
   - that text is not `ANNOUNCE_SKIP`

Failures in this late lane are not surfaced back to the original `sessions_send` caller:

- announce delivery failure is logged
- announce flow failure is logged

### Host-observable layers are not the same thing

There are three different visibility layers here.

#### 1. Synchronous caller-visible result

This is the original `sessions_send` return payload:

- `accepted`
- `ok`
- `timeout`
- `error`
- optional synchronous `reply`

This is the only visibility the original caller receives directly from the tool call.

#### 2. Later session-visible transcript changes

The late flow uses `runAgentStep(...)`, which performs nested `agent` runs with `deliver: false`.

That means later transcript changes may appear inside:

- the target session
- and, during ping-pong, sometimes the requester session too

Those transcript mutations are host-observable through session inspection tools, but they are not the same as an external announce having been delivered to a user/channel.

#### 3. External announce delivery attempt

The final direct send is a separate step:

- it requires a resolvable announce target
- it is skipped if the announce step returns `ANNOUNCE_SKIP`
- failure only produces a warning log

So "the host attempted announce delivery" is narrower than "the caller already saw a reply," and broader than "a target-session reply exists."

### Late-reply / announce visibility matrix

| Immediate state | Later reply fetch lane still open? | Later session-visible reply still possible? | Later announce send still possible? | Positive no-late-reply evidence from this call? | Safe wording |
| --- | --- | --- | --- | --- | --- |
| `accepted` | yes | yes | yes | no | "Follow-up was accepted. A reply may appear later, but none has been observed yet." |
| `ok` with `reply` | no additional fetch needed | already yes | yes | not needed | "A reply was observed. Background announce delivery may still run separately." |
| `ok` without `reply` | no | no additional evidence from this call | no | yes, for this call's own late lane | "No fresh reply was observed, and this call does not keep a later reply-fetch lane open." |
| `timeout` | no | possibly, but only manual inspection can prove it | no | no | "No reply was observed before timeout. Inspect the worker/session before retrying." |
| `error` | no | unknown | no | no | "The follow-up attempt failed. Inspect current state before deciding whether to retry." |

### Safe interpretation of "reply may arrive later"

Code evidence supports that wording in only two bounded cases:

- `accepted`, because the background wait/fetch/announce flow is still alive
- `timeout`, but only in the weaker sense that the worker may still finish later in the session; this tool call itself will not deliver a later update

It is not safe wording for:

- `ok` with no `reply`
- `error`

## Key Findings

- `accepted` is the clearest true late-reply lane. The host explicitly schedules a later wait/fetch/announce flow for that branch.
- `ok` without `reply` is stronger negative evidence than phase 10 established: the call does not leave a later fetch/announce lane alive.
- Later session transcript mutations and external announce delivery are different visibility layers. One can happen without the other.
- Announce send failure is deliberately best-effort and only logged, so the original caller never gets a later "delivery succeeded/failed" verdict from this tool call.
- "Reply may arrive later" is only honest when tied to the exact branch that still has a late lane open.

## SNC Relevance

This packet sharpens worker follow-up wording for SNC:

- if SNC later wraps `sessions_send`, it should only promise late reply potential on the host branches that truly keep that lane open
- if SNC only observes session history later, it should describe that as session-visible evidence, not as proof that announce delivery succeeded
- if follow-up timed out, SNC should route the operator toward inspection rather than pretending a background delivery callback is still pending

That helps keep Milestone 2 operator language precise without inventing a worker inbox platform.

## Modification Guidance

- Wrap: if SNC adds a first-class follow-up helper, model the outward statuses around `accepted`, `reply observed`, `no fresh reply observed`, `timeout`, and `error`.
- Extend: if later UX needs stronger late-reply tracking, add explicit inspection or transcript-delta checks instead of inferring from `delivery: pending`.
- Defer: do not add "late delivery guaranteed" wording unless SNC can observe more than the host's best-effort announce side effect.
- Avoid: do not say "a reply may still arrive later" for `ok` without `reply`; that branch has already exhausted its own late-fetch lane.

## Still-unverified questions

- This packet does not prove what every downstream channel plugin does after a successful gateway `send`; it only proves what `sessions_send` itself does.
- It was not verified whether later transcript writes created by ping-pong or announce steps are always distinguishable from the worker's original reply in operator-facing tooling.
- The packet does not reopen non-default transport or product-shell notification surfaces beyond the host code in scope.
