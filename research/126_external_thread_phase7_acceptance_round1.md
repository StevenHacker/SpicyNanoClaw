# External Thread Phase 7 Acceptance - Round 1

## Purpose

This note records the acceptance pass for external-thread packets `37-40`.

The goal is not to inflate source coverage.
The goal is to record what became more exact for:

- clean-host slot safety
- SNC path/operator guidance
- durable-memory donor hygiene
- `Milestone 2` delivery/docs boundaries

## Accepted Packets

- `37` `research/121_oc16_contextengine_slot_lifecycle_matrix.md`
- `38` `research/122_oc17_config_path_statedir_matrix.md`
- `39` `research/123_cc14_memory_hygiene_explainability_matrix.md`
- `40` `research/124_syn08_snc_milestone2_delivery_docs_envelope.md`

## What Actually Improved

### OpenClaw

The main OpenClaw gain is that two operator-risk areas are no longer fuzzy:

- `contextEngine` slot selection is now known to be cleanup-asymmetric
- SNC path resolution is now known to be plugin-resolver/CWD-relative rather than config-file-relative

What is now materially clearer:

- disabling or uninstalling a selected `context-engine` plugin can leave a stale slot behind
- update-id migration also leaves `plugins.slots.contextEngine` untouched
- safe SNC removal is a two-step operator action:
  - reselect another engine first
  - then disable or uninstall
- SNC path-like config values are not config-file-relative
- `stateDir` is the true persistence boundary, but relative `stateDir` examples inherit gateway CWD semantics

This directly improves:

- clean-host docs honesty
- support/troubleshooting wording
- future operator-facing validation checks

### CC

The main CC gain is that durable-memory donor value is now sharper at the hygiene layer.

What is now materially clearer:

- CC treats memory hygiene as a contract, not a UI feature
- duplicate avoidance is layered:
  - extractor prompt rules
  - main-agent-write short-circuit
  - selector dedupe
  - read-state dedupe
- stale-memory handling is explicit and operator-legible
- scan and surfacing budgets do much of the practical pruning work
- trusted-source gating around memory-root changes is part of the hygiene story

This directly improves:

- SNC durable-memory diagnostics/control design
- future freshness and duplication signaling
- resistance to over-copying CC memory shell features before the substrate is ready

### SNC Delivery Boundary

The synthesis packet again improved boundary clarity more than raw coverage.

What is now materially clearer:

- the first-run story should stay:
  - ordinary plugin install
  - explicit slot selection
  - explicit `stateDir`
  - restart
- hooks should stay opt-in in outward docs
- docs must now include two concrete warnings:
  - sticky `contextEngine` slot cleanup
  - CWD-relative SNC path resolution

This directly improves:

- README correctness
- release-note discipline
- clean-host rehearsal value

## Real Progress Assessment

These are post-acceptance estimates, not launch estimates.

### OpenClaw

Current read after accepting `37` and `38`:

- SNC-relevant host understanding: about `98%`
- broader host/platform understanding: about `89%`

Why this is a real increase:

- the remaining OpenClaw ambiguity was no longer broad runtime structure
- it was operator-safe slot/path reality
- both of those are now exact enough to guide implementation and docs

Why it is not higher:

- the remaining useful gains are now mostly implementation-contact or deployment-lane specifics, not static repo structure

### CC

Current read after accepting `39`:

- SNC-relevant donor understanding: about `95%`
- broader repo/product understanding: about `85%`

Why this is a real increase:

- the biggest remaining donor ambiguity on the memory side was hygiene, freshness, dedupe, and explainability
- that gap is now materially narrower

Why it is not higher:

- the remaining CC bulk is increasingly outside the donor frontier that matters for SNC `Milestone 2`

### Synthesis note

`40` improved delivery/docs clarity much more than raw source coverage.
It should be counted as a scope-control gain, not as a repo-reading jump.

## Engineering Read

The practical consequence is:

- the next durable-memory cut can be more operator-aware and less append-only
- clean-host docs now have exact warnings instead of vague caveats
- future SNC validation can profitably add slot/path diagnostics without guessing host behavior

## What Remains Open

The next external-thread wave should stay narrow and implementation-serving:

- `41` `OC-18 Plugin Diagnostics / Doctor / Config-Validate Surface Matrix`
- `42` `OC-19 Gateway Launch / Working-Directory Matrix`
- `43` `CC-15 SessionMemory / ExtractMemories Failure-Skip-Control Matrix`
- `44` `SYN-09 SNC Durable-Memory Operator Envelope`

## Dispatcher Read

After this acceptance pass, the best next order is:

1. `41`
2. `43`
3. `42`
4. `44`

That order keeps research tied to the next real needs:

- operator/support diagnostics
- durable-memory control quality
- clean-host path/CWD realism
- bounded durable-memory outward contract
