# SYN-11 SNC Worker Follow-Up / Resume Envelope

## Purpose

Synthesize the accepted OpenClaw host packets and Claude Code donor packet into a bounded outward contract for SNC worker follow-up and resume language. The purpose is to define what Milestone 2 can safely promise to operators and docs without inflating SNC into a larger orchestration platform.

## Scope

In scope:

- accepted host findings from `OC-20`, `OC-21`, `OC-22`, and `OC-23`
- donor findings from `CC-16` and `CC-17`
- current SNC worker runtime files:
  - `extensions/snc/src/worker-execution.ts`
  - `extensions/snc/src/worker-policy.ts`
  - `extensions/snc/src/worker-state.ts`
  - `extensions/snc/src/worker-diagnostics.ts`
  - `extensions/snc/src/engine.ts`

Out of scope:

- broad multi-worker platform design
- remote-control product surfaces
- speculative future scheduler or inbox architecture

## Verified Structure / Lifecycle / Contract

### Current SNC worker reality

Verified from the current SNC code:

- worker runtime is currently limited to `runtime = "subagent"`
- launch mode is limited to `spawnMode = "run"`
- completion mode is limited to `completionMode = "one-shot"`
- the current helper wrapper surface only builds explicit `steer` and `kill` control arguments
- `SncWorkerFollowUpMode` is currently `"none" | "steer" | "spawn"`
- there is no first-class SNC resume verb
- persistent worker records are gated by `stateDir`

So SNC already has worker identity, diagnostics, and bounded control scaffolding, but it does not yet expose a hardened follow-up/resume product surface of its own.

### Host-level follow-up truth SNC must inherit

From `OC-22` and `OC-23`, any SNC wording for follow-up has to preserve these distinctions:

- follow-up accepted is not the same as reply observed
- wait-window success can still produce no fresh visible reply
- timeout means no reply was observed in the allotted window, not necessarily that the worker stopped
- launch `error` with child identity is inspect-first, not relaunch-first

### Donor-level resume truth SNC must inherit

From `CC-17`, any SNC claim about resume should preserve these distinctions:

- live follow-up and stopped-worker resume are different lanes
- believable resume requires sanitize-before-re-entry
- unresolved tool-use artifacts should be cleaned before re-entry
- preserved history or state is not proof that half-open tool execution can continue

### Recommended bounded outward contract

For Milestone 2, SNC can safely expose or describe these operator actions:

- launch a bounded helper worker
- wait on it with the host yield lane
- inspect current session or worker state
- send a same-session follow-up at the host level when/if SNC later wraps that seam
- explicitly steer or kill a known worker

For Milestone 2, SNC should not promise:

- exact resume from the point of interruption
- continuation of unresolved tool execution
- guaranteed visible reply after every follow-up
- automatic relaunch after ambiguous launch failure

### Recommended operator wording matrix

| Situation | Safe outward wording |
| --- | --- |
| launch accepted | "Worker launch accepted." |
| ambiguous launch with child identity | "Launch outcome is ambiguous; inspect the child session before retrying." |
| follow-up accepted without wait | "Follow-up accepted; reply has not been observed yet." |
| wait completed with fresh reply | "Reply observed from worker." |
| wait completed without fresh reply | "No fresh visible reply was observed in this wait window." |
| follow-up timed out | "No reply was observed before timeout; inspect before retrying." |
| stopped worker with no sanitize-before-resume substrate | "Resume is not currently guaranteed; relaunch or inspect the worker state instead." |

## Key Findings

- SNC already has enough host seam to support launch, yield, inspect, steer, and kill without inventing a larger worker-control platform.
- The missing piece for a strong resume promise is not just more state. It is sanitize-before-re-entry discipline similar to the CC donor pattern.
- The safest near-term follow-up language is observational, not interpretive: accepted, reply observed, no fresh reply observed, timeout, ambiguous launch.
- `stateDir` strengthens operator memory and diagnostics, but it does not by itself create trustworthy resume semantics.
- Milestone 2 should stay bounded around continuity plus delegation hygiene, not expand into remote-control or orchestration-platform claims.

## SNC Relevance

This packet is directly usable for Milestone 2 docs and operator UX:

- it defines what worker messaging can safely say
- it constrains any future SNC follow-up wrapper to host-real semantics
- it sets a hard bar for when "resume" language becomes legitimate

That keeps SNC aligned with its current product shape: a normal OpenClaw plugin with bounded delegation support, not a general worker operating system.

## Modification Guidance

- Wrap: if SNC adds a first-class follow-up helper, keep the outward status vocabulary aligned with the host reply-visibility matrix.
- Extend: use `stateDir` records to improve inspection and explanation, not to overclaim resume.
- Defer: postpone a first-class resume feature until SNC has explicit sanitization and unresolved-tool cleanup rules.
- Avoid: do not use language like "continues exactly where it left off" or "every accepted follow-up will yield a reply."

## Still-unverified questions

- Whether SNC will later wrap `sessions_send` directly or keep follow-up at the host-tool layer remains open.
- The exact operator UX for surfacing ambiguous launch inspection results was not finalized in this packet.
- If SNC later adds resume, it still needs a separate implementation packet to define what transcript or state cleanup is authoritative.
