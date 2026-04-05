# SYN-12 SNC Milestone 2 Admission Envelope

## Purpose

Provide one bounded admission judgment for `Milestone 2` using the accepted host packets, the donor boundary packets, and current SNC code. This packet is not a roadmap. It exists to answer:

- what `Milestone 2` can honestly admit now
- what worker/operator wording is safe
- what remains deferred but non-blocking
- what SNC must explicitly not claim

## Scope

In scope:

- accepted host packets through `OC-25`
- accepted donor packets through `CC-18`
- current SNC worker/runtime files:
  - `extensions/snc/src/worker-execution.ts`
  - `extensions/snc/src/worker-policy.ts`
  - `extensions/snc/src/worker-state.ts`
  - `extensions/snc/src/worker-diagnostics.ts`
  - `extensions/snc/src/engine.ts`
- current SNC operator-facing package/docs signals:
  - `extensions/snc/README.md`
  - `research/102_snc_milestone2_program.md`

Out of scope:

- `Milestone 3` roadmap design
- broad custom-Claw kernel planning
- reopening general orchestration-platform ambitions

## Verified Structure / Lifecycle / Contract

### Current SNC worker reality at admission time

Verified in current SNC code:

- worker execution is still bounded to `runtime = "subagent"`
- launch remains bounded to `spawnMode = "run"`
- completion remains bounded to `completionMode = "one-shot"`
- first-class SNC worker control wrappers only cover:
  - yield
  - steer
  - kill
- `SncWorkerFollowUpMode` is still only:
  - `"none"`
  - `"steer"`
  - `"spawn"`
- there is still no first-class SNC resume verb
- persistent worker memory remains gated by `stateDir`

That means admission should be judged as:

- bounded continuity plugin with bounded helper-worker support

not:

- full worker operating platform

### Host truths SNC must now obey

From `OC-22`, `OC-23`, `OC-24`, and `OC-25`:

- accepted follow-up is not the same as observed reply
- `ok` without `reply` is not a "late reply pending" state
- timeout is an inspect-first state, not a cleanup or retry-first state
- ambiguous launch with child identity is inspect-first, not relaunch-first
- stale cleanup must follow host truth, not SNC-local guesswork

### Donor truths SNC must now obey

From `CC-17` and `CC-18`:

- live follow-up and stopped-worker resume are different lanes
- believable resume requires sanitize-before-re-entry
- partial carry-forward should be conditional, not universal
- no-resume cases should be stated plainly

### Admission-ready outward worker contract

Given the current code and accepted packets, SNC can honestly admit these worker-facing capabilities:

- bounded helper launch
- bounded yield-and-wait
- inspect-first recovery using host session/subagent truth
- explicit steer / kill control for known workers
- stateDir-backed worker memory and diagnostics

SNC should currently describe follow-up in this weaker form:

- the host has a same-session follow-up seam
- SNC can reason about that seam and its outcomes
- but SNC does not yet expose a hardened first-class resume/follow-up product surface of its own

### Must-have operator wording

The admission-safe wording set is:

| Situation | Safe wording |
| --- | --- |
| launch accepted | "Worker launch accepted." |
| ambiguous launch with child identity | "Launch outcome is ambiguous; inspect the child session before retrying." |
| follow-up accepted without visible reply | "Follow-up accepted; no reply has been observed yet." |
| wait completed with fresh reply | "Reply observed from worker." |
| wait completed without fresh reply | "No fresh visible reply was observed in this wait window." |
| timed-out follow-up | "No reply was observed before timeout; inspect the worker/session before retrying." |
| stopped worker with no SNC resume substrate | "Resume is not currently guaranteed; inspect state or relaunch with a narrower brief." |
| stale local record with missing host truth | "Host inspection no longer shows this worker as live; treat the local record as historical, not active." |

### Explicit no-claims list for admission

`Milestone 2` should not claim:

- guaranteed late reply delivery after every accepted follow-up
- that `ok` without `reply` means a reply is still pending
- exact resume from the point of interruption
- continuation of unresolved tool execution
- automatic stale-worker cleanup based only on SNC-local state
- a general worker scheduler or orchestration platform

### Deferred items that do not block admission

These items can stay deferred without blocking `Milestone 2` entry:

- a first-class SNC wrapper around `sessions_send`
- sanitize-before-resume substrate
- resume-specific UI/README wording beyond the bounded no-resume lane
- a dedicated stale-worker doctor / cleanup helper
- richer late-reply delivery telemetry

They are useful later, but current code does not need them in order to make honest bounded claims now.

### Admission judgment

Based on accepted host/donor evidence and current SNC code, the bounded admission judgment is:

- `Milestone 2` is admission-ready as a normal OpenClaw plugin with:
  - continuity
  - durable-memory diagnostics/controls
  - bounded helper-worker launch/state/diagnostics
  - inspect-first worker recovery wording

It is not admission-ready as:

- a resume-capable worker platform
- a guaranteed late-delivery platform
- a generalized orchestration system

## Key Findings

- The remaining worker ambiguity is now mostly wording and operator boundary, not missing core host seam.
- Current SNC code already supports a credible bounded worker story, but only if docs keep follow-up and resume claims narrower than the raw ambition might tempt.
- `stateDir` materially improves diagnostics and operator continuity, but it does not create a truthful resume promise by itself.
- Milestone 2 admission does not need a first-class follow-up wrapper or resume implementation; it needs honest wording and bounded expectations.
- The right admission frame is "specialized continuity plugin with bounded delegation hygiene," not "controller platform."

## SNC Relevance

This packet is directly usable as the Milestone 2 release/docs admission note:

- it says what the product can now claim
- it says what the docs must not claim
- it identifies deferred work that can remain out of scope without blocking entry

That keeps SNC aligned with the main architectural doctrine:

- hot-pluggable first
- host-safe first
- bounded specialization before bigger platform ambition

## Modification Guidance

- Wrap: if the README or release note is refreshed for `Milestone 2`, use the wording matrix above as the default worker/operator vocabulary.
- Extend: use `stateDir` and current diagnostics to improve inspectability, not to overclaim resume.
- Defer: keep first-class resume and richer follow-up productization for a later milestone unless SNC first lands sanitize-before-resume substrate.
- Avoid: do not market Milestone 2 as if helper workers already form a durable control plane.

## Still-unverified questions

- Whether SNC will later wrap `sessions_send` directly or keep same-session follow-up as a host-level operator technique remains open.
- The exact shape of a future stale-worker doctor command or cleanup helper is still deferred.
- If SNC later chooses to support resume, a separate implementation-grade packet is still required to define its authoritative cleanup and re-entry rules.
