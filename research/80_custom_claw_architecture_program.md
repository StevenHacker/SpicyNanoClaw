# Custom Claw Architecture Program

## Purpose

This packet turns the current program from:

- one successful specialized plugin effort (`SNC`)

into:

- a repeatable architecture doctrine for future specialized Claw products built on OpenClaw

It builds on accepted evidence, not on feature brainstorming:

- `research/78_openclaw_modification_atlas.md`
- `research/79_cc_harness_design_codex.md`
- `research/32_snc_v1_host_shape.md`
- `research/67_snc_durable_memory_v1_design.md`
- `research/72_snc_multiworker_v1_design.md`
- `research/73_snc_tool_shaping_helper_tools_v1.md`

The point is not to design "the next feature."
The point is to define a durable way to build many future custom Claws without re-learning the host or forking it casually.

## 1. Core architecture read

The strongest current read is:

1. OpenClaw is the host platform
2. a specialized Claw should usually be a variant layer on top of that host
3. CC is primarily a donor of harness principles, not a donor of product shape

That yields one main doctrine:

- preserve the OpenClaw host kernel
- extract specialization into a reusable variant kernel
- import CC ideas as harness rules and bounded utilities, not as literal runtime transplants

## 2. Layered architecture

### Layer A. Host kernel

This layer stays OpenClaw-owned by default.

It includes:

- embedded runner and turn execution kernel
- session/routing/conversation identity
- plugin discovery, registry, and slot rules
- tool policy and dangerous-tool enforcement
- gateway/daemon/control-plane infrastructure
- capability-provider infrastructure
- config validation and environment hardening

This is the layer future custom Claws should consume, not replace, unless a missing seam or host defect is proven.

### Layer B. Specialization kernel

This is the layer we should deliberately grow.

It is the reusable "custom Claw substrate" that sits on top of OpenClaw and below any domain-specialized product.

Recommended contents:

- one core plugin package
- `context-engine` ownership
- bounded hook layer
- plugin-local state and sidecars
- bounded helper-tool layer
- variant config schema
- acceptance/validation harness
- product doctrine docs and release envelope

This is the layer SNC is already growing into.

### Layer C. Domain capability packs

These are variant-specific packs that sit on top of the specialization kernel.

Examples:

- writing continuity pack
- research/retrieval pack
- coding/review pack
- ops/control pack

These should mostly be composed from:

- plugin-local modules
- helper tools
- state projections
- worker-policy variants
- variant config

### Layer D. Product shell

This is where operator-facing shape lives:

- CLI/TUI affordances
- gateway exposure choices
- deployment packaging
- product-specific defaults
- optional analytics or summaries

This layer should stay downstream of the specialization kernel.
It should not be allowed to drive premature host-kernel edits.

## 3. Kernel vs specialization boundary

| Concern | Host kernel owns by default | Specialization kernel owns by default |
| --- | --- | --- |
| Turn execution order | Yes | No |
| Session identity and routing | Yes | No |
| Model-visible continuity projection | No | Yes via `context-engine` |
| Transcript hygiene for variant-specific chatter | No | Yes via hooks and maintenance |
| Variant-local durable continuity | No | Yes |
| Variant helper tools over owned artifacts | No | Yes |
| Worker execution substrate | Yes | No |
| Worker policy, briefs, fold-back | No | Yes |
| Dangerous-tool policy | Yes | No |
| Variant-specific prompt/state doctrine | No | Yes |
| Gateway/service wrappers | Mostly yes | Product shell may configure, not replace |

Boundary rule:

- if the behavior can remain plugin-scoped, slot-scoped, or variant-configured, it belongs to the specialization side
- if the behavior must alter routing, execution, global policy, or transport semantics for the whole host, it is host-kernel territory

## 4. Reusable capability taxonomy for future custom Claws

These are the capability families we should now think in, independent of any one product.

### 4.1 Continuity

Purpose:

- keep a stable current-state anchor for long-running work

Current best home:

- specialization kernel

Current SNC status:

- already landed

### 4.2 Durable memory

Purpose:

- preserve confirmed long-horizon facts across sessions

Current best home:

- specialization kernel first
- host memory integration later only if needed

Current SNC status:

- utility landed, integration pending

### 4.3 Transcript shaping

Purpose:

- reduce noise while keeping deterministic replay

Current best home:

- specialization kernel via hook layer

Current SNC status:

- landed

### 4.4 Helper tools

Purpose:

- expose owned artifacts or bounded state on demand instead of prompt stuffing

Current best home:

- specialization kernel

Current SNC status:

- utility landed, registration deferred

### 4.5 Worker orchestration

Purpose:

- delegate bounded side work without polluting the main thread

Current best home:

- host execution substrate plus specialization-owned policy

Current SNC status:

- policy utility landed, host integration deferred

### 4.6 Research/external retrieval

Purpose:

- bring in outside evidence without collapsing the core writing or coding flow

Current best home:

- host capability/tool stack plus variant policy

Likely future donor:

- OpenClaw `web-search`

### 4.7 Governance and release discipline

Purpose:

- keep variants safe, configurable, and shippable

Current best home:

- product shell and release envelope

### 4.8 Secondary intelligence

Purpose:

- improve UX density with suggestions, summaries, and optional sidecars

Current best home:

- optional downstream layer

Rule:

- never let this become the runtime spine

## 5. What we should carry from CC

The future custom-Claw program should preserve these CC donor principles:

- persistent session owner
- explicit worker identity and addressed queue ownership
- staged pressure relief
- deterministic shaping with frozen decisions
- separation of local truth from model-visible projection
- safe-window sidecars
- maintained-artifact-first compaction
- circuit breakers on automatic recovery
- explicit mode architecture instead of silent prompt sprawl

What we should not carry literally:

- CC's shell breadth
- CC's service contracts
- CC's enterprise/governance delivery plumbing
- CC's provider-specific APIs and protocols

So the donor doctrine is:

- import harness laws
- do not import product body plan

## 6. What we should preserve from OpenClaw

The future custom-Claw program should preserve these OpenClaw host truths:

- host session identity is canonical
- plugin/slot registration is the default extension surface
- tool policy stays host-authoritative
- gateway/daemon/control-plane infrastructure stays host-owned
- capability-provider infrastructure is shared host infrastructure
- config validation and env hardening are not optional

So the host doctrine is:

- use the host as a platform
- specialize by composition first
- edit internals only on evidence

## 7. Migration path

### Milestone 1. Bounded continuity core

Target:

- SNC as a stable continuity-enhanced writing variant

Required pieces:

- session continuity core
- hook shaping
- durable-memory utility
- helper-tools utility
- worker-policy utility

Status:

- largely in place

### Milestone 2. Controlled integration

Target:

- wire the new utilities into the SNC plugin without broadening host ownership

Likely work:

- durable-memory harvest/projection integration
- helper-tool registration decisions
- worker-policy integration with host spawn/send/yield seams
- release-envelope definition

### Milestone 3. Productization

Target:

- turn SNC from a working host copy into a cleaner public milestone

Likely work:

- repo boundary cleanup
- canonical packaging
- validation gate formalization
- release/readme/docs discipline

### Milestone 4. Variant-kernel extraction

Target:

- make the specialization kernel reusable for non-SNC custom Claws

Likely work:

- generalize utility modules where appropriate
- define a stable variant-pack layout
- isolate domain packs from reusable substrate

### Milestone 5. Family of specialized Claws

Target:

- multiple domain-specialized variants sharing one doctrine

Examples:

- writing-first Claw
- research-first Claw
- coding/review Claw
- ops/control Claw

This is the true long-range horizon.

## 8. Build rules for future custom Claws

1. Start from host seams, not host rewrites.
2. Put long-lived specialization logic in the specialization kernel, not in the product shell.
3. Treat helper tools, durable memory, and worker orchestration as separate capability families.
4. Keep transcript shaping, memory projection, and worker fold-back deterministic.
5. Prefer maintained artifacts over fresh summarization under pressure.
6. Treat governance and release discipline as first-class engineering work, not cleanup for later.
7. Keep secondary-intelligence layers optional and downstream.
8. Only touch host internals when a missing seam or product-negative host behavior is evidenced.

## 9. SNC relevance

SNC is still the immediate target, but it is now also the first proving ground for the larger program.

That means SNC should be built with two standards at once:

- good enough to ship as a real writing-specialized OpenClaw enhancement
- clean enough to serve later as the first instance of a reusable custom-Claw specialization kernel

So the right read is:

- SNC is not the whole horizon
- but SNC is the first concrete path through it

## 10. Bottom line

The program now has a workable long-range architecture:

1. keep OpenClaw as the host kernel
2. grow a reusable specialization kernel above it
3. use CC as a donor of harness laws
4. let SNC become the first real specialized Claw built on that doctrine

That is the architecture path that can support both the immediate milestone and the larger ambition to build custom Claws deliberately instead of by repeated reinvention.
