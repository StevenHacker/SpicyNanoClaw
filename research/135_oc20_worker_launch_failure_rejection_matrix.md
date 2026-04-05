# OC-20 OpenClaw Worker Launch Failure / Rejection Matrix

## Purpose

Pin down the exact immediate-return failure semantics of OpenClaw worker launch so SNC Milestone 2 can treat helper spawn errors correctly: distinguish caller mistakes, host policy refusal, runtime or infrastructure failure, and already-accepted launches that later fail outside the `sessions_spawn` return path.

## Scope

- Repo: `data/external/openclaw-v2026.4.1`
- Focus:
  - `sessions_spawn` immediate return semantics
  - `runtime="subagent"` and `runtime="acp"` launch failure classes
  - result shapes and identifier leakage (`childSessionKey`, `runId`)
  - retry-safe versus ambiguous half-started failure guidance
  - launch-stage behavior only, not follow-up/control
- Main entry files:
  - `data/external/openclaw-v2026.4.1/src/agents/tools/sessions-spawn-tool.ts`
  - `data/external/openclaw-v2026.4.1/src/agents/subagent-spawn.ts`
  - `data/external/openclaw-v2026.4.1/src/agents/acp-spawn.ts`

## Verified Structure / Lifecycle / Contract

### 1. Immediate `sessions_spawn` return contract

OpenClaw exposes two immediate failure surfaces for worker launch:

| Surface | Where it happens | Shape | Meaning |
| --- | --- | --- | --- |
| tool-input exception | `sessions-spawn-tool.ts` | throws `ToolInputError` | caller used unsupported top-level params such as `target`, `channel`, `to`, `threadId`, `replyTo` |
| JSON tool result | tool and runtime layers | `status: "accepted" | "forbidden" | "error"` | host completed parsing and returned a launch verdict |

Important verified consequence:

- `sessions_spawn` does not use `status: "ok"` or `status: "timeout"` for launch.
- launch-time refusal is represented as `forbidden`.
- launch-time validation and runtime failure are represented as `error`.
- some `error` results include `childSessionKey` and `runId`, which means the failure happened after identifiers were already created.

### 2. Tool-layer validation before runtime dispatch

Verified tool-layer failures in `sessions-spawn-tool.ts`:

| Failure class | Result shape | Notes |
| --- | --- | --- |
| unsupported delivery-style params | thrown `ToolInputError` | `sessions_spawn` explicitly rejects channel-delivery fields and tells the caller to use `message` or `sessions_send` |
| `streamTo` with non-ACP runtime | `status: "error"` | contract misuse, not host policy |
| `resumeSessionId` with non-ACP runtime | `status: "error"` | contract misuse |
| ACP attachments | `status: "error"` | currently unsupported for `runtime="acp"` |

These are caller-contract failures. They are retry-safe only after the caller changes the request.

### 3. Subagent launch failure and refusal matrix

Verified `spawnSubagentDirect(...)` result classes:

| Stage | Example conditions | Immediate result | Identifier exposure | Retry guidance |
| --- | --- | --- | --- | --- |
| argument validation | malformed `agentId`, `mode="session"` without `thread=true`, invalid `thinking` | `error` | usually no identifiers, except later validation after provisional session creation can include `childSessionKey` | fix request first |
| policy refusal | max spawn depth, max active children, explicit `agentId` required, target not in allowlist, sandboxed parent trying to spawn unsandboxed child, `sandbox="require"` without sandboxed target | `forbidden` | no durable child should be assumed | do not blind-retry; change policy, target, or runtime conditions |
| pre-agent runtime prep | initial `sessions.patch` patch failure, runtime model persist failure, thread-binding hook missing or bind failed, attachment materialization failure, spawn-lineage patch failure | `error` | often `childSessionKey` exists because provisional session was already created | inspect repeated failures; usually safe to retry after fixing the underlying cause |
| agent dispatch failure after provisional session exists | gateway `agent` call throws after `childRunId` may already exist | `error` | can include both `childSessionKey` and `runId` | do not blind-retry; treat as ambiguous half-started run |
| registry tracking failure after agent dispatch | `registerSubagentRun(...)` throws | `error` | includes `childSessionKey` and `runId` | do not blind-retry; inspect first |
| successful immediate launch | dispatch plus registry tracking succeed | `accepted` | includes `childSessionKey`, `runId`, `mode`, optional attachment receipt | later failure is outside immediate launch path |

Verified cleanup behavior matters here:

- pre-agent failures call cleanup helpers that try to delete provisional session state and attachments
- post-dispatch failures still try best-effort cleanup, including `subagent_ended` hook emission for thread-bound launches
- but once `runId` exists, the failure is no longer equivalent to "nothing was launched"

### 4. ACP launch failure and refusal matrix

Verified `spawnAcpDirect(...)` classes:

| Stage | Example conditions | Immediate result | Identifier exposure | Retry guidance |
| --- | --- | --- | --- | --- |
| policy refusal | `acp.enabled=false`, sandboxed requester, `sandbox="require"` for ACP, target ACP agent denied by policy | `forbidden` | no worker identifiers required for recovery | change host policy or runtime choice first |
| contract validation | `streamTo="parent"` without requester session, `mode="session"` without `thread=true`, no ACP target agent configured | `error` | no accepted child should be assumed | fix request or config first |
| thread-binding preparation | missing channel context, thread-binding policy disabled, adapter unavailable, unsupported placement, unresolved conversation | `error` | usually before final runtime creation | fix channel or binding conditions first |
| runtime initialization or binding | `sessions.patch`, ACP runtime init, prepared thread bind, session binding failures | `error` | no accepted launch; cleanup helper runs | retry only after infra or binding condition is understood |
| agent dispatch after ACP session exists | gateway `agent` call throws | `error` | includes `childSessionKey` | ambiguous enough to inspect before retry |
| successful immediate launch | ACP session created and initial task queued | `accepted` | includes `childSessionKey`, `runId`, `mode`, optional `streamLogPath` | later failure is outside immediate launch path |

### 5. Extra ACP ambiguity introduced by tool-side registry tracking

`sessions-spawn-tool.ts` adds one extra failure class for ACP that is not inside `spawnAcpDirect(...)` itself:

- when ACP launch is already `accepted`
- and `streamTo !== "parent"`
- the tool tries to track the ACP run via `registerSubagentRun(...)`

If that tracking step fails, the tool returns:

- `status: "error"`
- `childSessionKey`
- `runId`
- an explicit warning that cleanup was attempted but the already-started ACP run may still finish in the background

This is the clearest verified example of a terminal-looking launch `error` that is not safe to treat as "nothing happened."

### 6. Accepted launch versus later failure

Once launch returns `accepted`, immediate launch handling is over.

Later problems are handled elsewhere:

- subagent registry and announce delivery
- completion notifications
- follow-up or control tools

So these must not be collapsed into launch failure:

- worker times out after accepted launch
- worker later fails its actual task
- background delivery or completion announce arrives late
- controller later decides to steer or kill

Those are post-launch lifecycle events, not launch rejection.

### 7. Retry-safety matrix

| Immediate outcome | Safe default reading | Recommended next step |
| --- | --- | --- |
| thrown input error | request shape is wrong | fix request, then retry |
| `forbidden` with no child identifiers | host intentionally refused launch | change policy, target, or sandbox conditions before retry |
| `error` with no `childSessionKey` and no `runId` | launch failed before durable worker identity existed | fix cause, then retry |
| `error` with `childSessionKey` only | provisional child state existed | inspect if repeated; retry carefully |
| `error` with `childSessionKey` and `runId` | worker may already have started or partially started | inspect via list or history before retry |
| `accepted` | worker exists | do not respawn by default; use wait, follow-up, or control surfaces |

## Key Findings

1. OpenClaw deliberately separates launch refusal from launch failure:
   - `forbidden` means policy or capability guardrail
   - `error` means validation misuse or runtime failure
2. Not all launch `error` results are retry-safe. If `childSessionKey` or `runId` is already present, the launch is ambiguous rather than cleanly rejected.
3. ACP has an extra host-tracking failure mode where the tool can return `error` after the ACP worker was already accepted and started.
4. Immediate launch handling ends at `accepted`; later worker crashes or completion issues are separate lifecycle events and should not be folded back into launch semantics.

## SNC Relevance

This packet directly constrains `SNC-Milestone2-01 Controller Launch Path` and the worker operator story.

SNC should classify launch results this way:

- validation error: narrow or fix the generated launch plan
- refusal: explain the blocked host condition
- runtime error without identifiers: retryable after cause is fixed
- runtime error with identifiers: inspect first, do not blindly spawn a duplicate
- accepted: switch to wait, follow-up, and control logic

That keeps SNC from turning every launch failure into either an unsafe retry storm or an over-broad "worker platform" abstraction.

## Modification Guidance

- `wrap`:
  - SNC controller logic should normalize launch outcomes into `validation`, `refused`, `runtime-clean`, and `runtime-ambiguous`.
  - Operator-facing diagnostics should explicitly surface whether `childSessionKey` or `runId` already exists.
- `extend`:
  - Add a small SNC-side diagnostic note that says:
    - `safe to retry after fixing request`
    - `inspect existing child session before retry`
  - This is a thin policy wrapper over host truth, not a host replacement.
- `defer`:
  - Do not invent SNC-specific retry orchestration before the host verdict classes are preserved.
  - Do not treat ACP registry-tracking failure as solved unless SNC can prove the background run was actually cancelled.
- `avoid`:
  - Do not describe all launch errors as "worker failed to start cleanly."
  - Do not auto-respawn on `error` when `runId` is already present.
  - Do not merge post-launch worker failure into launch rejection wording.

## Still-unverified questions

1. Whether future OpenClaw host releases will add more explicit machine-readable launch subcodes beyond `accepted`, `forbidden`, and `error`.
2. Whether ACP launch paths outside the currently verified tool surfaces can leak additional partial-start states.
3. Whether SNC should persist its own "ambiguous launch seen" marker to prevent duplicate retries across restarts.
