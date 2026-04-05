# External Thread Phase 10 Acceptance Round 1

## Purpose

This note closes the first acceptance wave for phase 10.

Phase 10 existed to tighten the last worker follow-up and resume precision needed by:

- `SNC-Milestone2-01` controller follow-up closeout
- bounded worker/operator wording
- a truthful `Milestone 2` admission decision later

## Accepted Packets

1. `49` `OC-22 Worker Follow-Up Delivery / Reply-Visibility Matrix`
   - `research/142_oc22_worker_followup_reply_visibility_matrix.md`
2. `50` `OC-23 Ambiguous Worker Launch Inspection / Recovery Matrix`
   - `research/143_oc23_ambiguous_worker_launch_recovery_matrix.md`
3. `51` `CC-17 Worker Resume Sanitization / Unresolved-Tool Cleanup Matrix`
   - `research/144_cc17_worker_resume_sanitization_matrix.md`
4. `52` `SYN-11 SNC Worker Follow-Up / Resume Envelope`
   - `research/145_syn11_snc_worker_followup_resume_envelope.md`

All four packets are accepted.

## What Closed

### OpenClaw follow-up now has a reply-visibility truth model

Accepted packet `49` closes the remaining ambiguity around what `sessions_send` proves:

- `accepted` means the host accepted a follow-up run
- `ok` does not automatically mean a fresh visible reply exists
- `timeout` means no visible reply was observed in the wait window, not that the worker is definitely dead
- later announce work is separate from the synchronous proof carried by the tool result

This matters because SNC can now keep worker follow-up wording observational instead of pretending every accepted follow-up already has a visible answer.

### Ambiguous launch recovery is now child-session-first instead of retry-first

Accepted packet `50` closes the recovery doctrine:

- `childSessionKey` is the primary public recovery anchor
- `runId` is useful only when controller-owned registry state still exists
- when any child identity exists, the safe next move is inspect first rather than blindly relaunch

This materially sharpens SNC worker recovery guidance.

### CC donor value is now tighter on sanitized resume

Accepted packet `51` proves the strongest remaining donor rule:

- believable resume is sanitize-before-re-entry
- unresolved tool-use shells should be cleaned before re-entry
- orphaned thinking-only residue should not be treated as durable truth
- useful replacement state can still be preserved while unresolved tool scaffolding is discarded

That is the right scale of donor borrowing for SNC.

### Milestone 2 now has a bounded follow-up/resume outward contract

Accepted packet `52` closes the operator story for this lane:

- launch, inspect, yield, follow-up, steer, and kill can be described honestly
- resume must remain narrow until SNC has its own sanitize-before-re-entry substrate
- ambiguous launch and follow-up timeout now have bounded, non-theatrical wording

## Real Progress Assessment

This round improved precision more than breadth.

### OpenClaw

Current read after acceptance:

- SNC-relevant host understanding: about `99%`
- broader host/platform understanding: about `92%`

Why this moved only slightly:

- the remaining gains are operational truth around follow-up visibility and recovery, not missing host topology

### CC

Current read after acceptance:

- SNC-relevant donor understanding: about `98%`
- broader repo/product understanding: about `88%`

Why this moved only slightly:

- the new gain is resume hygiene and wording precision, not broad new subsystem coverage

## Engineering Value

This acceptance wave materially strengthens the next SNC cuts:

1. follow-up wording can now separate acceptance, visible reply, timeout, and later delivery
2. ambiguous launch recovery can now be child-session-first and host-truth-first
3. any future SNC resume claim now has a hard donor bar instead of vague intuition
4. `Milestone 2` admission can be judged against a bounded worker/operator envelope rather than scattered notes

## Remaining Pressure

The next research pressure is no longer broad worker topology.

It is admission-grade precision:

- late reply visibility after an accepted follow-up
- stale worker/session inspection and cleanup truth
- final worker restart/resume wording boundary
- one bounded `Milestone 2` admission envelope

## Dispatcher Read

Phase 10 is successful.

It closed the last major worker follow-up/resume blind spots tightly enough that the main thread can stay development-first and only ask for a final narrow admission wave instead of reopening architecture.
