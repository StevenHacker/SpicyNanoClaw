# CC-13 Delegation Follow-Up / Remote-Agent Control Matrix

## Purpose

This packet closes the remaining CC donor question around post-launch follow-up and control.

The goal is not to restate that CC has subagents, teammates, or remote tasks.
The goal is to pin:

- how follow-up differs for running local agents, stopped local agents, teammates, and remote agents
- what `SendMessage` actually controls
- where resume begins and where it stops
- which control surfaces are reusable donor patterns
- which remote-control paths are product/service-shell coupled

## Scope

This packet stays on the narrow lane defined in claim `35`:

- `SendMessageTool`
- `resumeAgentBackground(...)`
- teammate execution backends and control interfaces
- in-process teammate task follow-up surfaces
- remote-agent local wrapper / restore / kill behavior
- shutdown / approval / terminate / kill separation

It does not reopen:

- generic CC shell UX
- broader ownership/queue mechanics already accepted in `research/107_cc12_delegation_ownership_queue_matrix.md`
- Anthropic product-service APIs beyond what is needed to separate donor value from product coupling

## Main Entry Files

- `data/external/claude-code-leeyeel-4b9d30f/src/tools/SendMessageTool/SendMessageTool.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/tools/AgentTool/resumeAgent.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/tasks/LocalAgentTask/LocalAgentTask.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/tasks/InProcessTeammateTask/InProcessTeammateTask.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/tasks/RemoteAgentTask/RemoteAgentTask.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/swarm/backends/types.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/swarm/backends/InProcessBackend.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/swarm/backends/PaneBackendExecutor.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/tasks/stopTask.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/tools/TaskStopTool/TaskStopTool.ts`
- `research/107_cc12_delegation_ownership_queue_matrix.md`

## Verified Structure / Lifecycle / Contract

### 1. Follow-up matrix by worker class

| Worker class | Running follow-up path | Completed / stopped follow-up path | Primary state substrate | Important boundary |
| --- | --- | --- | --- | --- |
| `local_agent` | `SendMessageTool` resolves `agentId`, verifies `isLocalAgentTask(...)`, and calls `queuePendingMessage(...)` | `resumeAgentBackground(...)` reconstructs transcript state and starts a new async lifecycle under the same `agentId` | task-local `pendingMessages` plus transcript / metadata on disk | running follow-up is not mailboxing; stopped follow-up is not queue replay |
| in-process teammate | direct viewed follow-up uses `injectUserMessageToTeammate(...)` into `pendingUserMessages`; ordinary `SendMessage` to teammate name uses mailbox delivery | no transcript-resume path is shown in the inspected teammate control path; once dead, this is a spawn problem, not a resume problem | task-local `pendingUserMessages` plus mailbox plus teammate task state | teammate follow-up is a different ownership model from `local_agent` |
| pane teammate | `SendMessage` and `PaneBackendExecutor.sendMessage(...)` write to teammate mailbox | no resume-from-transcript path is present here; pane lifecycle is external and would need respawn | mailbox plus pane process | pane workers use the same logical executor interface but not the same in-memory follow-up lane |
| `remote_agent` | no live follow-up injection path is visible in these files | `restoreRemoteAgentTasks(...)` only reattaches a local poller to a still-running remote session; it is not prompt resume | remote session plus local sidecar metadata plus polling task | remote-agent wrapper is task monitoring, not a teammate-style inbox loop |

The most important donor read is that CC does not use one universal "follow up the worker" mechanism.
It uses different mechanisms depending on worker class and lifecycle state.

### 2. Running local-agent follow-up is task-local, not shared-queue routing

`SendMessageTool` has a special-case path before teammate mailbox delivery:

1. resolve `input.to` through `agentNameRegistry` or `toAgentId(...)`
2. look up `appState.tasks[agentId]`
3. if it is a non-main-session `local_agent` and `status === "running"`, call `queuePendingMessage(...)`
4. deliver the message at the worker's next tool round

This matches the accepted `CC-12` read:

- running `local_agent` follow-up uses task-local `pendingMessages`
- the worker later drains those into attachments for the next turn
- the module-level command queue is not the live follow-up substrate here

So CC distinguishes:

- controller-owned addressed worker follow-up
- from generic queued command draining

### 3. Stopped local-agent follow-up is resume, not posthumous mailbox delivery

When `SendMessageTool` finds a named or raw-id local agent that is no longer running, it does not enqueue a dead-letter message.
It tries `resumeAgentBackground(...)`.

Verified resume steps:

1. load transcript and metadata with `getAgentTranscript(...)` and `readAgentMetadata(...)`
2. filter transcript into a resumable message set
3. reconstruct replacement/tool-result state through `reconstructForSubagentResume(...)`
4. reuse the old worktree path if it still exists
5. `registerAsyncAgent(...)`
6. launch a new async lifecycle through `runAsyncAgentLifecycle(...)`

This is an exact donor distinction:

- running local worker follow-up = inject into live task-local pending state
- completed local worker follow-up = resume a new async lifecycle using durable local transcript state

### 4. Teammate follow-up and teammate control are separate surfaces

For teammate names, `SendMessageTool` falls through to mailbox-oriented behavior:

- plain text -> `handleMessage(...)` -> `writeToMailbox(...)`
- broadcast `*` -> `handleBroadcast(...)` -> write to each teammate mailbox
- structured control messages -> dedicated handlers

Structured control messages are explicitly limited to:

- `shutdown_request`
- `shutdown_response`
- `plan_approval_response`

This matters because the same tool name hides two very different roles:

- ordinary teammate communication
- structured control/approval signaling

It is not one generic message API.

### 5. `SendMessage` targeting is broader than teammates, but cross-session control is intentionally narrowed

When `UDS_INBOX` is enabled, `SendMessageTool` also accepts:

- `uds:<socket-path>`
- `bridge:<session-id>`

Verified constraints:

- `bridge:` requires explicit user permission with `behavior: "ask"` and a `safetyCheck` reason
- structured messages cannot be sent cross-session
- `bridge:` only allows plain text
- active remote-control bridge connectivity is required
- structured messages cannot be broadcast

So the cross-session surface exists, but it is deliberately narrowed to plain-text prompt injection.

This is a strong donor lesson:

- cross-session text follow-up can exist
- but control messages should not silently cross trust/session boundaries

### 6. Graceful terminate, force kill, and plan/shutdown approvals are intentionally separate

`src/utils/swarm/backends/types.ts` defines a backend-agnostic `TeammateExecutor` with:

- `sendMessage(...)`
- `terminate(...)`
- `kill(...)`
- `isActive(...)`

This interface is implemented by both:

- `InProcessBackend`
- `PaneBackendExecutor`

Verified behavior:

- `sendMessage(...)` writes a message to the teammate channel
- `terminate(...)` sends a graceful shutdown request
- `kill(...)` performs immediate termination
- `isActive(...)` is a read-only state probe

The implementations preserve the distinction:

- `InProcessBackend.terminate(...)` writes a structured shutdown request and marks `shutdownRequested`
- `InProcessBackend.kill(...)` force-aborts the in-process teammate
- `PaneBackendExecutor.terminate(...)` writes a shutdown request to mailbox
- `PaneBackendExecutor.kill(...)` kills the pane directly

This separation is one of the clearest long-range harness donors in the repo.

### 7. Approval/shutdown handlers prove that "control" is not synonymous with "kill"

`SendMessageTool` handlers add a second layer of separation.

Verified behavior:

- `handleShutdownRequest(...)` writes a structured shutdown request into mailbox
- `handleShutdownApproval(...)` may abort the in-process teammate's own controller directly, or fall back to `gracefulShutdown(...)`
- `handlePlanApproval(...)` and `handlePlanRejection(...)` write approval responses back to the target mailbox

The key read is:

- approval traffic is its own surface
- graceful shutdown is its own surface
- immediate termination is its own surface

This matches and sharpens the accepted `CC-12` ownership packet.

### 8. `TaskStop` remains a controller-side kill surface, not a graceful teammate surface

`TaskStopTool.ts` calls `stopTask(...)`.
`stopTask(...)`:

1. looks up the task by id
2. requires it to be running
3. resolves the task implementation by type
4. calls `taskImpl.kill(...)`

That means `TaskStop` belongs to a different control family from teammate `terminate(...)`.

Exact separation:

- `TaskStop` = controller kill of the active task implementation
- `terminate(...)` = graceful shutdown request
- `kill(...)` = immediate force termination
- plan/shutdown approval messages = structured coordination traffic

This distinction matters for donor use.
If SNC later grows stronger worker hygiene, it should preserve separate operator verbs instead of routing everything through one generic "stop" path.

### 9. Remote-agent tasks are local wrappers around remote sessions, not teammate-style workers

`RemoteAgentTask.tsx` shows a different lifecycle from both `local_agent` and teammate paths.

Verified registration flow:

1. `registerRemoteAgentTask(...)` creates a local `remote_agent` task record
2. it persists sidecar metadata through `writeRemoteAgentMetadata(...)`
3. it starts polling via `startRemoteSessionPolling(...)`

Verified restore flow:

1. `restoreRemoteAgentTasks(...)` scans sidecar metadata
2. fetch live remote status with `fetchSession(...)`
3. drop `404` or `archived` sessions instead of resurrecting them
4. reconstruct local running task state
5. restart polling

Verified kill flow:

1. mark the local task `killed`
2. emit SDK terminated event
3. archive the remote session through `archiveRemoteSession(...)`
4. evict local output
5. remove sidecar metadata

So the remote-agent contract in the inspected code is:

- local wrapper
- remote session poller
- durable sidecar for reattachment
- local notification delivery

It is not:

- a teammate mailbox loop
- a local transcript-resume worker
- a generic prompt-follow-up substrate

### 10. Remote control and remote-agent monitoring are different concepts

The repo exposes two different remote-adjacent ideas that are easy to confuse:

| Surface | What it does | What it does not do |
| --- | --- | --- |
| `bridge:<session-id>` inside `SendMessageTool` | plain-text prompt injection to a remote-control peer, gated by explicit permission and active bridge connection | not a structured control or remote-agent task API |
| `RemoteAgentTask` | local monitoring, restore, notification, and archive control for a remote Claude session | not a mailbox-style follow-up channel |

This is one of the most important donor-risk separations in the packet.

### 11. What is worth borrowing later vs what is product/service-shell coupled

Worth borrowing later:

- separate live follow-up from completed-worker resume
- separate `sendMessage`, `terminate`, `kill`, and `isActive`
- treat cross-session text delivery as a different trust class from local structured control
- use local durable metadata to reattach monitoring to long-lived external work
- keep controller ownership of worker roster, diagnostics, and control routing

Product/service-shell coupled:

- `bridge:` remote-control specifics and REPL bridge connectivity
- `uds:` peer transport specifics
- remote session URLs, CCR/teleport session storage, and archive behavior
- Claude.ai cloud-environment preconditions and service onboarding

## Key Findings

1. CC has no single universal worker follow-up substrate. Running local agents, stopped local agents, teammates, and remote agents all use different mechanisms.
2. The strongest donor pattern is the explicit control-surface split: message, resume, graceful terminate, force kill, and approval signaling are intentionally different.
3. Remote control and remote-agent monitoring are different systems. The reusable idea is the boundary discipline, not the Anthropic-specific transport/service shell.

## SNC relevance

This packet is more useful for long-range SNC and future custom-Claw worker design than for immediate feature breadth.

The practical value is:

- do not collapse live follow-up, resume, and kill into one vague "worker control" API
- keep controller ownership of routing and diagnostics explicit
- if SNC later grows beyond one-shot helper launch, prefer a backend/control interface that separates:
  - text follow-up
  - graceful shutdown
  - immediate kill
  - liveness probe
- if SNC ever needs remote or sidecar workers, borrow the idea of local reattachment metadata and monitoring wrappers, not CC's product-specific remote stack

## Modification guidance

- `wrap / extend`
  - borrow the control-surface split as a design law for future SNC worker adapters
  - borrow the distinction between running-worker follow-up and completed-worker resume
  - borrow backend-agnostic executor interfaces if SNC later supports more than one worker substrate

- `defer`
  - any SNC analogue of remote-agent reattachment should stay deferred until there is a real non-local worker substrate
  - mailbox-style multi-teammate behavior should stay deferred unless SNC actually needs persistent worker identities

- `avoid`
  - do not copy `bridge:` / `uds:` / CCR remote-control transport literally into SNC
  - do not treat Anthropic remote-session wrappers as if they were generic harness primitives
  - do not collapse graceful terminate and force kill into one operator action

## Still-unverified questions

1. This packet confirms the local wrapper behavior of `RemoteAgentTask`, but it does not fully map every upstream tool that creates those remote sessions.
2. The inspected files show exact `SendMessage` constraints for `bridge:` and `uds:`, but not the full remote-control product UX outside this tool path.
3. Pane-based teammate restart/reattach behavior beyond the executor layer was not expanded here because claim `35` is follow-up/control focused, not pane lifecycle archaeology.
