# External Thread Phase 9 Acceptance Round 1

## Purpose

This note closes the first acceptance wave for phase 9.

Phase 9 existed to tighten the remaining worker/operator precision needed by:

- `SNC-Milestone2-01` controller launch follow-up
- worker diagnostics wording
- the bounded `Milestone 2` worker operator contract

## Accepted Packets

1. `45` `OC-20 Worker Launch Failure / Rejection Matrix`
   - `research/135_oc20_worker_launch_failure_rejection_matrix.md`
2. `46` `OC-21 Worker Follow-Up / Yield / Control Transition Matrix`
   - `research/136_oc21_worker_followup_control_transition_matrix.md`
3. `47` `CC-16 Delegation Failure / Partial-Result Salvage Matrix`
   - `research/137_cc16_delegation_failure_partial_result_matrix.md`
4. `48` `SYN-10 SNC Worker Operator Envelope`
   - `research/138_syn10_snc_worker_operator_envelope.md`

All four packets are accepted.

## What Closed

### OpenClaw worker launch failure semantics are now precise enough for product behavior

Accepted packet `45` closes the remaining ambiguity around:

- validation misuse
- host refusal
- runtime-clean error
- runtime-ambiguous error with `childSessionKey` or `runId`

This matters because SNC can now describe worker launch failure without flattening every launch `error` into the same story.

### OpenClaw follow-up and control verbs are now product-accurate

Accepted packet `46` confirms the public seam split:

- `sessions_yield`
- `sessions_send`
- `subagents list`
- `subagents steer`
- `subagents kill`

This is enough to keep SNC worker control honest and host-aligned.

### CC donor value is now tighter on failure and salvage

Accepted packet `47` sharpens the donor rule set:

- preserve last meaningful text on explicit stop or abort
- do not promise salvage on every hard failure
- keep follow-up and resume separate
- rebuild from sanitized persisted context on resume

This is the right scale of donor borrowing for `Milestone 2`.

### Milestone 2 now has a bounded worker outward contract

Accepted packet `48` closes the operator story:

- one-shot helper launch
- intentional yield while waiting
- bounded follow-up
- explicit steer or kill
- no orchestration-platform promises

## Real Progress Assessment

This round improved precision more than breadth.

### OpenClaw

Current read after acceptance:

- SNC-relevant host understanding: about `99%`
- broader host/platform understanding: about `91%`

Why this moved only slightly:

- most topology was already known
- the gain here is operator-grade failure/control precision

### CC

Current read after acceptance:

- SNC-relevant donor understanding: about `97%`
- broader repo/product understanding: about `87%`

Why this moved only slightly:

- the new value is cleaner salvage/resume discipline, not broad new subsystem discovery

## Engineering Value

This acceptance wave materially strengthens the next SNC cuts:

- launch failure classification
- follow-up/control wording
- partial-result salvage doctrine
- worker operator docs and diagnostics

It does not force a new architecture conversation.
That is the right outcome for this phase.
