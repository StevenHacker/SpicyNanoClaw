# OC-12 OpenClaw Worker Invocation Seam Matrix

## Purpose

This packet closes the remaining host ambiguity around real worker invocation for `Milestone 2`.

The goal is not to restate that OpenClaw has `sessions_spawn`.
The goal is to answer:

- which tool is the real launch seam
- which tool is the real wait/yield seam
- which tool is the real follow-up / steering seam
- how completion is actually pushed back to the controller
- where hooks, lifecycle events, and context-engine callbacks sit in that flow

This packet is specifically meant to support:

1. `SNC-Milestone2-01` controller-issued launch
2. `SNC-Milestone2-02` diagnostics/state hygiene
3. future host-safe worker evolution without mistaking registry plumbing for the public control contract

## Scope

This packet stays on the OpenClaw worker-invocation lane centered on:

- `sessions_spawn`
- `sessions_yield`
- `sessions_send`
- `subagents`
- subagent/ACP spawn plumbing
- completion announce plumbing
- hook / lifecycle / context-engine interactions that change controller behavior

It does not reopen:

- general runner timing already covered by `OC-10`
- plugin SDK stability already covered by `OC-11`
- broader delivery/install concerns that belong to `OC-13`

## Main Entry Files

- `data/external/openclaw-v2026.4.1/src/agents/openclaw-tools.ts`
- `data/external/openclaw-v2026.4.1/src/agents/pi-tools.ts`
- `data/external/openclaw-v2026.4.1/src/agents/tools/sessions-spawn-tool.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-spawn.ts`
- `data/external/openclaw-v2026.4.1/src/agents/acp-spawn.ts`
- `data/external/openclaw-v2026.4.1/src/agents/acp-spawn-parent-stream.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-registry.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-registry-run-manager.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-registry-lifecycle.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-registry-completion.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-announce.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-announce-delivery.ts`
- `data/external/openclaw-v2026.4.1/src/agents/tools/sessions-yield-tool.ts`
- `data/external/openclaw-v2026.4.1/src/agents/pi-embedded-runner/run/attempt.ts`
- `data/external/openclaw-v2026.4.1/src/agents/pi-embedded-runner/run/attempt.sessions-yield.ts`
- `data/external/openclaw-v2026.4.1/src/agents/tools/sessions-send-tool.ts`
- `data/external/openclaw-v2026.4.1/src/agents/tools/sessions-send-tool.a2a.ts`
- `data/external/openclaw-v2026.4.1/src/agents/tools/subagents-tool.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-control.ts`
- `data/external/openclaw-v2026.4.1/src/infra/agent-events.ts`
- `data/external/openclaw-v2026.4.1/src/tasks/task-executor.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/hooks.ts`
- `research/98_snc_worker_runtime_wiring_v1.md`

## Verified Structure / Lifecycle / Contract

### 1. Tool exposure order inside a live run

Worker-control tools are not bolted on later.
They are assembled as part of the normal coding-tool set:

1. `createOpenClawCodingTools(...)` in `src/agents/pi-tools.ts`
2. `createOpenClawTools(...)` in `src/agents/openclaw-tools.ts`
3. concrete worker/session tools:
   - `sessions_send`
   - `sessions_yield`
   - `sessions_spawn`
   - `subagents`

So the public invocation seam is the tool layer, not direct registry calls.

### 2. Role separation by tool

The four worker-adjacent tools do different jobs.

| Tool | Real role in code | What it is not |
| --- | --- | --- |
| `sessions_spawn` | launch a child worker/session | not a wait primitive |
| `sessions_yield` | intentionally end the current turn and wait for pushed follow-up | not a polling/status tool |
| `sessions_send` | send a follow-up message into an existing session | not a spawn primitive |
| `subagents` | list / kill / steer controller-owned child runs | not the canonical launch entry |

That separation is stable across the inspected code path.

### 3. Launch matrix

#### 3.1 `sessions_spawn` -> `runtime="subagent"`

Trigger order:

1. `sessions_spawn` validates params and rejects delivery-style fields like `target`, `channel`, `threadId`.
2. Tool defaults `runtime` to `"subagent"`.
3. Tool forwards into `spawnSubagentDirect(...)`.
4. `spawnSubagentDirect(...)` resolves:
   - spawn mode (`run` vs `session`)
   - requester/controller session key
   - depth limit
   - max active children
   - allowed target `agentId`
   - sandbox compatibility
   - model / thinking overrides
5. Host pre-creates child session metadata with `sessions.patch`.
6. If `thread=true`, it requires channel hook support through `subagent_spawning`.
7. Attachments are materialized if requested.
8. Host starts the child through gateway `agent` with:
   - `lane: AGENT_LANE_SUBAGENT`
   - `deliver: false`
   - child task message
   - subagent system prompt
9. Host registers the run with `registerSubagentRun(...)`.
10. Best-effort `subagent_spawned` hook runs.
11. `emitSessionLifecycleEvent(... reason: "create")` fires.
12. Tool returns `status: "accepted"` plus child session key and run id.

Important contract notes:

- `mode="session"` requires `thread=true`.
- cleanup is forced to `"keep"` for persistent session mode.
- controller ownership is captured at registration time, not inferred later.
- run waiting starts immediately inside `registerSubagentRun(...)`; the caller does not need to start a second watcher.

#### 3.2 `sessions_spawn` -> `runtime="acp"` with `streamTo != "parent"`

Trigger order:

1. Tool validates ACP-only inputs such as `resumeSessionId`.
2. Tool rejects unsupported ACP attachments.
3. Tool forwards into `spawnAcpDirect(...)`.
4. `spawnAcpDirect(...)` resolves:
   - ACP enabled/policy
   - sandbox incompatibility
   - target ACP agent
   - thread-binding policy when `thread=true`
   - effective stream plan
5. Host pre-creates the session via `sessions.patch`.
6. ACP runtime/session manager initializes the child session.
7. Optional thread binding is provisioned through ACP/channel binding machinery.
8. Host starts child task through gateway `agent`.
9. Control returns to `sessions_spawn`.
10. Because `streamTo !== "parent"`, accepted ACP run is registered into `registerSubagentRun(...)`.

Important contract notes:

- this path reuses the same registry/announce machinery as subagents
- there is no runtime discriminator in `SubagentRunRecord`
- this means ACP completion can flow back through the same pushed-completion lane used by subagents

#### 3.3 `sessions_spawn` -> `runtime="acp"` with `streamTo="parent"`

Trigger order:

1. Same ACP validation/init path as above.
2. Before dispatch, `startAcpSpawnParentStreamRelay(...)` subscribes to agent events for the child run.
3. Child `agent` call is sent.
4. Parent relay emits start/progress/stall/done/error notices as system events back toward the parent session.
5. ACP background task record is created with `createRunningTaskRun(... runtime: "acp")`.
6. Tool returns `accepted`.

Important contract notes:

- this branch does **not** register into subagent registry
- completion comes back as parent stream/system-event progress, not through `subagent_announce` cleanup flow
- it is the most product-like ACP progress path, but not the same seam SNC currently consumes in `afterTurn(...)`

### 4. Wait/yield matrix

#### 4.1 `sessions_yield` is the host wait seam for push-based follow-up

Trigger order:

1. `sessions_yield` validates session context and `onYield` support.
2. Tool calls the injected `onYield(message)` callback from the active attempt.
3. In `run/attempt.ts`, `onYield`:
   - marks `yieldDetected = true`
   - stores `yieldMessage`
   - queues a hidden interrupt message
   - aborts the run with reason `"sessions_yield"`
   - requests session abort
4. `attempt.ts` intercepts the abort and returns a synthetic aborted response instead of a real provider turn.
5. Abort settle is awaited briefly.
6. Synthetic abort artifacts are stripped from transcript/runtime state.
7. Hidden yield context message is persisted through `persistSessionsYieldContextMessage(...)`.
8. Attempt result returns with `yieldDetected`.

The persisted hidden context explicitly tells the next turn:

- previous turn ended intentionally via `sessions_yield`
- it was waiting for follow-up

So `sessions_yield` is not a no-op UX helper.
It is a real host control seam that intentionally stops the current turn while preserving hidden continuation context for the next one.

#### 4.2 Why this matters to pushed worker completion

The accepted note returned by subagent spawns tells the caller not to poll.
That guidance matches the runtime shape:

- spawn child
- optionally `sessions_yield`
- let pushed completion arrive as later input/internal event

This is the cleanest non-polling orchestration loop the host currently exposes.

### 5. Follow-up matrix

#### 5.1 `sessions_send` is the targeted follow-up seam

Trigger order:

1. Resolve requester/session visibility and agent-to-agent policy.
2. Resolve target via `sessionKey` or `label`.
3. Start a target run through gateway `agent` using:
   - `deliver: false`
   - `channel: INTERNAL_MESSAGE_CHANNEL`
   - `lane: AGENT_LANE_NESTED`
   - inter-session provenance
4. Branch by timeout:
   - `timeoutSeconds = 0`
     - return `accepted`
     - launch async A2A flow later
   - `timeoutSeconds > 0`
     - wait on `agent.wait`
     - diff `chat.history`
     - return `ok` with latest reply if a new assistant reply appeared
     - then start A2A flow

The A2A flow in `sessions-send-tool.a2a.ts` can:

- optionally ping-pong between requester and target for bounded extra turns
- run a final announce step
- externally send the synthesized result

So `sessions_send` is a continuation/follow-up lane, not a child-worker launch lane.

#### 5.2 Safe reading for SNC

If SNC wants:

- initial worker creation: use `sessions_spawn`
- deliberate wait for pushed result: use `sessions_yield`
- targeted follow-up into known child session: use `sessions_send`

Treating `sessions_send` as a spawn substitute would fight the host model.

### 6. Kill / steer matrix

#### 6.1 `subagents list`

`subagents action="list"` resolves a controller session and shows controller-owned child runs from registry state.

Verified control rules:

- main/non-subagent callers get `controlScope: "children"`
- leaf subagents resolve `controlScope: "none"`
- list is controller-owned, not global

#### 6.2 `subagents kill`

Trigger order:

1. Resolve controller session.
2. Enforce ownership and control-scope rules.
3. Resolve target child run.
4. Kill current run by:
   - aborting embedded PI run if session id maps to one
   - clearing queued follow-ups/lane work
   - marking run terminated in registry
5. Cascade into descendants.
6. Emit `subagent_ended` hook best-effort for killed entries.

#### 6.3 `subagents steer`

Trigger order:

1. Resolve controller + ownership.
2. Reject self-steer and finished targets.
3. Apply rate limit.
4. Mark previous run with `suppressAnnounceReason = "steer-restart"`.
5. Abort embedded run / clear queues.
6. Best-effort wait for old run to settle.
7. Start a new gateway `agent` run against the same child session.
8. Replace registry record through `replaceSubagentRunAfterSteer(...)`.

Important contract note:

- steering is implemented as restart-in-place, not as a lightweight message append

### 7. Pushed completion handling matrix

#### 7.1 Registry wait path

For registered runs, completion monitoring starts automatically in `registerSubagentRun(...)`:

1. create task record
2. ensure lifecycle listener
3. persist registry state
4. immediately start `agent.wait`

This means controller-facing completion is primarily registry-driven, not tool-call-driven.

#### 7.2 Lifecycle listener fallback

`subagent-registry.ts` also subscribes to `onAgentEvent(...)` lifecycle events.

Observed branch behavior:

- `start` updates started/session timestamps
- `error` is deferred through a retry grace timer
- `end` or post-grace `error` calls `completeSubagentRun(...)`

So host completion is not based on one signal only.
It uses:

- RPC `agent.wait`
- global lifecycle events

#### 7.3 Completion cleanup flow

When `completeSubagentRun(...)` fires:

1. `endedAt`, `outcome`, `endedReason` are frozen
2. latest result text is captured from child session
3. detached task state is finalized
4. `sessions.changed` lifecycle event is emitted unless suppressed for steer restart
5. if completion message is expected, ended hook is deferred until announce cleanup
6. `startSubagentAnnounceCleanupFlow(...)` launches

Then `runSubagentAnnounceFlow(...)`:

1. may wait for descendant runs to settle
2. reads child output / frozen fallback
3. resolves internal vs external requester shape
4. builds internal completion event / trigger message
5. delivers completion either:
   - queued/steered into active requester session
   - direct agent call into requester session
6. on success:
   - delivery status becomes delivered
   - deferred `subagent_ended` hook may run
   - cleanup/delete or keep happens
   - `contextEngine.onSubagentEnded(...)` is notified with `completed` or `deleted`

This is the exact host seam SNC is already exploiting in `research/98_snc_worker_runtime_wiring_v1.md`:

- pushed completion becomes a later session message / internal event
- SNC can consume it in `afterTurn(...)`

### 8. Hook and context-engine interaction notes

Verified hook / engine touchpoints:

- `subagent_spawning`
  - sequential
  - used to provision thread binding readiness before spawn success
- `subagent_spawned`
  - fire-and-forget
  - runs after successful registration
- `subagent_ended`
  - may be deferred until completion announce is delivered
  - emitted best-effort once
- `subagent_delivery_target`
  - can reroute completion delivery target
- `contextEngine.onSubagentEnded(...)`
  - best-effort callback on completion/delete/release from registry lifecycle

So the host already has a real extension surface around worker lifecycle, but the most important user-visible result still comes through the session message / announce path, not just hook execution.

## Key Findings

### 1. `sessions_spawn` is the only real launch seam

Everything else is downstream:

- `sessions_yield` stops and waits
- `sessions_send` follows up
- `subagents` inspects or intervenes after launch

### 2. The host has two distinct completion-return channels

- registered-run completion channel:
  - subagent registry
  - announce cleanup flow
  - later session/internal event delivery
- ACP parent-stream channel:
  - `startAcpSpawnParentStreamRelay(...)`
  - system-event progress back to parent

These should not be treated as the same mechanism.

### 3. `sessions_yield` is a real lifecycle seam, not a UI convenience

It aborts the active attempt intentionally, strips synthetic artifacts, and persists hidden continuation context for the next turn.

### 4. `subagents steer` is restart semantics, not message semantics

The control path kills/settles the old run and starts a new run in the same child session.

### 5. ACP non-parent spawns reuse subagent registry semantics more than their naming suggests

`sessions_spawn(runtime="acp")` with `streamTo != "parent"` re-enters `registerSubagentRun(...)`.
That means completion handling is more unified than surface naming implies.

### 6. The registry layer does not record runtime kind

`SubagentRunRecord` stores no `runtime: "subagent" | "acp"` discriminator.
That is a real code fact and matters for how confidently higher-level control surfaces can assume runtime-specific behavior.

## SNC relevance

This packet matters directly for `Milestone 2`.

1. SNC controller launch should treat `sessions_spawn` as the only host-grade child-launch primitive.

2. If SNC wants push-based result handling instead of same-turn blocking, `sessions_yield` is the clean host-supported handoff point.

3. SNC can continue consuming pushed completion in `afterTurn(...)` because the host really does convert child completion into later session/internal-event delivery through announce flow.

4. For bounded helper workers, the safest first lane is still:
   - `runtime="subagent"`
   - `mode="run"`
   - child result pushed back through announce flow

5. ACP is useful, but should be treated as a separate transport mode with two different completion behaviors:
   - stream relay to parent
   - registry-backed announce reuse

6. Worker diagnostics in SNC should key off host realities:
   - registry/task record
   - deferred announce delivery
   - hidden yield context
   - control-scope ownership

## Modification guidance

### Wrap / extend

- Build SNC launch behavior around `sessions_spawn`.
- Use `sessions_yield` as the host-approved way to stop the current controller turn and await pushed worker follow-up.
- Use `sessions_send` only for targeted continuation into known child sessions.
- Treat pushed completion messages/internal events as the main SNC fold-back seam.
- If SNC needs richer delivery routing later, prefer hook seams such as `subagent_delivery_target` over host-core rewrites.

### Extend carefully

- Use `subagents` for bounded control/diagnostics, but keep in mind it is a controller-owned run surface, not a general task system.
- Treat ACP `streamTo="parent"` as a different UX/product path from registry-backed worker completion.
- Treat `contextEngine.onSubagentEnded(...)` as best-effort lifecycle signal, not the sole source of truth for worker result ingestion.

### Defer

- Defer any attempt to replace the subagent registry/announce pipeline with SNC-owned lifecycle plumbing.
- Defer ACP-specific steer/kill assumptions until ACP control parity is proven in code, not inferred from shared registry use.
- Defer scheduler-style ownership; the current host seams are one-shot launch plus bounded follow-up/control.

### Avoid

- Do not treat `sessions_send` as a launch primitive.
- Do not poll `sessions_list` / `sessions_history` as a normal completion strategy when the host already provides push-based completion.
- Do not assume ACP and embedded subagent runs have identical control semantics just because both can enter the same registry.
- Do not bind SNC directly to internal registry cleanup timing beyond the observable pushed-completion/message contract.

## Still-unverified questions

1. ACP runs without `streamTo="parent"` are tracked through the same registry as subagents, but this packet did not prove that `subagents kill/steer` has full ACP-runtime parity. The control code still looks biased toward embedded-run handling.

2. This packet confirms `subagent_ended` can be deferred until completion delivery, but it does not exhaustively map every plugin that might depend on that exact ordering.

3. The packet confirms the controller-facing push path for child completion, but it does not fully expand the downstream queue-mode differences inside `subagent-announce-dispatch.ts`.

4. The packet does not prove which completion-return channel the product should prefer long term for ACP-heavy workflows:
   - parent stream relay
   - registry-backed announce reuse

