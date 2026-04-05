# External Thread Phase 11 Acceptance Round 1

## Purpose

This note closes the first acceptance wave for phase 11.

Phase 11 existed to answer the last admission-grade worker questions for `Milestone 2`:

- what "reply may arrive later" really means
- when local worker state is stale versus merely no longer recent
- how resume/restart language should stay honest
- whether `Milestone 2` can be admitted with bounded worker claims now

## Accepted Packets

1. `53` `OC-24 Worker Late-Reply / Announce Visibility Matrix`
   - `research/149_oc24_worker_late_reply_announce_visibility_matrix.md`
2. `54` `OC-25 Worker Inspection / Stale-State Cleanup Matrix`
   - `research/150_oc25_worker_inspection_stale_state_cleanup_matrix.md`
3. `55` `CC-18 Resume Outcome Communication / Restart Boundary Matrix`
   - `research/151_cc18_resume_outcome_restart_boundary_matrix.md`
4. `56` `SYN-12 SNC Milestone 2 Admission Envelope`
   - `research/152_syn12_snc_milestone2_admission_envelope.md`

All four packets are accepted.

## What Closed

### OpenClaw late follow-up visibility is now admission-grade

Accepted packet `53` closes the last important ambiguity around `sessions_send`:

- `accepted` keeps a real later visibility lane open
- `ok` without `reply` does not mean "reply still pending"
- later session-visible transcript truth and later announce delivery are different layers
- timeout is weaker than success, but it is also not a cleanup signal

This materially improves SNC worker wording because late follow-up can now stay branch-true instead of fuzzy.

### Stale worker cleanup is now host-truth-first instead of ledger-first

Accepted packet `54` closes the stale-state doctrine:

- end-state and cleanup-settled are different phases
- `subagents list` is recent-window truth, not universal worker existence truth
- `session_status` and `sessions_history` outrank SNC-local memory when host truth still exists
- timeout belongs in the inspect-first lane, not the cleanup lane

This gives SNC a safer boundary for live-tracking retention, stale-state downgrade, and "historical only" language.

### CC now has a cleaner donor boundary for resume/restart wording

Accepted packet `55` sharpens the donor read:

- live follow-up is not resume
- resume is sanitized re-entry, not uninterrupted continuation
- restart/relaunch is its own clean lane
- partial-result carry-forward should remain conditional
- no-honest-resume cases should be stated plainly

This is the last donor packet needed to keep SNC operator language honest without borrowing CC product shell bravado.

### Milestone 2 now has one bounded admission envelope

Accepted packet `56` closes the synthesis side:

- `Milestone 2` can now be judged as a specialized continuity plugin with bounded helper-worker support
- it can honestly claim launch, yield, inspect-first recovery, bounded follow-up reasoning, and durable diagnostics
- it still cannot honestly claim first-class resume, guaranteed late reply delivery, or general orchestration-platform status

That is exactly the bounded admission note the main thread needs.

## Real Progress Assessment

This round improved admission clarity much more than raw source coverage.

### OpenClaw

Current read after acceptance:

- SNC-relevant host understanding: about `99%`
- broader host/platform understanding: about `93%`

Why this only moved slightly:

- the gain was in restart-grade worker/operator realism and stale-state truth, not in unexplored host topology

### CC

Current read after acceptance:

- SNC-relevant donor understanding: about `98%`
- broader repo/product understanding: about `89%`

Why this only moved slightly:

- the new gain is honest restart/resume boundary discipline, not broad new subsystem excavation

## Engineering Value

This wave materially improves the last `Milestone 2` closeout lane:

1. follow-up wording can now separate accepted, observed reply, no fresh reply, timeout, and later announce work
2. stale worker cleanup can now obey host truth instead of SNC-local guesswork
3. resume language can stay narrower than ambition and therefore more trustworthy
4. admission can now be judged against one bounded envelope instead of scattered edge-case notes

## Remaining Pressure

The remaining pressure is no longer "what do the worker seams do?"

It is now closer to admission and release practice:

- restart-time worker/session truth after host restart
- plugin removal / stateDir hygiene and cleanup wording
- one final release/operator packet that turns the accepted admission envelope into practical release language

## Dispatcher Read

Phase 11 is successful.

It closed the last major worker admission blind spots tightly enough that the next external wave can stay narrow, operator-facing, and release-serving rather than reopening the worker architecture.
