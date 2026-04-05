# SNC-19 Worker-Policy Host Wiring V1

## Purpose

This packet maps the accepted SNC worker-policy utility onto real OpenClaw host seams and defines the smallest first wiring path that preserves the current doctrine:

- orchestration policy stays SNC-owned
- worker execution stays host-owned
- no general swarm runtime is introduced

## 1. relevant host seams

### Launch / wait / control seams

The first real worker substrate is already present in host session tools:

- `data/external/openclaw-v2026.4.1/src/agents/tools/sessions-spawn-tool.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-spawn.ts`
- `data/external/openclaw-v2026.4.1/src/agents/tools/sessions-yield-tool.ts`
- `data/external/openclaw-v2026.4.1/src/agents/tools/subagents-tool.ts`
- `data/external/openclaw-v2026.4.1/src/agents/tools/sessions-send-tool.ts`

The important host facts are:

- `sessions_spawn` already launches isolated child work through `spawnSubagentDirect(...)` or `spawnAcpDirect(...)`
- `spawnSubagentDirect(...)` already accepts the main policy knobs SNC cares about:
  - `mode="run" | "session"`
  - `runTimeoutSeconds`
  - `thread`
  - `cleanup`
- `sessions_yield` already exists specifically to end the current controller turn and wait for pushed child results
- `subagents` already exposes bounded intervention:
  - `list`
  - `kill`
  - `steer`
- `sessions_send` is already the host-native follow-up lane when a persistent worker session later needs another instruction

This is where the accepted utility maps cleanly:

- `buildSncWorkerJobContract(...)` defines the policy contract
- `buildSncWorkerSpawnBrief(...)` and `renderSncWorkerSpawnBrief(...)` provide the `sessions_spawn.task` payload
- `markSncWorkerSpawned(...)` mirrors the host return values:
  - `childSessionKey`
  - `runId`

### Host identity / control-boundary seams

The host already owns worker depth, control scope, and stop boundaries:

- `data/external/openclaw-v2026.4.1/src/agents/subagent-capabilities.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-control.ts`
- `data/external/openclaw-v2026.4.1/src/agents/pi-tools.abort.ts`

The important host facts are:

- worker role by depth is host-derived:
  - `main`
  - `orchestrator`
  - `leaf`
- control scope is host-derived:
  - `children`
  - `none`
- only `main` and `orchestrator` can spawn/control descendants
- leaf sessions are prevented from controlling other sessions
- abort propagation remains host-owned through tool abort wrappers, `runTimeoutSeconds`, and `subagents kill`

This means SNC should treat:

- `workerId` as policy-local identity
- `childSessionKey` and `runId` as canonical host identity
- `maxActiveWorkers` as SNC policy
- spawn depth and control scope as host facts

### Result-delivery seams

The host already has a structured pushed completion path:

- `data/external/openclaw-v2026.4.1/src/agents/subagent-announce.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-announce-output.ts`
- `data/external/openclaw-v2026.4.1/src/agents/internal-events.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-registry.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-registry-run-manager.ts`

The strongest seam here is not the raw registry record.
It is the host's own internal completion event format.

Verified host shape:

- child completion is pushed back into the requester flow
- the internal event already carries:
  - `session_key`
  - task label
  - status
  - a delimited untrusted child result block
- `subagent-announce-output.ts` already captures the child completion reply and can freeze result text for host delivery

So the accepted utility's fold-back side maps to the pushed completion event:

- `recordSncWorkerResult(...)`
- `foldSncWorkerResult(...)`

SNC does not need a new mailbox or polling loop to receive worker output.

### Plugin / engine lifecycle seams

There are also real plugin-facing lifecycle seams:

- `data/external/openclaw-v2026.4.1/src/plugins/hooks.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/types.ts`
- `data/external/openclaw-v2026.4.1/src/context-engine/types.ts`

Verified live hooks:

- `subagent_spawned`
- `subagent_ended`

Verified narrower hook:

- `subagent_spawning`
  - in the visible spawn path, this is tied to `thread=true` channel-binding preparation
  - it is not required for the first one-shot helper lane

Verified context-engine callback:

- `onSubagentEnded(...)` is actually called from the subagent registry

Important negative finding:

- `prepareSubagentSpawn(...)` exists in `src/context-engine/types.ts`
- I did not find a live caller for it in this snapshot

So the dependable v1 lifecycle seams are:

- plugin hooks for spawned/ended bookkeeping
- context-engine `onSubagentEnded(...)` as best-effort cleanup

`prepareSubagentSpawn(...)` should not be a first-path dependency.

## 2. minimal wiring path

The smallest real wiring path is:

1. Keep `worker-policy.ts` pure and add one SNC-owned worker-state layer beside existing session state.

2. Limit the first execution lane to:
   - `runtime="subagent"`
   - `mode="run"`
   - one-shot helpers only
   - no ACP
   - no persistent worker sessions
   - no controlled descendants by SNC policy

3. Build host launch payloads directly from the accepted utility:
   - contract -> `SncWorkerJobContract`
   - spawn brief -> `renderSncWorkerSpawnBrief(...)`
   - launch -> `sessions_spawn`
   - label -> stable SNC worker label carrying `workerId`
   - timeout -> `runTimeoutSeconds`

4. After successful spawn, mirror only host identifiers into SNC worker state:
   - `workerId`
   - `childSessionKey`
   - `runId`
   - status transition `queued -> spawned/running`

5. When the controller is waiting on helpers, use `sessions_yield`.
   - do not use `sessions_list`
   - do not use `sessions_history`
   - do not use sleep/poll loops

6. Fold results back from the host's pushed completion event inside SNC-owned session policy.
   - parse the incoming internal task-completion message the host injects into the controller turn
   - extract:
     - `session_key`
     - status
     - child result body
   - convert that into `SncWorkerResult`
   - run:
     - `recordSncWorkerResult(...)`
     - `foldSncWorkerResult(...)`
   - persist the resulting controller notes/actions into SNC session state so later `assemble(...)` can reuse them

7. Use lifecycle hooks only for bookkeeping and cleanup.
   - `subagent_spawned` confirms the host run/session mapping
   - `subagent_ended` and/or `onSubagentEnded(...)` clear stale active records and handle kill/release cases
   - these hooks should not be the only result path because they carry lifecycle metadata, not the full child result body

8. Keep intervention bounded.
   - `subagents action="kill"` means worker death
   - `subagents action="steer"` means bounded correction
   - no automatic restart/steer loop in v1

The most natural SNC file fit is:

- `hook-scaffold.ts` for `subagent_spawned` / `subagent_ended` bookkeeping
- `engine.ts.afterTurn(...)` for completion-event parse and fold-back into persisted session policy

## 3. what stays policy-owned vs host-owned

### Policy-owned

- worker roles, job kinds, and result contracts
- spawn-brief rendering
- controller-side quotas such as `maxActiveWorkers`
- queued / active / completed tracking state
- result parsing into SNC controller notes/actions
- decisions about when delegation is allowed
- decisions about when a retry should happen and how the next brief narrows scope

### Host-owned

- child session creation
- runtime launch and execution
- session transport
- announce delivery
- run registry and descendant tracking
- depth and control-scope enforcement
- abort propagation, kill, steer, and timeout handling
- frozen capture of child completion output
- thread binding for persistent sessions

### Boundary rule

SNC mirrors host facts.
It does not replace them.

- `workerId` is SNC policy state
- `childSessionKey`, `runId`, spawn mode, outcome, and control scope remain host-canonical

## 4. what to defer

- `mode="session"` specialists
- `sessions_send` follow-up loops for persistent workers
- `thread=true` channel-bound sessions and any dependence on `subagent_spawning`
- ACP workers
- recursive descendants as a default SNC policy
- worker-to-worker routing or peer mesh communication
- automatic steer/restart heuristics
- direct registry-internal reads as the primary result surface
- any dependency on `prepareSubagentSpawn(...)` until a live caller exists
- public MCP/export exposure for SNC worker orchestration
- any host queue replacement, scheduler rewrite, or general task framework

## 5. SNC relevance

This wiring path is enough to make the accepted worker-policy utility real without breaking the current architecture rules.

It gives SNC:

- bounded helper-worker delegation for side research, analysis, review, or continuity checks
- controller-owned quotas and fold-back
- pushed result handling that stays aligned with the host

It avoids:

- a second scheduler
- a second mailbox
- polling supervision
- a general swarm runtime
- host ownership drift

The strongest practical conclusion is:

- the first SNC wiring cut should be one-shot subagent helpers plus yield, completion-event parse, and spawned/ended bookkeeping
- everything beyond that should stay deferred until that narrow lane proves useful
