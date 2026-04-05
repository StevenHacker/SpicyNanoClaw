# SNC Long-Range Research Roadmap

## Goal

Turn the OpenClaw + CC code reading effort into a decision-grade research program for SNC.

The target is not "understand everything."
The target is:

- know which layers matter for long-form writing
- know which mechanisms are already usable
- know which seams are dangerous to touch
- know which SNC decisions are still blocked by missing evidence

## Delivery Principle

SNC should become an OpenClaw enhancement layer plus a writing-specialized edition, not a casual fork that rewrites the host.

The default implementation rule is:

- prefer hot-pluggable seams over invasive edits
- only change OpenClaw internals when a current mechanism is clearly outdated or materially harming the product
- preserve working host capabilities unless evidence shows they conflict with SNC goals
- treat CC as a mechanism donor, not as a template to paste wholesale

This principle applies to every later decision memo.

## Research Strategy

Use three stacked passes instead of one giant scan:

1. Runtime truth pass
2. Mechanism comparison pass
3. SNC decision pass

This keeps us from mixing filesystem familiarity, behavior claims, and architecture advice into one blurry phase.

## Phase 1: Runtime Truth Pass

### Objective

Reconstruct what each system actually does in the core runtime paths relevant to SNC.

### Questions to close

#### OpenClaw

- How does context assembly really work?
- What does the model actually see at each turn?
- Where do prompt additions enter?
- How do compaction, pruning, hooks, and post-turn maintenance interact?
- Where does memory injection or memory flush happen?

#### CC

- How does QueryEngine hold session state?
- Where does query loop compaction happen?
- When do SessionMemory and extractMemories fire?
- How does MEMORY.md return into the active prompt?
- How is tool surface throttled on first screen and mid-run?

### Deliverables

- `research/10_callchains_openclaw.md`
- `research/11_callchains_cc.md`
- `research/12_domain_atlas_openclaw.md`
- `research/13_domain_atlas_cc.md`
- `research/30_harness_patterns_cc.md`
- `research/31_harness_to_openclaw_mapping.md`
- `research/32_snc_v1_host_shape.md`
- `research/34_collab_workstreams.md`
- additional raw evidence under `research/evidence/`

### Exit criteria

- at least one verified call chain for each of:
  - context assembly
  - system prompt assembly
  - compaction
  - memory recall / memory writeback
  - tool exposure shaping

## Phase 2: Mechanism Comparison Pass

### Objective

Compare the two systems only along SNC-relevant dimensions.

### Comparison axes

1. Single-session state continuity
2. Cross-session long-term memory
3. Context hygiene / token pressure
4. Output density / anti-mechanical controls
5. Safe insertion seams inside OpenClaw

### Working rule

Every comparison row must answer:

- OpenClaw current mechanism
- CC current mechanism
- which one is stronger for long-form writing
- whether the gap is prompt-only, runtime-level, or storage-level
- whether the mechanism is portable into OpenClaw shape

This phase should also maintain a broad repository-atlas layer so deep SNC work does not collapse into only one or two subsystems.
It should also maintain collaboration-ready work packets so stronger models can be added later without restarting repo orientation.

### Deliverables

- `research/30_harness_patterns_cc.md`
- `research/31_harness_to_openclaw_mapping.md`
- `research/30_writing_failure_mapping.md`
- `research/40_snc_opportunities.md`
- `research/41_snc_risks.md`
- updated `research/20_evidence_matrix.md`

### Exit criteria

- every user pain point maps to at least one verified code mechanism or one explicit evidence gap

## Phase 3: SNC Decision Pass

### Objective

Convert evidence into engineering decisions.

### Decisions to produce

- where SNC v1 should enter OpenClaw
- which capabilities belong in v1
- which capabilities should be deferred
- which OpenClaw mechanisms must stay untouched
- which existing OpenClaw mechanisms should be wrapped instead of replaced
- which existing OpenClaw mechanisms are proven drag and therefore worth modifying internally
- which CC mechanisms are worth borrowing
- which decisions remain blocked

### Output shape

At this phase we still do not jump straight into full implementation.
We produce:

- insertion-layer recommendation
- capability ordering
- risk register
- minimal spike candidates only
- bounded host-shape notes such as `research/32_snc_v1_host_shape.md`

### Exit criteria

- SNC v1 can be described as a bounded engineering plan rather than a vague aspiration

## Recommended Reading Order

### Track A: OpenClaw core runtime first

1. `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`
2. `src/agents/pi-embedded-runner/run/attempt.prompt-helpers.ts`
3. `src/agents/pi-embedded-runner/system-prompt.ts`
4. `src/context-engine/types.ts`
5. `src/context-engine/legacy.ts`
6. `src/agents/pi-embedded-runner/compact.ts`
7. `src/agents/pi-embedded-runner/compaction-hooks.ts`
8. `src/agents/pi-tools.ts`
9. `src/plugins/*memory*`
10. `extensions/*memory*`

Why first:

- OpenClaw is the host architecture we intend to modify.

### Track B: CC memory / compaction spine second

1. `src/query.ts`
2. `src/QueryEngine.ts`
3. `src/services/compact/*`
4. `src/services/SessionMemory/*`
5. `src/services/extractMemories/*`
6. `src/memdir/*`
7. `src/tools/ToolSearchTool/*`
8. `src/Tool.ts`

Why second:

- CC is the better reference implementation for memory and context control questions.

### Track C: Cross-repo comparison third

- Do not compare prematurely.
- First finish one closed call chain on each side.

## Research Rhythm Per Round

Each round should do only one of these:

1. Close one OpenClaw chain
2. Close one CC chain
3. Compare one mechanism across both repos
4. Write one decision memo from already-confirmed evidence

Avoid mixing all four in one round.

## Priority Order For SNC-Relevant Questions

### Priority 0

- OpenClaw context assembly
- OpenClaw compaction seam
- CC SessionMemory vs extractMemories boundary

These are gating questions.

### Priority 1

- OpenClaw memory recall / memory prompt entry path
- CC MEMORY.md recall path
- CC microCompact / tool-result budget behavior

### Priority 2

- anti-mechanical / anti-verbosity controls
- tool exposure shaping
- output density controls

## What We Should Not Do Yet

- build a grand SNC architecture document
- propose embeddings-first memory backend
- replace OpenClaw memory stack before understanding current recall/writeback path
- rewrite healthy OpenClaw internals just because CC has a nicer local mechanism
- discuss UI as if it were the bottleneck
- prototype anything larger than a spike tied to one closed hypothesis

## Near-Term Milestones

### Milestone 1

OpenClaw call-chain packet complete:

- context assembly
- system prompt assembly
- compaction seam

### Milestone 2

CC call-chain packet complete:

- QueryEngine
- SessionMemory
- extractMemories
- MEMORY.md recall

### Milestone 3

Comparison packet complete:

- writing pain point to mechanism matrix
- borrow / adapt / avoid list

### Milestone 4

SNC v1 decision memo:

- insert here
- keep these defaults
- extend these seams hot-pluggably
- only internally modify these host layers
- borrow these mechanisms
- do not touch these layers yet
