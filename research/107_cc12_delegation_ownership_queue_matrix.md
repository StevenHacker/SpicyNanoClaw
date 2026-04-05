# CC-12 Delegation Ownership / Addressed Queue Matrix

## Purpose

This packet pins the exact Claude Code donor mechanics for delegation ownership, addressed queueing, and stop semantics.

The goal is not to restate that CC "has subagents" or "has teammates".
The goal is to verify:

- where the real async boundary lives
- how controller-vs-worker addressing is actually separated
- whether workers get their own queue or share a routed queue
- how `stop`, `interrupt current work`, `shutdown`, and `kill` differ in code

This packet is written to directly support `SNC-Milestone2-01` and `SNC-Milestone2-02`, especially controller-issued worker launch, worker diagnostics, and state hygiene.

## Scope

This packet stays on the delegation ownership and addressed-routing lane centered on:

- module-level command queue behavior
- `QueuedCommand.agentId` addressing
- background `local_agent` task ownership
- in-process teammate ownership and mailbox lifecycle
- stop/interrupt/kill/shutdown separation
- controller-vs-worker responsibility boundaries

It does not reopen:

- generic CC product-shell command UX
- pressure/compaction behavior already covered by `CC-10`
- memory donor behavior already covered by `CC-11`

## Main Entry Files

- `data/external/claude-code-leeyeel-4b9d30f/src/types/textInputTypes.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/messageQueueManager.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/queueProcessor.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/bootstrap/state.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/tools/AgentTool/AgentTool.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/tools/AgentTool/runAgent.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/tools/AgentTool/resumeAgent.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/tools/AgentTool/forkSubagent.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/tasks/LocalAgentTask/LocalAgentTask.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/tasks/InProcessTeammateTask/types.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/tasks/InProcessTeammateTask/InProcessTeammateTask.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/tasks/stopTask.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/tools/TaskStopTool/TaskStopTool.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/attachments.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/swarm/spawnInProcess.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/swarm/inProcessRunner.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/teammate.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/inProcessTeammateHelpers.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/screens/REPL.tsx`

## Verified Structure / Lifecycle / Contract

### 1. CC does not give each worker a separate command queue

The real queue substrate is the module-level `commandQueue` in `src/utils/messageQueueManager.ts`.

Verified properties:

- queue storage is global to the process
- priorities are `now > next > later`
- `dequeue`, `peek`, and `dequeueAllMatching` all accept filters
- the queue is used for user input, task notifications, and other deferred commands

So the donor pattern is not "one queue per worker".
It is "one shared queue plus routing metadata".

### 2. `QueuedCommand.agentId` is the actual addressed-routing boundary

`src/types/textInputTypes.ts` explicitly documents `QueuedCommand.agentId` as the receiver field:

- `undefined` means main thread
- subagents share the unified queue
- the drain gate filters on `agentId` so background task notifications do not leak into the coordinator context

This is the key donor mechanic for addressed queueing.

### 3. The main REPL drain only consumes main-thread commands

`processQueueIfReady(...)` in `src/utils/queueProcessor.ts` sets:

- `const isMainThread = (cmd) => cmd.agentId === undefined`

Then both `peek(...)` and `dequeue(...)` are filtered through that predicate.

This matters because CC previously had accidental isolation through separate queues; the current code deliberately recreates isolation through address filtering on top of one queue.

So the coordinator does not own "the whole queue".
It owns only the `agentId === undefined` slice.

### 4. Background `local_agent` workers are controller-owned tasks, not independent REPLs

The `AgentTool` path makes this explicit.

Verified behavior:

1. `AgentTool.tsx` resolves `rootSetAppState = setAppStateForTasks ?? setAppState`
2. async workers are registered through `registerAsyncAgent(...)`
3. foreground workers are registered through `registerAgentForeground(...)`
4. if a `name` is provided for an async worker, `agentNameRegistry` maps `name -> agentId`
5. completion/failure/kill notifications are enqueued back through `enqueueAgentNotification(...)`

Important implications:

- controller-visible lifecycle state is stored in the root task store
- worker follow-up routing is name/agent-id based, not queue-instance based
- completion notifications are controller-facing system messages, not worker-private mailbox items

### 5. Running `local_agent` follow-up uses task-local pending messages, not the command queue

`LocalAgentTaskState` has `pendingMessages: string[]`.

Verified flow:

1. when the user types while viewing a running local agent transcript, `REPL.tsx` calls `queuePendingMessage(task.id, input, setAppState)`
2. `queuePendingMessage(...)` appends to `task.pendingMessages`
3. `getAgentPendingMessageAttachments(...)` in `src/utils/attachments.ts` drains those messages with `drainPendingMessages(...)`
4. drained prompts become `queued_command` attachments with `origin.kind = "coordinator"`

So running background agents do not read from the module-level command queue for follow-up.
Their injected work arrives through task-local pending message state and is folded into the next agent turn as attachments.

### 6. Resuming a stopped `local_agent` is a new async lifecycle, not queue replay

`resumeAgentBackground(...)` reconstructs transcript state, re-registers the task through `registerAsyncAgent(...)`, and launches a new async lifecycle under the same agent id.

That means:

- follow-up to a completed/non-running background agent is not "append to pending queue"
- it is "resume the agent lifecycle with a new prompt"

This is an important ownership distinction for SNC diagnostics: a worker can be addressable after completion, but only by reactivation, not by mailboxing into a dead loop.

### 7. In-process teammates are long-lived workers with mailbox-plus-state routing

`spawnInProcessTeammate(...)` creates `InProcessTeammateTaskState` with:

- `identity.agentId`
- `identity.agentName`
- `identity.teamName`
- `pendingUserMessages`
- `awaitingPlanApproval`
- `isIdle`
- `shutdownRequested`
- `abortController`
- `currentWorkAbortController`

This is a different ownership model from `local_agent`:

- teammates are persistent worker identities inside a team
- they stay alive across prompts
- they can wait idle for more work
- they have both file-mailbox traffic and in-memory prompt injection

### 8. In-process teammate addressing has two real input lanes

#### 8.1 In-memory addressed lane

`injectUserMessageToTeammate(...)` appends to `pendingUserMessages` and also mirrors the user message into `task.messages`.

`waitForNextPromptOrShutdown(...)` polls `pendingUserMessages` first on every cycle and pops the oldest entry before touching the mailbox.

So when a controller is directly viewing or targeting an in-process teammate, the highest-priority lane is the task-local in-memory queue.

#### 8.2 Mailbox / task-list lane

If no in-memory prompt is pending, `waitForNextPromptOrShutdown(...)` then:

1. polls the file-based mailbox
2. prioritizes unread shutdown requests
3. then prioritizes unread team-lead messages
4. then falls back to first unread peer message
5. then checks the team task list for claimable work

So teammate routing is not a single FIFO inbox.
It is a priority ladder:

1. injected user prompt
2. shutdown request
3. leader message
4. peer message
5. task-list claim

### 9. Session cron tasks can also be worker-addressed

`bootstrap/state.ts` defines `SessionCronTask.agentId?`.

The file comment states that when this is set, scheduler fires route to that teammate's `pendingUserMessages` queue instead of the main REPL queue.

This is additional evidence that CC's real donor pattern is addressed delivery into worker-owned state, not cloned REPLs.

### 10. Stop, interrupt current work, shutdown, and kill are four different actions

#### 10.1 `stop_task` / `TaskStop` means "kill the running task implementation"

`TaskStopTool.ts` calls `stopTask(...)`.

`stopTask(...)`:

1. looks up the task in root AppState
2. requires `status === "running"`
3. resolves the task implementation by type
4. calls `taskImpl.kill(taskId, setAppState)`

So `stop_task` is a controller-side task kill surface, not a polite teammate request.

#### 10.2 `killAsyncAgent(...)` kills the whole background agent

For `local_agent` tasks, kill behavior is:

- abort `task.abortController`
- unregister cleanup
- mark status `killed`
- later enqueue a controller-facing notification unless already suppressed

This is full task termination.

#### 10.3 `currentWorkAbortController` interrupts only the current teammate turn

`inProcessRunner.ts` creates a fresh `currentWorkAbortController` per prompt iteration and passes it into `runAgent(...)`.

`useBackgroundTaskNavigation.ts` explicitly says Escape in teammate view aborts `currentWorkAbortController`, not the lifecycle `abortController`.

Verified effect:

- current turn stops
- teammate returns to idle
- an interrupt message is appended to transcript
- idle notification is emitted with `idleReason: "interrupted"`
- teammate remains alive for future work

This is a true per-turn interrupt seam.

#### 10.4 teammate shutdown is model-mediated, not auto-kill

`waitForNextPromptOrShutdown(...)` prioritizes shutdown requests and passes them back to the model as a new message.

The code comment is explicit:

- this keeps the teammate alive in idle state
- it does not auto-approve shutdown
- the model should make that decision

So shutdown is a negotiated control message, not the same as kill.

### 11. Controller vs worker responsibility split is explicit in code

The inspected files produce the following split.

| Concern | Controller / root owner | Worker owner |
| --- | --- | --- |
| Global command draining | main REPL via `processQueueIfReady(...)` | none |
| Task registration / status / progress | root AppState via `rootSetAppState` | none |
| Background-agent naming and addressing | `agentNameRegistry` in root AppState | none |
| Background-agent follow-up while alive | controller injects `pendingMessages` | worker consumes via attachment drain |
| Teammate lifecycle identity | root task store + team context | worker runs inside that identity |
| Teammate prompt delivery | controller/leader injects `pendingUserMessages` or mailbox messages | worker polls and consumes |
| Stop/kill task | controller via `TaskStop` or UI kill | none |
| Interrupt current teammate turn | controller/UI via `currentWorkAbortController` | worker reacts and returns idle |
| Shutdown request | controller sends request | worker model decides response |
| Completion notification to leader | worker emits idle/task messages | controller consumes and updates state |

### 12. Team ownership is intentionally flat, not recursively nested

`AgentTool.tsx` explicitly blocks teammates from spawning other teammates when a `name` would trigger team-member creation.
The comment says the team roster is flat and nested teammates would confuse the lead.

The same file also blocks in-process teammates from spawning background agents.

So CC's donor model is deliberately conservative:

- team lead owns the worker roster
- in-process teammates are workers, not sub-controllers
- recursive ownership expansion is blocked at the tool layer

## Addressed Queue / Ownership Matrix

| Lane | Storage substrate | Address key | Producer | Consumer | Verified note |
| --- | --- | --- | --- | --- | --- |
| Main REPL input / notifications | module-level `commandQueue` | `agentId === undefined` | user input, task notifications, control flows | main REPL drain | unified queue, filtered by address |
| Background `local_agent` live follow-up | `LocalAgentTaskState.pendingMessages` | task/agent id | controller while viewing or targeting worker | running background agent | drained as `queued_command` attachments |
| Background `local_agent` post-completion follow-up | resumed transcript + new async registration | existing `agentId` | controller | resumed agent lifecycle | not queue replay |
| In-process teammate direct input | `InProcessTeammateTaskState.pendingUserMessages` | teammate task id / identity | controller or scheduler | teammate poll loop | checked before mailbox |
| In-process teammate mailbox | file mailbox per teammate/team | teammate identity | leader or peers | teammate poll loop | leader messages outrank peer messages |
| In-process teammate task-list work | team task-list files | claimant agent name/id | team lead / shared task system | teammate poll loop | checked after mailbox |

## Key Findings

### 1. The strongest donor pattern is "shared substrate plus address filter", not "one worker, one queue"

CC's main delegation substrate is a unified queue and root task store with routing metadata layered on top.
SNC should borrow that idea, not imitate a fake multi-queue architecture.

### 2. CC separates worker follow-up by worker type

`local_agent` follow-up uses task-local pending messages and resume semantics.
In-process teammate follow-up uses persistent identity, `pendingUserMessages`, mailbox polling, and idle/shutdown handling.

So "worker" is not one generic contract inside CC.

### 3. Stop semantics are intentionally split into multiple control surfaces

The code makes a strong distinction between:

- kill the task
- interrupt the current turn
- request shutdown
- resume later

That separation is one of the most valuable donor ideas for SNC multi-worker control hygiene.

## SNC relevance

For SNC, the immediate value is not "copy CC teammates".
The value is the exact control model:

- use one durable controller-visible state surface for worker status
- use addressed delivery rather than duplicate global queues
- keep running-worker follow-up separate from completed-worker reactivation
- separate kill from interrupt-current-turn
- keep controller ownership of roster, routing, and diagnostics

This is especially relevant for:

- `SNC-Milestone2-01 Controller Launch Path`
- `SNC-Milestone2-02 Worker Diagnostics And State Hygiene`
- later multi-worker controls that must stay hot-pluggable inside OpenClaw

## Modification guidance

### Wrap / extend

- borrow the addressed-routing idea: one controller queue or event bus plus worker id targeting
- borrow the split between root-owned lifecycle state and worker-local execution state
- borrow the distinction between running-worker follow-up and dead-worker resume/relaunch
- borrow the split between `kill`, `interrupt current turn`, and `request shutdown`

### Defer

- full teammate mailbox/task-list machinery should be deferred unless SNC truly needs persistent peer-to-peer workers
- CC's plan-approval teammate flow should be treated as later governance/product behavior, not Milestone 2 baseline

### Avoid literal import

- do not cargo-cult CC's exact module layout (`commandQueue`, mailbox files, task list files) into SNC
- do not assume every SNC worker needs the same contract as CC in-process teammates
- do not let worker threads become sub-controllers by default; CC explicitly blocks recursive teammate ownership for a reason

### Safe host-fit direction for SNC

- keep OpenClaw as host owner
- implement SNC worker control as controller-issued, addressable, diagnostics-first utilities
- prefer explicit worker ids, explicit state transitions, and explicit interrupt semantics over implicit background churn

## Still-unverified questions

- This packet verified queueing and ownership for `local_agent` and in-process teammates, but did not fully map CC's remote-agent delegation control as a donor candidate.
- `SendMessage` tool internals were not re-opened here; this packet verified the storage/drain sites it feeds rather than every UI/tool call path that can target them.
- The exact teammate-side approval tools for shutdown acceptance/rejection were referenced by comments in `inProcessRunner.ts`, but their full downstream tool implementations were not re-read in this packet because the ownership boundary was already clear from the wait loop.
