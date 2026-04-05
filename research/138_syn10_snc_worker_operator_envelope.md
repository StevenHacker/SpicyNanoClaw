# SYN-10 SNC Worker Operator Envelope

## Purpose

Define the bounded outward worker contract SNC should expose in Milestone 2, using verified OpenClaw host seams and CC donor evidence rather than preference. This packet is about operator-safe launch, wait, follow-up, control, and diagnostics wording, not about reopening a larger orchestration platform design.

## Scope

- Synthesis base:
  - `research/135_oc20_worker_launch_failure_rejection_matrix.md`
  - `research/136_oc21_worker_followup_control_transition_matrix.md`
  - `research/137_cc16_delegation_failure_partial_result_matrix.md`
- Current SNC runtime files:
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-execution.ts`
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-state.ts`
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-diagnostics.ts`
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-policy.ts`
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/config.ts`
- Bounded goal:
  - worker outward contract only
  - no orchestration-platform reopening
  - no new control surface beyond verified host seams plus current SNC runtime state

## Verified Structure / Lifecycle / Contract

### 1. Current SNC worker outward contract matrix

| Surface | Current verified contract | Operator-safe reading |
| --- | --- | --- |
| launch lane | `worker-execution.ts` currently builds host launch plans only for `runtime="subagent"`, `spawnMode="run"`, `completionMode="one-shot"` | SNC worker support is currently one-shot helper delegation, not session-style worker orchestration |
| launch args | default launch plan maps to `sessions_spawn` with `mode: "run"`, `thread: false`, `cleanup: "keep"`, `sandbox: "inherit"` | SNC should describe worker launch as a thin wrapper over `sessions_spawn`, not as a custom runtime |
| unsupported contracts | `worker-execution.ts` explicitly rejects non-`run` spawn mode and non-`one-shot` completion mode | iterative or persistent worker contracts are deferred, not promised |
| wait lane | host truth is `sessions_yield`; SNC already carries a default yield message | controller wait is intentional turn handoff, not passive polling |
| result intake | SNC parses internal completion blocks and infers `complete`, `failed`, or `aborted` | worker result fold-back is completion-event driven |
| state persistence | `worker-state.ts` returns `null` when `stateDir` is absent and persists worker state only under `stateDir` | durable worker controller memory is optional and `stateDir`-gated |
| diagnostics | `worker-diagnostics.ts` warns on stale `queued`, `blocked`, `spawned`, and `running` records | SNC diagnostics are controller-side advisories, not an operator control console |
| prompt surfacing | `engine.ts` adds `Worker launch lane`, `Worker diagnostics`, and `Worker controller` sections when worker state exists | current worker operator surface is primarily prompt-visible and state-backed |

### 2. Recommended worker verb contract

SNC should expose or describe worker handling in these exact verb classes:

| Intent | Recommended host seam | SNC wording |
| --- | --- | --- |
| launch a helper | `sessions_spawn` | launch helper |
| intentionally stop current turn and wait for helper outcome | `sessions_yield` | yield and wait |
| inspect active or recent helpers | `subagents list` | inspect worker state |
| send more instructions into an existing helper session | `sessions_send` | follow up with worker |
| redirect a live helper with restart semantics | `subagents steer` | restart with narrower brief |
| terminate a live helper | `subagents kill` | stop worker |

This matches verified host reality and avoids adding extra verbs that the host does not actually expose.

### 3. Launch outcome contract

SNC worker diagnostics and operator wording should preserve four launch classes:

| Launch class | Host signal | SNC wording priority |
| --- | --- | --- |
| validation misuse | thrown input error or `status: "error"` from contract mismatch | fix launch request |
| policy or capability refusal | `status: "forbidden"` | host refused launch |
| runtime-clean failure | `status: "error"` without child identifiers | retry after fixing host or runtime issue |
| runtime-ambiguous failure | `status: "error"` with `childSessionKey` and possibly `runId` | inspect existing child session before retry |

This is the minimum safe launch envelope for Milestone 2.

### 4. Follow-up and control transition contract

SNC should preserve these host distinctions:

| Worker state | Best next action | Why |
| --- | --- | --- |
| launched and controller should wait | `sessions_yield` | current controller turn ends cleanly and remembers that it yielded |
| running helper needs more detail | `sessions_send` | continue inside the same worker session |
| running helper is on the wrong track | `subagents steer` | restart-style redirect, not just a message |
| running helper should stop | `subagents kill` | terminal control |
| helper already finished | inspect result; if more work is needed, use `sessions_send` rather than `steer` | finished helpers are continuable sessions, not steerable active runs |

### 5. Failure and salvage contract

For Milestone 2, the most honest SNC salvage contract is:

| Outcome | Recommended SNC contract |
| --- | --- |
| helper stopped or aborted after meaningful output | preserve the last trustworthy helper text if available |
| helper hard-fails before useful output | preserve failure reason and session identifiers; do not fabricate salvage |
| helper launch fails before identifiers exist | safe to retry after fix |
| helper launch fails after identifiers exist | inspect before retry |
| helper is stopped and later needs more work | prefer resume or follow-up semantics, not duplicate respawn |

This is the donor logic CC actually supports well for local workers, and it is narrow enough for SNC Milestone 2.

### 6. Diagnostic wording priorities

Operator-facing SNC wording should prioritize:

1. what kind of failure this is
2. whether a worker identity already exists
3. what the next safe verb is

Recommended wording patterns:

- `launch request invalid; fix the helper brief or host arguments before retrying`
- `host refused launch; change policy, sandbox, or target conditions first`
- `launch failed before worker identity was established; safe to retry after fixing the host issue`
- `launch failed after worker identity was created; inspect the existing child session before launching another helper`
- `worker has been running too long; yield first, then decide whether follow-up, steer, or kill is safest`

These match current SNC diagnostics intent:

- `worker-diagnostics.ts` already tells the model to use `sessions_spawn`, `sessions_yield`, `steer`, or `kill` in specific stale-state cases
- it also explicitly warns not to broaden delegation scope from diagnostics alone

### 7. Explicit non-promises

Milestone 2 should not promise that SNC workers are:

- a separate worker platform outside OpenClaw host seams
- session-style or iterative helpers by default
- safe to blindly retry on every launch `error`
- a full operator control plane with dedicated SNC CLI doctor verbs
- guaranteed to preserve partial results on every hard failure
- a remote-control or scheduler platform
- independent of `stateDir` for persistent worker memory

## Key Findings

1. The correct Milestone 2 worker story is still narrow:
   - one-shot helper launch
   - intentional yield while waiting
   - bounded follow-up
   - explicit steer or kill
2. OpenClaw already provides enough worker control seam for SNC without turning SNC into a host fork or control platform.
3. CC's best donor value here is not its product shell, but its discipline:
   - separate stop, fail, follow-up, and resume
   - preserve partial value only when trustworthy
   - sanitize and reconstruct before resume
4. Current SNC code already reinforces this bounded story:
   - one-shot-only launch scaffold
   - `stateDir`-gated worker state
   - prompt-visible launch lane, diagnostics, and controller sections

## SNC Relevance

This packet is the bounded outward contract for SNC worker behavior in Milestone 2.

It gives the implementation and docs passes a clear line:

- describe SNC workers as host-backed helpers
- tell operators how to launch, wait, inspect, follow up, redirect, and stop
- classify launch failure honestly
- keep worker persistence and diagnostics `stateDir`-aware
- avoid overstating resume, orchestration, or remote-control capability

## Modification Guidance

- `wrap`:
  - keep SNC worker language aligned to host verbs: launch, yield, follow up, steer, kill
  - keep diagnostics explicit about retry-safe versus inspect-first failure classes
- `extend`:
  - if Milestone 2 adds more worker controls, keep them as thin wrappers over verified host seams
  - if SNC preserves partial helper output, scope it to trustworthy text on abort or explicit stop
- `defer`:
  - iterative worker sessions
  - full worker doctor CLI
  - remote-control or multi-host worker management
  - broad orchestration scheduling
- `avoid`:
  - do not promise auto-retry on ambiguous launch failure
  - do not imply that every worker error can be resumed
  - do not describe diagnostics as permission to broaden helper use

## Still-unverified questions

1. Whether SNC Milestone 2 implementation will expose an explicit resume verb, or keep resume implicit behind follow-up semantics only.
2. Whether later OpenClaw host releases will add more structured launch-failure subcodes that SNC can surface directly.
3. Whether SNC should persist an explicit operator-facing "ambiguous worker launch" marker across restarts when `stateDir` is enabled.
