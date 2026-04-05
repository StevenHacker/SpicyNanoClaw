# Collaboration Workstreams

## Purpose

This file prepares the research program for future stronger-model collaboration.

Operational claiming for external parallel threads now lives in:

- `research/53_external_thread_claims.md`
- current launch order and bundling guidance now lives in:
  - `research/74_external_thread_phase2_plan.md`

It is not an implementation plan.
It is a packetization layer:

- what can be studied in parallel
- what should stay separate
- what should not duplicate already-settled SNC documents

## Exclude From These Workstreams

These are already covered enough that future work should extend them, not restart them:

- `research/10_callchains_openclaw.md`
- `research/11_callchains_cc.md`
- `research/30_harness_patterns_cc.md`
- `research/31_harness_to_openclaw_mapping.md`
- `research/32_snc_v1_host_shape.md`

## Workstream Packets

### 1. OpenClaw Plugin / Config / Security Substrate

Primary repo:

- OpenClaw

Scope:

- plugin loader and activation lifecycle
- config surfaces that affect plugin and command behavior
- security / audit / tool-policy boundaries that could constrain SNC packaging

Why it matters:

- SNC may be architecturally clean in the runner and still be constrained by host trust, policy, or enablement behavior

Likely outputs:

- plugin activation boundary note
- config and enablement constraint note
- security/policy constraint note

### 2. OpenClaw Channel / Session / Gateway Fabric

Primary repo:

- OpenClaw

Scope:

- channels
- session and routing identity
- gateway-facing orchestration surfaces

Why it matters:

- later SNC delivery, remote control, and author workflow may depend on more than the embedded runner alone

Likely outputs:

- channel/session identity map
- gateway surface summary
- risks for SNC deployment beyond local runner use

### 3. OpenClaw Capability Stack Beyond SNC Core

Primary repo:

- OpenClaw

Scope:

- media, speech, web-search, image-generation, link/media understanding
- how capability plugins cluster around the host

Why it matters:

- later SNC may need to cooperate with multimodal or helper capabilities without polluting writing context

Likely outputs:

- capability-domain atlas
- capability interaction summary
- notes on which capability domains are likely irrelevant vs later-relevant for SNC

### 4. CC Command / Product Shell

Primary repo:

- CC

Scope:

- command surface
- terminal shell behavior
- CLI / screen / output-style / review / plugin / memory command families

Why it matters:

- some apparent "CC quality" may come from product shell design rather than the query runtime itself

Likely outputs:

- command-family atlas
- product-shell donor note
- separation of shell-value vs runtime-value

### 5. CC Server / Remote / Service Layer

Primary repo:

- CC

Scope:

- server and remote surfaces
- service API layer
- bridge / upstream / remote-managed behavior

Why it matters:

- helps distinguish which CC behaviors depend on service architecture rather than local runtime harness

Likely outputs:

- remote/service atlas
- service-dependency note
- donor-risk note for SNC

### 6. CC Governance / Settings / Policy

Primary repo:

- CC

Scope:

- settings sync
- remote managed settings
- policy limits
- permission- and privacy-adjacent command surfaces

Why it matters:

- later borrowing decisions are cleaner if we know which CC behavior is enforced by governance instead of prompt/runtime design

Likely outputs:

- governance surface note
- settings/policy boundary map
- "runtime behavior vs governance behavior" separation note

### 7. CC Analytics / Summary / Suggestion Layer

Primary repo:

- CC

Scope:

- analytics
- agent summary
- tool-use summary
- prompt suggestion
- tips / MagicDocs / related secondary-intelligence services

Why it matters:

- these may explain part of CC's product feel without being part of the core query harness

Likely outputs:

- secondary-intelligence atlas
- donor-value note
- non-core-product-pattern summary

### 8. Cross-Repo Donor Separation

Primary repo:

- Both

Scope:

- separate runtime donor ideas from product-shell donor ideas
- separate host-platform constraints from runner-local constraints

Why it matters:

- later SNC design quality depends on borrowing the right layer from the right repo

Likely outputs:

- donor-layer matrix
- "borrow / adapt / ignore" note for non-SNC-spine domains

## Coordination Rules

1. Do not reopen already-settled SNC seam documents unless new evidence directly challenges them.
2. Every packet should clearly say whether it is:
   - runtime
   - product shell
   - platform/ops
   - governance
3. Every packet should end with a short "SNC relevance" section, even if the answer is "low for now."
4. Broad domain maps should not pretend to be deep behavioral proof.
5. Deep packets should cite representative entry files, not only directory names.

## Current Best Use Of Stronger Models Later

The strongest future collaboration targets currently look like:

1. whole-domain packets that need wide reading but modest architectural judgment
2. donor-separation packets that compare many surfaces without making final SNC design calls
3. non-SNC platform/product-shell domains that would otherwise starve while we stay focused on SNC core
