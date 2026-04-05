# SNC Multi-Worker Orchestration V1 Design

## Purpose

This packet defines the first bounded in-product multi-worker model for SNC.

It is unlocked by accepted evidence from:

- `03 / OC-08 MCP / Tool / External Integration Fabric`
- `10 / CC-08 Tasks / Background / Subagent Infrastructure Deep Packet`

The goal is not to invent a new general task runtime.
The goal is to decide how SNC should orchestrate helper workers inside OpenClaw without rewriting the host runtime.

## Scope Boundary

This packet is about in-product SNC worker orchestration inside the OpenClaw host.

It is **not** the same thing as:

- dispatcher-thread collaboration across external main threads in this repo
- human parallel research workflows
- out-of-band task assignment between operator-controlled Codex threads

Those collaboration patterns may be conceptually similar, but they are not the runtime substrate SNC should implement.

## What This Subsystem Actually Is

SNC multi-worker orchestration means:

- one controller session decides that part of the current workload should be delegated
- the host spawns one or more isolated child sessions or subagents
- those workers do bounded work
- results are pushed back to the controller through the host's existing session/subagent machinery
- SNC then folds the results back into the main writing flow

So the real v1 design problem is:

- define who owns orchestration policy
- define worker identity and control boundaries
- define how jobs are launched, waited on, steered, and aborted
- keep the whole thing hot-pluggable

## Main Entry Files

### OpenClaw host evidence

- `data/external/openclaw-v2026.4.1/src/agents/tools/sessions-spawn-tool.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-spawn.ts`
- `data/external/openclaw-v2026.4.1/src/agents/tools/sessions-send-tool.ts`
- `data/external/openclaw-v2026.4.1/src/agents/tools/sessions-yield-tool.ts`
- `data/external/openclaw-v2026.4.1/src/agents/tools/subagents-tool.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-control.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-registry.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-capabilities.ts`
- `data/external/openclaw-v2026.4.1/src/agents/pi-tools.abort.ts`
- `data/external/openclaw-v2026.4.1/src/context-engine/types.ts`

### CC donor evidence

- `data/external/claude-code-leeyeel-4b9d30f/src/Task.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/task/framework.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/tasks/InProcessTeammateTask/types.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/swarm/spawnInProcess.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/swarm/inProcessRunner.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/tasks/stopTask.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/query.ts`

## Verified Starting Point

### 1. OpenClaw already has real multi-worker substrate

This is not a missing-host-seam problem.

Verified host mechanics:

- `sessions_spawn` already spawns isolated child runs with:
  - `runtime="subagent"` or `runtime="acp"`
  - `mode="run"` or `mode="session"`
  - inherited workspace behavior
  - optional thread binding
  - timeout support
  - attachment support for `runtime="subagent"`
- `sessions_send` already sends follow-up messages into another session
- `sessions_yield` already ends the current turn so the caller can wait for pushed child results
- `subagents` already lists, kills, and steers controlled child runs
- `subagent-registry.ts` already tracks run identity and lifecycle
- `context-engine/types.ts` already exposes:
  - `prepareSubagentSpawn?(...)`
  - `onSubagentEnded?(...)`

This means SNC does not need a new scheduler to get a first orchestration layer.

### 2. OpenClaw already encodes worker depth and control scope

`subagent-capabilities.ts` is especially important.

Verified host roles:

- `main`
- `orchestrator`
- `leaf`

Verified host control scopes:

- `children`
- `none`

Verified capability rules:

- `main` and `orchestrator` can spawn
- `leaf` cannot control descendants
- depth is derived from session store and bounded by `maxSpawnDepth`

Meaning:

- the host already has a control-boundary model
- SNC v1 should use that model, not replace it

### 3. OpenClaw control is already push-oriented, not polling-oriented

`sessions_spawn` and `subagent-spawn.ts` explicitly push a strong usage note:

- after spawning children, do not poll `sessions_list`, `sessions_history`, or sleep loops
- wait for completion events to arrive
- track expected child session keys

This is the host's intended orchestration shape.

So SNC v1 should also be:

- event-driven
- completion-push oriented
- anti-polling by default

### 4. OpenClaw already separates launch, follow-up, waiting, and control

The host control plane is already decomposed:

- launch: `sessions_spawn`
- follow-up delivery: `sessions_send`
- waiting/yield: `sessions_yield`
- lifecycle control: `subagents`
- whole-tool abort propagation: `pi-tools.abort.ts`

That separation is valuable because SNC can own policy without taking executor ownership.

### 5. CC's strongest donor pattern is explicit ownership, not magical swarm behavior

From the accepted CC task/subagent packet:

- task identity is a runtime primitive
- queue ownership is explicit
- main thread and subagents do not drain the same command types
- stop-this-turn and kill-this-worker are separate concepts
- idle/completion notifications are state-backed and push-oriented

This matters more than any specific teammate prompt wording.

### 6. CC proves the value of dual abort semantics

Verified donor split:

- lifecycle abort controller kills the whole worker
- current-work abort controller interrupts only the current turn

OpenClaw does not expose the exact same runtime shape to SNC policy, but the operational distinction still matters for design.

## Verified Mechanisms And Call Chains

### OpenClaw spawn/control chain

`sessions_spawn` -> `spawnSubagentDirect(...)` or `spawnAcpDirect(...)` -> `registerSubagentRun(...)` -> registry-managed lifecycle/announce flow -> completion routed back to controller -> optional `onSubagentEnded(...)` callback into context engine

### OpenClaw follow-up chain

controller decides a child needs another instruction -> `sessions_send` -> target session resolves through visibility/policy guards -> gateway `agent` run starts for that child session

### OpenClaw wait chain

controller delegates work -> `sessions_yield` ends current turn -> child completion events are pushed back later -> controller resumes with the new information

### CC donor chain

`spawnInProcessTeammate(...)` creates identity + task state + whole-worker abort controller -> `inProcessRunner.ts` owns the execution loop -> queue ownership is filtered by `agentId` and `querySource` -> `stopTask()` dispatches worker kill -> worker transitions to idle/completed/failed with state-backed notifications

## Converged Read

OpenClaw and CC both point to the same design lesson:

- orchestration should be policy-owned
- execution substrate should stay host-owned
- worker identity, control scope, and stop semantics should be explicit
- result delivery should be push-driven and state-backed

That is enough evidence to define SNC v1 without assuming a host runtime rewrite.

## SNC Multi-Worker V1 Design

## Host Fit And Ownership Model

### Host owns

- child session creation and runtime launch
- run registry and descendant tracking
- session visibility and control-scope enforcement
- tool-level abort propagation
- session messaging transport
- completion announce flow

### SNC owns

- when delegation is allowed
- what kinds of worker jobs exist
- how many workers may be active at once
- the result contract each worker should satisfy
- how child results are folded back into the main writing state
- whether a worker should be one-shot or persistent

### Best v1 host fit

The cleanest SNC v1 fit is:

- SNC remains a plugin-centered feature package
- SNC keeps the main writing session as the controller
- SNC uses existing OpenClaw session/subagent tools as the worker substrate
- SNC optionally uses `prepareSubagentSpawn(...)` and `onSubagentEnded(...)` to maintain worker-aware local state

This is a policy layer over host primitives, not a replacement runtime.

## Worker Identity Model

### Host identity plane

Each worker should be treated as a first-class host run with:

- `controllerSessionKey`
- `childSessionKey`
- `runId`
- `label`
- `runtime`
- `spawnMode`
- host-derived role/capability state such as depth and control scope

Those identities already exist in host mechanisms and should remain canonical.

### SNC policy plane

SNC should add a smaller orchestration identity layer on top:

- `workerRole`
- `jobType`
- `resultContract`
- `expectedCompletionMode`

Recommended v1 worker roles:

- one-shot helper worker
- persistent specialist session

This is intentionally narrower than CC's richer teammate taxonomy.

### Recommended role mapping

- `mode="run"` should be the default for bounded helper work
- `mode="session"` should be reserved for specialists that need iterative follow-up
- SNC v1 should prefer single-level fan-out even though the host already supports deeper descendant tracking

That last point is a design recommendation inferred from the host and donor evidence, not a claim that the host cannot go deeper.

## Queue Model

### Controller queue

The controller should own the only real orchestration queue in v1:

- spawn requests
- outstanding child run list
- expected completions
- retry or steer decisions

SNC should not create a second generic queueing system beside the host run registry.

### Worker input queue

Worker input should use host-native paths:

- initial task via `sessions_spawn`
- follow-up tasking via `sessions_send`

Peer-to-peer worker messaging should not be a v1 requirement.
The controller should remain the routing hub.

### Result queue

Worker results should return through the host's pushed completion path, not through polling.

Operational rule for SNC v1:

- do not poll `sessions_list` or `sessions_history` as a wait strategy
- prefer `sessions_yield` when the controller has delegated and should wait
- resume when the host delivers the child completion/result back

### Ownership rule

SNC should preserve a main-thread/controller distinction similar to CC's donor pattern:

- the controller session owns user-facing orchestration decisions
- workers execute bounded delegated jobs
- workers should not consume ordinary user prompt flow as if they were the main thread

## Abort / Stop Model

### Required v1 distinction

SNC v1 should explicitly distinguish:

1. controller turn interruption
2. worker lifecycle termination
3. worker course correction

### How that maps to OpenClaw

- controller turn interruption stays host-owned through normal tool/turn abort flow
- worker lifecycle termination maps to `subagents action="kill"`
- worker course correction maps to `subagents action="steer"`
- bounded runtime timeout maps to `runTimeoutSeconds`

### How CC influences the design

CC's strongest donor lesson is that "interrupt current work" and "kill the worker" must not be collapsed.

OpenClaw's exposed control surface is not identical to CC's dual-abort-controller runtime, so SNC v1 should not pretend it is.
But SNC can still preserve the same operational distinction:

- do not treat every interruption as worker death
- do not use kill when steer or timeout is the right tool

## Recommended V1 Topology

### Default shape

- one controller session
- zero to a few child helpers
- single-level fan-out by policy
- push-based completion
- controller-mediated follow-up

### Best-fit use cases for v1

The strongest direct SNC fits are bounded helper jobs such as:

- research or evidence fetch
- continuity checking
- option generation
- side analysis that should not pollute the main writing thread

This is an inference from the accepted host/donor evidence plus SNC's current landing direction.

### What should not be the default v1 shape

- autonomous peer swarm
- uncontrolled descendant spawning
- polling-based worker supervision
- separate SNC-owned task scheduler

## Relationship To SNC Context-Engine Ownership

This packet does not change the earlier SNC host-shape read.

The best current fit is:

- SNC context engine continues to own main-session assembly/state policy
- OpenClaw continues to own worker execution substrate
- SNC may use context-engine worker hooks only for local state preparation and result fold-back

So multi-worker orchestration v1 does not imply that SNC should own the host task runtime.

## What Stays Hot-Pluggable

- SNC orchestration policy remains plugin-owned
- worker launch/control uses existing host tools
- worker-aware state can be tracked through existing context-engine hooks
- no host-internal OpenClaw scheduler rewrite is required
- no host queue or registry replacement is required
- mode flags can stay in SNC config or worker-brief policy rather than host internals

## What Is Explicitly Deferred

- a new SNC-owned scheduler or generic task framework
- ACP-first orchestration as the primary SNC worker lane
- deep recursive swarm behavior as a default policy
- peer mesh communication between workers
- SNC-owned mailbox transport
- remote/service-backed workers
- custom UI task dashboard or product-shell worker manager
- full parity with CC's in-process teammate runtime
- host query-loop rewrites for queue ownership
- worker-to-worker autonomous spawning as the default

## SNC Relevance

This packet gives SNC a path to real multi-worker behavior without breaking the project rules.

The most important implication is architectural:

- OpenClaw already has the execution substrate
- CC already proves the value of explicit ownership, push completion, and dual stop semantics
- SNC therefore only needs to own orchestration policy, worker contracts, and fold-back behavior

That directly serves SNC landing because it unlocks delegated writing-side helper work without:

- forking host runtime internals
- collapsing controller and worker responsibilities
- or overbuilding a general swarm system too early

## Modification Guidance

### Wrap

- existing `sessions_spawn`, `sessions_send`, `sessions_yield`, and `subagents` usage patterns
- context-engine `prepareSubagentSpawn(...)` and `onSubagentEnded(...)` for SNC-local worker state
- SNC-side worker briefs, quotas, and result contracts

### Extend

- SNC plugin config for worker policy
- SNC context-engine state to track delegated child work
- bounded worker-role taxonomy inside SNC policy only

### Defer

- host registry replacement
- deep worker tree management
- ACP-heavy orchestration
- generic task framework work
- peer routing between child workers

### Do not touch in v1 unless evidence changes

- OpenClaw run registry ownership
- host session visibility/control-scope logic
- host queue and transport internals
- host abort wrapper semantics

## Still-Unverified Questions

1. I did not fully trace every `steer` branch in OpenClaw, especially where steer becomes restart-like behavior versus pure in-place redirection.
2. I did not replay-run the practical difference between `runtime="subagent"` and `runtime="acp"` for SNC-style writing workflows; the packet therefore treats `subagent` as the safer default inference, not a proven universal winner.
3. I have not yet verified how rich the pushed completion payload is in real multi-worker sessions, which affects how much result post-processing SNC will need.
4. I did not verify whether any shipped context engine currently uses `prepareSubagentSpawn(...)`, so SNC may be the first strong consumer of that seam.
5. It remains unverified whether SNC's first real worker workloads need only single-level fan-out, or whether some continuity/research workflows justify controlled descendants soon after v1.
