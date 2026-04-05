## Purpose

Pin down the exact completion-delivery lifecycle for OpenClaw subagents after launch succeeds: which runs enter the registry-backed completion pipeline, how completion announcements are dispatched, when delivery is direct versus queued, when `subagent_ended` is deferred, and when `contextEngine.onSubagentEnded(...)` actually fires. The goal is to give SNC a code-accurate matrix for bounded delegation follow-up without mistaking product-shell announce behavior for the core worker seam.

## Scope

- Repo: `data/external/openclaw-v2026.4.1`
- Focus:
  - registry-backed subagent completion flow
  - announce dispatch order and queue modes
  - direct requester delivery versus queued requester delivery
  - delivery-target overrides for external completion delivery
  - deferred `subagent_ended` and `contextEngine.onSubagentEnded(...)` ordering
  - ACP parent-stream branch as a separate completion-delivery path
- Out of scope:
  - worker launch seam itself except where needed to anchor completion handling
  - plugin authoring APIs
  - SNC implementation choices beyond host-facing guidance

## Main Entry Files

- `data/external/openclaw-v2026.4.1/src/agents/subagent-spawn.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-registry.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-registry-lifecycle.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-registry-completion.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-announce.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-announce-dispatch.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-announce-delivery.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-announce-queue.ts`
- `data/external/openclaw-v2026.4.1/src/agents/acp-spawn.ts`
- `data/external/openclaw-v2026.4.1/src/agents/acp-spawn-parent-stream.ts`
- `data/external/openclaw-v2026.4.1/src/tasks/task-executor.ts`

## Verified Structure / Lifecycle / Contract

### 1. Registered-run completion path

The registry-backed completion flow starts only for subagent runs created through the regular spawn path that calls `registerSubagentRun(...)`.

Code-verified order:

1. `spawnSubagentDirect(...)` creates a subagent run and, after launch acceptance, calls `registerSubagentRun(...)`.
2. `registerSubagentRun(...)` stores a `SubagentRunRecord`, persists it, and starts a completion watcher through `waitForSubagentCompletion(...)`.
3. The registry listens to agent lifecycle events.
4. On `phase === "start"`, it records `startedAt` and clears any pending lifecycle error.
5. On `phase === "error"`, it schedules a pending lifecycle error with a grace window instead of immediately finalizing the run.
6. On `phase === "end"`, it clears pending lifecycle error, derives an outcome, and calls `completeSubagentRun(...)` with cleanup enabled.

This means the completion-delivery contract for ordinary subagent runs is registry-first, then announce cleanup, not “raw gateway end event goes straight to parent.”

### 2. Trigger order for registered completion and cleanup

For a normal registered subagent run, the verified high-level order is:

1. Subagent lifecycle `end` reaches the registry listener.
2. `completeSubagentRun(...)` records `endedAt`, `outcome`, `endedReason`, and frozen result text if available.
3. Detached task bookkeeping is updated.
4. A `subagent-status` lifecycle event may be emitted to the session event stream.
5. If cleanup is enabled and not suppressed, `startSubagentAnnounceCleanupFlow(...)` begins.
6. Cleanup flow tries delivery, deferral, or retry handling.
7. If delivery succeeds, detached task delivery status is marked `delivered`.
8. If deferred `subagent_ended` is needed, it is emitted during cleanup finalization.
9. `contextEngine.onSubagentEnded(...)` is invoked during cleanup bookkeeping, after delivery status handling and after deferred-ended-hook emission.

This ordering matters because OpenClaw does not treat “child process ended” and “completion delivered to requester” as the same milestone.

### 3. Exact completion-dispatch matrix

`runSubagentAnnounceDispatch(...)` has two top-level branches based on `expectsCompletionMessage`.

#### Branch A: `expectsCompletionMessage === false`

This is queue-first.

1. Try queue delivery first.
2. If queue returns a delivered result, stop.
3. If queue returns a dropped result, stop.
4. Otherwise try direct delivery.

This is the verified order:

| Mode gate | First attempt | Second attempt | Notes |
| --- | --- | --- | --- |
| `expectsCompletionMessage === false` | queue-primary | direct-primary | queue can fully satisfy or drop before direct fallback |

#### Branch B: `expectsCompletionMessage === true`

This is direct-first.

1. Try direct delivery first.
2. If direct delivery succeeds, stop.
3. Otherwise fall back to queue delivery.

This is the verified order:

| Mode gate | First attempt | Second attempt | Notes |
| --- | --- | --- | --- |
| `expectsCompletionMessage === true` | direct-primary | queue-fallback | completion-message path prioritizes explicit requester delivery |

This split is the central dispatch contract. SNC should not collapse it into a single “completion notify” concept.

### 4. Queued requester delivery path

`maybeQueueSubagentAnnounce(...)` is the main queue decision point.

Verified queue behavior:

- It loads the requester session entry and queue settings.
- If queue mode is `steer` or `steer-backlog`, it first tries `queueEmbeddedPiMessage(...)`.
- Successful embedded steering yields `"steered"`.
- If requester session is active and queue mode is one of `followup`, `collect`, `steer-backlog`, `interrupt`, or `steer`, it tries `enqueueAnnounce(...)`.
- Successful queue insertion yields `"queued"`.
- Queue insertion failure yields `"dropped"`.
- If no applicable queue mode or no eligible requester session is present, result is `"none"`.

Queue outcome to delivery result behavior:

| Queue outcome | Delivery meaning |
| --- | --- |
| `steered` | treated as delivered |
| `queued` | treated as delivered |
| `none` | not delivered |
| `dropped` | treated as not delivered |

Important queue-mode note:

- `steer` and `steer-backlog` are not just backlog labels. They can route completion into an embedded PI control path before generic queueing.

### 5. Direct requester delivery path

`sendSubagentAnnounceDirectly(...)` is the direct-delivery path.

Verified behavior:

- It computes the canonical requester session key.
- For external requesters, it resolves a best-effort delivery target.
- For internal requester subagents, it keeps delivery internal and sets `deliver: false`.
- It sends through the gateway `agent` call with `expectFinal: true`.

This creates two materially different “direct” cases:

| Requester type | Direct delivery behavior |
| --- | --- |
| Internal requester subagent | internal message into requester session, `deliver: false` |
| External requester | best-effort external delivery target is resolved and passed through |

So “direct” does not always mean “deliver to a human-facing conversation.” It can also mean an internal requester session follow-up.

### 6. Delivery-target overrides

Delivery-target override logic is narrower than a generic announce system.

`resolveSubagentCompletionOrigin(...)` only participates when all of the following are true:

- `expectsCompletionMessage === true`
- requester is not a subagent
- direct external completion delivery is being prepared

Verified order:

1. Try bound-delivery routing with event kind `task_completion`.
2. If a bound route exists, convert that binding into the delivery target and stop.
3. Otherwise, if hook `subagent_delivery_target` exists, call it.
4. If the hook returns an internal channel target, ignore it.
5. If the hook returns an external target, merge it over requester origin.
6. If no hook or hook failure, fall back to requester origin.

This means delivery-target override is not a universal announce override layer. It is specifically an external completion-message targeting aid.

### 7. Deferred `subagent_ended` ordering

OpenClaw can defer the `subagent_ended` hook.

Verified deferral conditions:

- ended-hook emission is enabled
- cleanup was triggered
- `entry.expectsCompletionMessage === true`
- cleanup is not being suppressed for steer restart

When all of those hold, `completeSubagentRun(...)` does not emit `subagent_ended` immediately.

Instead, on successful cleanup finalization:

1. detached task delivery status is updated
2. deferred `subagent_ended` is emitted if needed
3. `contextEngine.onSubagentEnded(...)` is invoked during cleanup bookkeeping

This yields a specific ordering guarantee for completion-message flows:

| Milestone | Relative order |
| --- | --- |
| child run marked completed in registry | first |
| completion delivery handled | before ended hook |
| deferred `subagent_ended` | before `contextEngine.onSubagentEnded(...)` |
| `contextEngine.onSubagentEnded(...)` | after delivery/ended-hook finalization |

For non-completion-message runs, ended-hook emission may happen earlier inside `completeSubagentRun(...)` because the deferral gate is not active.

### 8. Deferred descendant-settle branch

Cleanup can be deferred when descendants are still active.

Verified branch:

- If completion-message flow still has active descendant runs, cleanup resolution can return `defer-descendants`.
- In that case, the entry records `wakeOnDescendantSettle = true`, cleanup is left unresolved, and the system schedules a resume.

When descendant settling later permits a wake:

1. `runSubagentAnnounceFlow(...)` sees `wakeOnDescendantSettle === true`
2. it calls `wakeSubagentRunAfterDescendants(...)`
3. a wake message is delivered back into the child session
4. the registry record can be replaced to track the wake continuation
5. cleanup may continue without deleting the child session

This is not ordinary completion delivery. It is a deferred continuation branch intended to let a child session settle descendant work and then resume toward a deliverable end state.

### 9. ACP parent-stream branch

ACP parent-stream spawning is a distinct completion-delivery path and must not be merged into the registry-backed matrix.

Verified differences:

- `acp-spawn.ts` starts parent-stream relay behavior through `startAcpSpawnParentStreamRelay(...)`.
- It creates a task run record for ACP runtime delivery tracking.
- Parent stream events relay progress, stall, done, and error status to the parent session.
- This path does not rely on the subagent registry completion pipeline.
- It does not use `subagent_announce` cleanup as the normal completion-delivery mechanism.

This is a separate parent-stream contract, not a variation of the regular announce flow.

## Key Findings

1. OpenClaw completion handling is two-phase: registry completion first, delivery cleanup second.
2. The dispatch split is exact and asymmetric: non-completion-message runs are queue-first, completion-message runs are direct-first.
3. `subagent_ended` is not always “run ended.” In completion-message flows it can be intentionally deferred until delivery cleanup succeeds.
4. `contextEngine.onSubagentEnded(...)` is later than many readers would expect. It is a cleanup-bookkeeping callback, not the first completion signal.
5. Delivery-target override is a narrow external completion-delivery feature, not a universal routing layer.
6. ACP parent-stream completion is a separate substrate and should not be used as evidence for ordinary subagent completion semantics.

## SNC Relevance

For SNC Milestone 2, this packet sharpens three practical constraints.

First, bounded delegation follow-up should treat “worker finished” and “result delivered back to operator-visible context” as separate milestones. If SNC later wants diagnostics, status UI, or continuity shaping around worker completion, it should not hook only the earliest end signal and assume user-visible completion has already happened.

Second, follow-up policy should preserve OpenClaw’s direct-versus-queue split instead of flattening everything into one callback. Completion-message flows are clearly optimized for explicit requester delivery, while non-completion-message flows prefer queue handling first.

Third, if SNC later adds operator-facing delegation summaries, the safest host seam is the registry/announce lifecycle boundary that already exists. ACP parent-stream behavior is useful for understanding alternate runtime delivery, but it is not the default donor path for ordinary SNC worker completion.

## Modification Guidance

Wrap:

- registry-observable completion state
- detached task delivery status for diagnostics
- completion delivery outcomes as operator-facing telemetry
- queue/direct branch awareness in SNC diagnostics and policy

Extend carefully:

- context-engine reaction to subagent completion only if SNC can tolerate delayed callbacks on completion-message flows
- external completion-target customization only through narrow, explicit hooks

Defer:

- any attempt to unify ACP parent-stream completion with ordinary subagent announce flow
- broad routing abstractions that assume all completion delivery uses the same target-selection path

Do not touch unless OpenClaw itself is blocking SNC:

- internal announce cleanup retry/defer bookkeeping
- descendant wake-and-replace mechanics
- queue mode semantics such as `steer` versus `steer-backlog`

## Still-unverified Questions

1. This packet confirms when ACP parent-stream is separate, but does not fully enumerate every higher-level product surface that consumes those parent-stream events.
2. The exact user-facing semantics of every queue mode after enqueueing were not expanded here beyond the queue decision and delivery classification points.
3. The registry and cleanup code clearly separate direct and queued completion handling, but this packet does not fully map every UI or shell command that later inspects detached task delivery status.
