# OC-21 OpenClaw Worker Follow-Up / Yield / Control Transition Matrix

## Purpose

Pin down the exact public transition surfaces OpenClaw exposes after a worker exists: when to intentionally wait, when to send a follow-up, how to inspect visibility, and how kill versus steer change host state. This packet is specifically for SNC worker control clarity, not for re-explaining spawn.

## Scope

- Repo: `data/external/openclaw-v2026.4.1`
- Focus:
  - `sessions_yield`
  - `sessions_send`
  - `subagents` public actions
  - host state transitions versus read-only inspection
  - status-by-status next-action guidance
- Main entry files:
  - `data/external/openclaw-v2026.4.1/src/agents/tools/sessions-yield-tool.ts`
  - `data/external/openclaw-v2026.4.1/src/agents/pi-embedded-runner/run/attempt.sessions-yield.ts`
  - `data/external/openclaw-v2026.4.1/src/agents/pi-embedded-runner/run/attempt.ts`
  - `data/external/openclaw-v2026.4.1/src/agents/tools/sessions-send-tool.ts`
  - `data/external/openclaw-v2026.4.1/src/agents/tools/subagents-tool.ts`
  - `data/external/openclaw-v2026.4.1/src/agents/subagent-control.ts`

## Verified Structure / Lifecycle / Contract

### 1. Public seam matrix

| Intent | Public seam | Immediate statuses | Host state change | Verified meaning |
| --- | --- | --- | --- | --- |
| intentionally end current turn and wait for later worker or external follow-up | `sessions_yield` | `yielded`, `error` | yes | aborts current attempt cleanly and persists hidden yield context |
| send a new message into an existing visible session | `sessions_send` | `accepted`, `ok`, `timeout`, `error`, `forbidden` | yes, but only as a new run inside the target session | follow-up message, not spawn and not registry replacement |
| inspect owned worker visibility and recent state | `subagents action="list"` | `ok` | no | read-only view over owned latest runs |
| stop a controlled worker | `subagents action="kill"` | `ok`, `done`, `forbidden`, `error` | yes | aborts run, clears queues, marks termination, cascades descendants |
| redirect a controlled running worker | `subagents action="steer"` | `accepted`, `done`, `forbidden`, `rate_limited`, `error` | yes | restart-style replacement of the tracked run |

Important boundary:

- there is no public `subagents send` action
- plain follow-up send is currently the public job of `sessions_send`
- `sendControlledSubagentMessage(...)` exists internally, but it is not the public seam exposed by `subagents`

### 2. `sessions_yield` lifecycle

Verified `sessions_yield` behavior:

1. tool returns `error` if there is no active session context
2. tool returns `error` if the runtime has no `onYield` hook
3. on success it calls `onYield(message)` and returns `status: "yielded"`

Verified runner effects:

- sets `yieldDetected`
- records `yieldMessage`
- aborts the current run with reason `"sessions_yield"`
- aborts session execution for the current attempt
- waits for abort settle
- strips synthetic abort artifacts from transcript state
- persists a hidden yield-context message with `triggerTurn: false`

So `sessions_yield` is not just a courtesy message. It is an explicit state transition:

- current controller turn ends
- the session persists a reminder that it intentionally yielded while waiting

### 3. `sessions_send` lifecycle

Verified `sessions_send` path:

1. resolve target by `sessionKey` or `label`
2. run visibility and agent-to-agent policy checks
3. start a nested `agent` run with `deliver: false`, internal channel, nested lane
4. if `timeoutSeconds === 0`, return `accepted` immediately and let background A2A flow continue
5. otherwise wait on `agent.wait`
6. compare pre and post `chat.history` snapshots and return `reply` only if assistant output actually changed

Important verified meanings:

- `sessions_send` is continuation inside an existing session
- it does not create a new worker session
- it does not rewrite subagent registry ownership
- it can target a finished session and start a fresh run there

### 4. `subagents list` visibility contract

Verified list behavior:

- only latest runs owned by the controller session are shown
- descendant waiting counts keep a run "active" even if its own run already ended
- public status labels are synthesized from registry state:
  - `running`
  - `active (waiting on N child/children)`
  - `done`
  - `failed`

This makes `subagents list` the public visibility seam for:

- who is still active
- who already finished
- which workers are actually waiting on descendants instead of still executing directly

### 5. `subagents kill` lifecycle

Verified kill behavior:

- ownership mismatch returns `forbidden`
- leaf subagents with `controlScope !== "children"` return `forbidden`
- stale or already-finished targets return `done`
- active target kill does all of:
  - abort embedded PI run if session id exists
  - clear follow-up and lane queues
  - persist `abortedLastRun` best-effort
  - mark registry outcome terminated with reason `killed`
  - cascade kill descendants

So `kill` is terminal control, not advisory follow-up.

### 6. `subagents steer` lifecycle

Verified steer behavior:

- rejects ownership mismatch
- rejects leaf subagents controlling descendants
- rejects self-steer
- returns `done` if the target is already finished and has no pending descendants
- returns `rate_limited` if repeated too quickly

On accepted steer:

1. mark current run for steer restart
2. abort current run
3. clear pending queues
4. wait briefly for abort settle
5. start a new `agent` run in the same child session
6. replace the tracked run id in the registry

This is a restart transition, not a plain message send.

### 7. Status-by-status next-action matrix

| Observed worker state | Best matching public action | Why |
| --- | --- | --- |
| controller wants to pause and let completion or external follow-up arrive | `sessions_yield` | ends current turn intentionally and preserves wait context |
| worker is visible and still running | `sessions_send` for follow-up, `subagents steer` for redirect, `subagents kill` for stop | follow-up, restart, and terminal stop are distinct verbs |
| worker shows `active (waiting on N children)` | `subagents list` to inspect, `subagents steer` or `subagents kill` if intervention is needed | host treats descendant-wait as active control state |
| worker is done or failed | `subagents list` to inspect; `sessions_send` if you want to continue in the same session | `steer` and `kill` will resolve to `done` |
| target is not visible or not owned | expect `forbidden` or target-resolution `error` | visibility and ownership are real host boundaries |
| async follow-up desired without blocking current turn | `sessions_send timeoutSeconds=0` | returns `accepted` and lets background A2A flow continue |

### 8. Control versus inspection boundaries

| Surface | Read-only | Creates new run | Replaces tracked run | Terminates run |
| --- | --- | --- | --- | --- |
| `sessions_yield` | no | no | no | ends current controller attempt |
| `sessions_send` | no | yes, inside target session | no | no |
| `subagents list` | yes | no | no | no |
| `subagents steer` | no | yes | yes | aborts prior run as part of restart |
| `subagents kill` | no | no | no | yes |

## Key Findings

1. OpenClaw already has a clean verb split:
   - `yield` for controller wait
   - `send` for continuation message
   - `list` for inspection
   - `steer` for restart-style redirect
   - `kill` for stop
2. `sessions_send` and `subagents steer` are not interchangeable. `send` continues an existing session; `steer` replaces the tracked run after aborting the current one.
3. `subagents list` treats descendant-waiting as active, so a worker can be done locally but still operationally active because its subtree is not done.
4. Public OpenClaw control does not currently expose a dedicated `subagents send` seam; the public follow-up message seam is `sessions_send`.

## SNC Relevance

This packet gives SNC a host-aligned worker controller contract:

- use `sessions_spawn` only for launch
- use `sessions_yield` when SNC wants to stop talking and wait for helper completion
- use `sessions_send` for normal follow-up
- use `subagents list` for controller-visible diagnostics
- use `subagents steer` only for restart-style redirect
- use `subagents kill` only for explicit stop

That is the narrowest viable Milestone 2 operator story and avoids inventing a larger orchestration platform.

## Modification Guidance

- `wrap`:
  - SNC should map its own worker verbs directly onto these host verbs instead of inventing parallel terminology.
  - Worker diagnostics should distinguish `follow-up`, `restart`, and `stop`.
- `extend`:
  - SNC can safely add controller-side wording such as:
    - `yield now`
    - `follow up in same worker session`
    - `restart worker with a narrower brief`
    - `terminate worker`
  - These are wrappers over verified host seams.
- `defer`:
  - Do not invent a public SNC resume verb separate from `sessions_send`.
  - Do not expose internal `sendControlledSubagentMessage(...)` as if it were already a public host seam.
- `avoid`:
  - Do not describe `sessions_yield` as read-only.
  - Do not describe `steer` as a normal follow-up message.
  - Do not describe `subagents list` output as a full scheduler state model.

## Still-unverified questions

1. Whether later OpenClaw releases will expose a public `subagents send` or richer wait primitives beyond current seams.
2. Whether additional public status labels will be added for queued-but-not-yet-visible workers.
3. Whether SNC should surface descendant-waiting as a first-class operator phrase instead of relaying the host wording directly.
