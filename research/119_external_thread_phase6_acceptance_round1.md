# External Thread Phase 6 Acceptance - Round 1

## Purpose

This note records the acceptance pass for external-thread packets `33-36`.

The goal is not to inflate coverage.
The goal is to record what became more exact for:

- worker completion semantics
- clean-host plugin activation reality
- CC follow-up/control donor boundaries
- the operator contract of `Milestone 2`

## Accepted Packets

- `33` `research/113_oc14_subagent_completion_delivery_matrix.md`
- `34` `research/114_oc15_plugin_enablement_restart_matrix.md`
- `35` `research/115_cc13_delegation_followup_remote_control_matrix.md`
- `36` `research/116_syn07_snc_milestone2_operator_profile.md`

## What Actually Improved

### OpenClaw

The main OpenClaw gain is that completion and delivery are now separate engineering facts instead of one fuzzy “worker finished” concept.

What is now materially clearer:

- registered subagent runs complete through registry bookkeeping first, then delivery cleanup
- completion-message flows are direct-first, while non-completion-message flows are queue-first
- deferred `subagent_ended` and later `contextEngine.onSubagentEnded(...)` are real and ordered, not imagined as immediate end hooks
- install/enable/disable/update/uninstall remain config-plus-restart product lanes even though loader internals can reload in-process
- fresh CLI visibility is not the same thing as a running gateway having adopted the new plugin registry

This directly improves:

- worker follow-up and diagnostics design
- clean-host delivery rehearsal
- README/install wording discipline

### CC

The main CC gain is sharper control-surface separation.

What is now materially clearer:

- running local-agent follow-up, completed local-agent resume, teammate messaging, and remote-agent monitoring are different mechanisms
- `SendMessage`, resume, graceful terminate, force kill, and approval traffic are intentionally separate control surfaces
- remote-control transport ideas are product/service coupled, while the harness-level donor value is the boundary discipline itself

This directly improves:

- SNC worker-control vocabulary
- future adapter/interface design
- resistance to over-copying CC’s product shell

### SNC Operator Contract

The synthesis packet did not add much raw source coverage.
It did add one crucial practical boundary:

- `stateDir` is the real `Milestone 2` persistence boundary
- the recommended profile is not the same as the zero-config default
- hooks remain opt-in
- worker visibility should be described as bounded continuity-state visibility, not as a new control platform

That boundary reduces product-language drift during `Milestone 2`.

## Real Progress Assessment

These are post-acceptance estimates, not release claims.

### OpenClaw

Current read after accepting `33` and `34`:

- SNC-relevant host understanding: about `97%`
- broader host/platform understanding: about `88%`

Why this is a real increase:

- the most dangerous remaining ambiguity for worker delivery and clean-host activation was still open
- both are now explicit enough to support engineering and operator docs

Why it is not higher:

- remaining OpenClaw gains are now mostly implementation-contact gains and a few narrow lifecycle/operator edges

### CC

Current read after accepting `35`:

- SNC-relevant donor understanding: about `94%`
- broader repo/product understanding: about `84%`

Why this is a real increase:

- the remaining useful CC ambiguity was not “does it have remote agents,” but exactly how follow-up and control split by worker type
- that is now materially narrower

Why it is not higher:

- the remaining CC bulk is increasingly outside the donor frontier that matters for SNC or the specialization-kernel program

### Synthesis note

`36` improved release/operator clarity more than raw coverage.
It should be counted as a scope-control gain, not as a repo-reading jump.

## Engineering Read

The practical consequence is:

- `Milestone 2` delivery and worker work can now proceed on firmer host/operator ground
- README/install/demo language should now narrow further
- future durable-memory/operator work can build on a much cleaner profile boundary

## What Remains Open

The next external-thread wave should be even narrower:

- `37` `OC-16 ContextEngine Slot Lifecycle / Cleanup Symmetry Matrix`
- `38` `OC-17 Config Path / ResolvePath / StateDir Contract Matrix`
- `39` `CC-14 Memory Hygiene / Pruning / Explainability Matrix`
- `40` `SYN-08 SNC Milestone 2 Delivery / Docs Envelope`

## Dispatcher Read

After this acceptance pass, the best next order is:

1. `37`
2. `38`
3. `39`
4. `40`

That order keeps research tied to the next real needs:

- clean-host slot safety
- exact path/stateDir guidance
- durable-memory diagnostics donor value
- bounded delivery/docs synthesis for the next release wave
