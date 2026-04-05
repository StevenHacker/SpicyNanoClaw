# CC-08 Tasks / Background / Subagent Infrastructure Deep Packet

## Scope

This packet deepens the task/runtime and subagent-adjacent surfaces in CC. It is deliberately narrower than CC-01: the focus here is task state, background/local main-session flows, stop and interrupt behavior, and the infrastructure that makes local helper workers and subagents durable.

## 1. Task / Subagent Infrastructure Map

- `Task.ts` is the canonical task model. It defines task kinds, terminal statuses, task ID generation, and the shared base fields used by every task type. The important part for SNC is that task identity and output location are runtime primitives, not UI afterthoughts. See `data/external/claude-code-leeyeel-4b9d30f/src/Task.ts:1-98`.
- `tasks.ts` is a thin type registry over concrete task implementations. It does not own lifecycle logic; it only resolves a `TaskType` to the right `kill()` implementation. See `data/external/claude-code-leeyeel-4b9d30f/src/tasks.ts:1-38`.
- `utils/task/framework.ts` is the shared task store layer. It owns `registerTask`, `updateTaskState`, eager terminal eviction, attachment generation, and task notification fan-out. The key donor pattern is that the framework is stateful but not feature-specific. See `data/external/claude-code-leeyeel-4b9d30f/src/utils/task/framework.ts:48-274`.
- `LocalAgentTask` is the local agent lifecycle wrapper. It owns background/foreground toggles, pending message buffering, retain/disk-loaded UI state, completion, failure, and kill semantics. See `data/external/claude-code-leeyeel-4b9d30f/src/tasks/LocalAgentTask/LocalAgentTask.tsx:123-144,281-450,462-567`.
- `LocalMainSessionTask` is the special-case wrapper for backgrounding the current main query. It reuses the `LocalAgentTaskState` shape, but tags it as `agentType: 'main-session'` and gives it its own transcript/output chain. See `data/external/claude-code-leeyeel-4b9d30f/src/tasks/LocalMainSessionTask.ts:91-474`.
- `InProcessTeammateTaskState` is the plain-data state shape for in-process subagents. It stores a persistent identity, a whole-worker abort controller, a current-work abort controller, mailbox-facing pending messages, and idle/shutdown state. See `data/external/claude-code-leeyeel-4b9d30f/src/tasks/InProcessTeammateTask/types.ts:13-71`.
- `spawnInProcessTeammate` is the creation seam for those helper workers. It links the teammate to the leader session, creates an independent abort controller, registers cleanup, and seeds the task state in AppState. See `data/external/claude-code-leeyeel-4b9d30f/src/utils/swarm/spawnInProcess.ts:104-201`.
- `inProcessRunner.ts` is the actual teammate runtime loop. It is where permission handling, mailbox fallback, idle notifications, current-turn aborts, and lifecycle aborts converge. See `data/external/claude-code-leeyeel-4b9d30f/src/utils/swarm/inProcessRunner.ts:117-1549`.
- `RemoteAgentTask` is a sibling runtime, not a clone of the local helper-worker path. It adds remote session polling, metadata persistence, long-running review handling, and remote completion checks. See `data/external/claude-code-leeyeel-4b9d30f/src/tasks/RemoteAgentTask/RemoteAgentTask.tsx:22-41,166-189,397-437,564-841`.

## 2. Queue / Ownership / Interrupt Note

- The command queue is process-global, but ownership is explicit. In `query.ts`, the main thread drains commands with no `agentId`, while subagents only consume `task-notification` commands addressed to their own `agentId`. User prompts still go only to the main thread. See `data/external/claude-code-leeyeel-4b9d30f/src/query.ts:1562-1577`.
- `querySource` is the other half of ownership. It separates main-thread, SDK, and repl-main-thread flows from subagent flows, and it gates things like cache-safe stop-hook snapshots and background-bookkeeping sidecars. See `data/external/claude-code-leeyeel-4b9d30f/src/query.ts:373-378,1683-1687` and `data/external/claude-code-leeyeel-4b9d30f/src/query/stopHooks.ts:90-169`.
- `stopTask()` is task-level stop. It validates that the task exists, is running, and has a registered implementation before dispatching to the concrete task's `kill()` method. It then applies type-specific notification suppression for local shell tasks. See `data/external/claude-code-leeyeel-4b9d30f/src/tasks/stopTask.ts:34-97`.
- `query.ts` handles intra-turn aborts separately from task stop. Streaming aborts return `aborted_streaming`; tool-phase aborts return `aborted_tools`. That is a different layer from task kill, even though they are both user-visible interrupts. See `data/external/claude-code-leeyeel-4b9d30f/src/query.ts:1007-1052,1489-1515`.
- `stopHooks.ts` is a third boundary. It runs stop/teammate-idle/task-completed hooks, but only saves cache-safe params for main session queries, and it skips main-thread-only cleanup when the turn belongs to a subagent. See `data/external/claude-code-leeyeel-4b9d30f/src/query/stopHooks.ts:90-169,180-450`.
- The in-process teammate runtime splits stop into two meanings: a whole-worker lifecycle abort and a current-work abort. `InProcessTeammateTaskState.abortController` kills the teammate, while `currentWorkAbortController` only aborts the current turn. See `data/external/claude-code-leeyeel-4b9d30f/src/tasks/InProcessTeammateTask/types.ts:36-37` and `data/external/claude-code-leeyeel-4b9d30f/src/utils/swarm/inProcessRunner.ts:1205-1315`.
- `LocalMainSessionTask` reuses the existing abort controller when backgrounding an active query. That matters because stop should hit the actual foreground query object, not a detached wrapper. See `data/external/claude-code-leeyeel-4b9d30f/src/tasks/LocalMainSessionTask.ts:91-115,338-387`.

## 3. Durable Donor Patterns

- Persistent owner plus separate loop. `QueryEngine` owns turn history and session state, while `query.ts` owns the per-turn execution loop. The task layer then wraps lifecycle and visibility around that core. This is the cleanest reusable shape for SNC. See `data/external/claude-code-leeyeel-4b9d30f/src/QueryEngine.ts:103-188` and `data/external/claude-code-leeyeel-4b9d30f/src/query.ts:189-291`.
- Re-registration preserves UI-held state. `registerTask()` keeps `retain`, `startTime`, `messages`, `diskLoaded`, and `pendingMessages` when a task is replaced. That prevents resume/background transitions from clobbering the viewed transcript or pending UI state. See `data/external/claude-code-leeyeel-4b9d30f/src/utils/task/framework.ts:77-101`.
- Terminal eviction is deliberately gated. The framework only evicts terminal tasks after they are notified, and it respects `retain` plus `evictAfter` grace periods. This is a good pattern for any host that needs safe GC after user-visible completion. See `data/external/claude-code-leeyeel-4b9d30f/src/utils/task/framework.ts:125-138,236-241`.
- Backgrounded main session output is isolated. `LocalMainSessionTask` writes to a per-task transcript symlink and explicitly avoids the main session transcript path, so `/clear` does not corrupt the background query's history. See `data/external/claude-code-leeyeel-4b9d30f/src/tasks/LocalMainSessionTask.ts:103-107,360-416`.
- Queue ownership is explicit, not implicit. The same global queue can safely serve the main thread and subagents because address and mode determine who consumes what. That is a durable donor pattern for multi-worker runtimes. See `data/external/claude-code-leeyeel-4b9d30f/src/query.ts:1562-1577`.
- Dual abort semantics are the strongest portability lesson. CC distinguishes "stop this turn" from "kill the whole worker," and that distinction is already embodied both in task state and in the in-process runner. See `data/external/claude-code-leeyeel-4b9d30f/src/tasks/InProcessTeammateTask/types.ts:36-37` and `data/external/claude-code-leeyeel-4b9d30f/src/utils/swarm/inProcessRunner.ts:1213-1297`.
- Notification dedupe is always state-backed. Task completions mark `notified` before emission, and attachment generation treats notified terminal tasks as evictable rather than re-announcing them. That is the right default for any long-lived helper-worker model. See `data/external/claude-code-leeyeel-4b9d30f/src/tasks/stopTask.ts:65-97`, `data/external/claude-code-leeyeel-4b9d30f/src/utils/task/framework.ts:158-274`, and `data/external/claude-code-leeyeel-4b9d30f/src/tasks/LocalMainSessionTask.ts:224-262`.

## 4. SNC Relevance

- Best direct fit: background local main-session flow. SNC already wants a writing session that can continue without contaminating the foreground prompt, and CC's isolated transcript plus background notification pattern is the closest donor.
- Best helper-worker fit: in-process teammate runtime. If SNC eventually needs local research, extraction, or maintenance sidecars, the teammate identity plus parent-session linkage is the most useful CC abstraction here.
- Best state-management fit: the shared framework. `registerTask`, `updateTaskState`, `generateTaskAttachments`, and eager eviction are the reusable host-grade pieces that make background work predictable.
- Less direct fit: remote agent tasks. They are still useful as lifecycle references, but they are too tied to CC's remote session/product layer to copy literally into SNC v1.

## 5. Modification Guidance

- Wrap preferred: `registerTask`, `updateTaskState`, `evictTerminalTask`, `stopTask`, and the queue filter in `query.ts`. These are stable seams, not places to bake in SNC policy.
- Hot-pluggable seam: `LocalMainSessionTask`. It already behaves like a policy wrapper over the core query loop, so SNC can adapt the pattern without rewriting the runtime.
- Extend with care: `InProcessTeammateTaskState`, `spawnInProcessTeammate`, and the in-process runner. They are the right place for helper-worker policy if SNC grows beyond one foreground session.
- Internal edit only if proven necessary: `query.ts` stop/abort branches and `query/stopHooks.ts`. Those are the shared termination boundaries, so changes there have the highest blast radius.
- Out of SNC v1 scope: remote review/teleport plumbing, local shell notification formatting, and product-shell-specific status copy.
- Do not widen the generic task framework into feature-specific one-offs. The donor value is that the framework stays boring while the task types stay expressive.

## 6. Still-Unverified Questions

- I did not fully trace every `LocalAgentTask` transition, especially the foreground/background toggle paths and how they interact with retain and resume.
- I sampled the remote task family structurally, but I did not exhaustively walk every kill/completion branch.
- I did not verify whether any non-task background channels share the same pending-notification queue in a way that would matter to SNC.
- I have not replay-tested the exact stop-hook and interrupt ordering under all partial-stream and partial-tool-result failure cases.
- If SNC adds multiple helper workers, we still need to confirm whether `querySource` plus `agentId` is sufficient for clean ownership, or whether a dedicated worker-class discriminator is needed.
