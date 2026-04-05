# OC-22 Worker Follow-Up Delivery / Reply-Visibility Matrix

## Purpose

Clarify what OpenClaw `sessions_send` actually proves at return time, what it does not prove, and how reply visibility differs from background continuation or later announce delivery. This packet is intended to keep SNC follow-up wording precise instead of overstating that a worker "replied" when the host only proved message acceptance or a wait-window observation.

## Scope

In scope:

- `src/agents/tools/sessions-send-tool.ts`
- `src/agents/tools/sessions-send-tool.a2a.ts`
- `src/agents/tools/agent-step.ts`
- `src/agents/tools/sessions.test.ts`

Out of scope:

- broad worker orchestration design
- subagent steering or kill semantics except where needed to explain follow-up visibility
- SNC implementation changes

## Verified Structure / Lifecycle / Contract

### Verified call structure

`sessions_send` has two materially different execution branches:

1. `timeoutSeconds === 0`
2. `timeoutSeconds > 0`

Both branches start by resolving the target session and issuing a new nested `agent` run against that session. After that point, the contract diverges.

### Branch A: immediate-accept lane (`timeoutSeconds === 0`)

Observed order in `sessions-send-tool.ts`:

1. resolve visible target session
2. call `startAgentRun(...)`
3. return immediately with:
   - `status: "accepted"`
   - `sessionKey`
   - `delivery: { status: "pending", mode: "announce" }`
4. start `runSessionsSendA2AFlow(...)` in background using the returned run identity

What is verified at return time:

- the send request was accepted for a concrete target session
- the host obtained enough identity to schedule a later wait/announce attempt

What is not verified at return time:

- a fresh assistant reply exists
- the user can already see a reply
- the later announce path succeeded

### Branch B: wait-for-reply lane (`timeoutSeconds > 0`)

Observed order in `sessions-send-tool.ts`:

1. resolve visible target session
2. call `startAgentRun(...)`
3. read baseline `chat.history`
4. wait on the newly started run with `agent.wait`
5. if wait completes successfully, read `chat.history` again
6. compare latest assistant snapshot against the baseline fingerprint
7. return:
   - `status: "ok"`
   - optional `reply`
   - `sessionKey`
   - `delivery: { status: "pending", mode: "announce" }`
8. start `runSessionsSendA2AFlow(...)` with the observed reply if one exists

Important verified nuance:

- `status: "ok"` does not guarantee a visible fresh reply
- `reply` is only returned when the latest assistant snapshot changed during this wait window
- an old assistant message that already existed before the send is deliberately not reused

This is covered by `sessions.test.ts`, which explicitly verifies that the result can be `status: "ok"` with `reply: undefined` when the history after waiting still points at the same earlier assistant message.

### Timeout and error branches

If `agent.wait` times out:

- the tool returns `status: "timeout"`
- no reply is surfaced
- this call does not prove whether the target will still continue in background
- this branch does not proceed into the normal A2A announce flow

If `startAgentRun(...)` or the wait flow errors:

- the tool returns `status: "error"`
- no reply visibility guarantee exists

### Immediate result versus later delivery

`sessions-send-tool.a2a.ts` is a separate best-effort layer. It can:

- wait again in background
- attempt to fetch a reply later
- announce or relay that reply through the A2A path

But that layer is not part of the synchronous proof carried by the initial `sessions_send` tool result. A pending `delivery` object means later announce work was scheduled or intended, not that the reply is already visible to the caller.

### Reply-visibility matrix

| Tool outcome | Immediate host proof | Fresh reply visible in this call? | Background continuation still possible? | Safe operator wording |
| --- | --- | --- | --- | --- |
| `accepted` | target session accepted a new run | no | yes | "Follow-up accepted; no reply inspected yet." |
| `ok` with `reply` | wait finished and a new assistant snapshot was observed | yes | yes, announce/relay may still happen | "Reply observed from worker." |
| `ok` without `reply` | wait finished, but no new assistant snapshot became visible | no | yes | "Follow-up completed its wait window, but no fresh visible reply was observed." |
| `timeout` | wait window expired before a visible completion was observed | no | possibly | "No reply was observed before timeout; inspect before retrying." |
| `error` | send or wait flow failed | no | unknown | "Follow-up attempt failed; inspect current worker/session state." |

## Key Findings

- `sessions_send` distinguishes message acceptance from reply visibility. `accepted` only proves that the host launched a follow-up run against the target session.
- `ok` is narrower than "worker replied". The code only returns `reply` when the latest assistant snapshot changed during the current wait window.
- OpenClaw intentionally avoids surfacing stale assistant output as if it were a reply to the new follow-up. That behavior is tested, not inferred.
- The `delivery: pending` object is about later announce handling, not proof that the caller or operator has already received a worker answer.
- `timeout` is not a clean negative acknowledgement. It only means the wait window ended without a visible fresh reply in this call.

## SNC Relevance

For SNC, this packet narrows what follow-up diagnostics and operator messaging can safely promise:

- a host-level follow-up can be accepted without yielding a visible answer
- a wait-window success can still produce no fresh visible reply
- a timeout should steer the operator toward inspection, not automatic relaunch

This matters because SNC already tracks worker identity and exposes controller-side diagnostics, but it does not yet have a dedicated first-class wrapper around `sessions_send`. Any future SNC follow-up surface should inherit the host's narrower truth model instead of collapsing everything into "worker replied" or "worker failed."

## Modification Guidance

- Wrap: if SNC adds a follow-up helper, keep result wording aligned to the host matrix above: accepted, visible reply, no fresh visible reply, timed out, error.
- Extend: if operator UX needs stronger clarity, add explicit post-send inspection guidance rather than inventing stronger guarantees.
- Defer: do not promise durable "reply delivered" semantics until SNC can separately verify post-send visibility or transcript change.
- Avoid: do not treat `delivery.status === "pending"` as proof that a reply exists or that the user has already seen it.

## Still-unverified questions

- Whether all downstream A2A announce consumers surface late replies consistently across every deployment lane was not verified here.
- This packet does not prove what the target worker was doing internally during a `timeout`; it only proves what the caller could observe synchronously.
- The broader UX semantics of follow-up responses routed through non-default transport layers were not reopened in this packet.
