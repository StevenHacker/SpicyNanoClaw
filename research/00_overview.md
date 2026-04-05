# SNC Cold Start Research - Round 1 Overview

## Scope

This round only covers:

- repository acquisition / version freezing
- directory structure scan
- main-chain entrypoint identification
- SNC-relevant file shortlist

This round explicitly does **not** propose SNC implementation.

## Program Status

- Cold start: complete
- Long-range roadmap: established
- Next mode: phased call-chain excavation

## Current Milestones

- `SNC Milestone 1`: release-candidate achieved and packaged
- `SNC Milestone 2`: active implementation phase

Current `Milestone 2` read:

- general-assistant compatibility guard is landed
- worker execution scaffold, runtime fold-back, and lifecycle bookkeeping are landed
- controller-launch path now has a live first cut through queued launch intent plus `Worker launch lane` projection
- worker diagnostics and bounded worker-state hygiene are now landed
- clean-host delivery rehearsal is now landed and repeatable against a real clean-host mirror
- durable-memory diagnostics and bounded controls are now landed
- external phase-11 research is now accepted, so late-reply visibility, stale-state cleanup truth, honest restart/resume wording, and a bounded `Milestone 2` admission envelope are no longer major blind spots
- remaining pressure is now narrower and more release-facing:
  - restart-time worker/session truth
  - plugin removal and `stateDir` hygiene wording
  - one final `Milestone 2` release/operator packet

## Delivery Rule

SNC is being treated as an OpenClaw-wide enhancement plus a writing-specialized edition.

Implementation rule:

- default to hot-pluggable additions
- only modify OpenClaw internals when a host mechanism is clearly outdated or product-negative
- otherwise preserve the host and layer SNC on top

## Frozen Sources

### OpenClaw

- Local snapshot: `data/external/openclaw-v2026.4.1`
- Snapshot marker: `data/external/openclaw-v2026.4.1/VERSION_SNAPSHOT.txt`
- Source: `https://api.github.com/repos/openclaw/openclaw/zipball/refs/tags/v2026.4.1`
- Commit: `da64a978e5814567f7797cc34fbe29b61b7eae7a`

### CC

- Local snapshot: `data/external/claude-code-leeyeel-4b9d30f`
- Snapshot marker: `data/external/claude-code-leeyeel-4b9d30f/VERSION_SNAPSHOT.txt`
- Source: `https://api.github.com/repos/seanlab007/claude-code-leeyeel/zipball/4b9d30f7953273e567a18eb819f4eddd45fcc877`
- Commit: `4b9d30f7953273e567a18eb819f4eddd45fcc877`

## What Was Read

### OpenClaw

- `data/external/openclaw-v2026.4.1/src/context-engine/index.ts`
- `data/external/openclaw-v2026.4.1/src/agents/pi-embedded-runner/run/attempt.ts`
- `data/external/openclaw-v2026.4.1/src/agents/system-prompt.ts`
- directory scan around `src/agents/pi-embedded-runner/*`

### CC

- `data/external/claude-code-leeyeel-4b9d30f/src/QueryEngine.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/query.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/memdir/memdir.ts`
- directory scan around `src/services/*`, `src/memdir/*`, `src/tools/*`

## Confirmed This Round

1. The two source snapshots are now locally frozen with reproducible upstream references and commit/tag fingerprints.
2. The CC snapshot matches the instruction memo closely at the structure level: `src/QueryEngine.ts`, `src/query.ts`, `src/Tool.ts`, `src/services/SessionMemory`, `src/services/extractMemories`, `src/services/compact`, and `src/memdir` all exist.
3. OpenClaw `v2026.4.1` still contains the core surfaces named in the memo, including `src/context-engine`, `src/agents/pi-embedded-runner/run/attempt.ts`, `src/agents/system-prompt.ts`, and `src/agents/pi-tools.ts`.
4. OpenClaw path layout has drifted relative to the memo for some subareas. The old `src/agents/pi-extensions/context-pruning` and `src/agents/pi-extensions/compaction-safeguard.ts` paths do not exist in this tag; related logic appears to have moved closer to `src/agents/pi-embedded-runner/*`.
5. OpenClaw's prompt / runtime assembly path is already visibly concentrated in `attempt.ts`, which imports context-engine helpers, system prompt builders, compaction timeout handling, hook integration, memory flush forwarding helpers, tool construction, and transcript / history repair helpers.

## Confirmed This Round 2

1. OpenClaw `ContextEngine` is a real runtime contract, not a passive adapter. It can change both the active message set and the system prompt through `assemble(...)`.
2. OpenClaw prompt construction is multi-stage:
   - build base system prompt
   - let context engine prepend `systemPromptAddition`
   - let hooks override or prepend/append additional system context
3. OpenClaw already exposes post-turn lifecycle hooks through `afterTurn`, `ingestBatch` / `ingest`, and `maintain`, with maintenance able to request safe transcript rewrites from runtime-owned helpers.

## Confirmed This Round 3

1. The default context engine in `OpenClaw v2026.4.1` is `legacy`.
2. The default `legacy` engine is mostly a compatibility wrapper:
   - `assemble` passes messages through
   - `afterTurn` does nothing
   - `compact` delegates to runtime
3. OpenClaw compaction is not a single opaque step. In engine-owned compaction flow, compaction, maintenance, post-compaction side effects, and compaction hooks are separate stages.

## Confirmed This Round 4

1. OpenClaw default memory recall is mainly tool-mediated, not an always-injected current-state block.
2. The memory-core plugin contributes two separate layers:
   - prompt guidance telling the model when to call memory tools
   - runtime-backed `memory_search` / `memory_get` tools that resolve the active search manager
3. Memory freshness is handled by background sync triggers around session start, search, watch / interval, and post-compaction targeted session reindex.

## Confirmed This Round 5

1. CC uses a two-layer memory architecture rather than one lumped mechanism:
   - `SessionMemory` for rolling intra-session state
   - `extractMemories` + `memdir` for durable cross-session memory
2. `SessionMemory` is maintained through a post-sampling background hook and is explicitly reused during compaction, instead of regenerating a summary from scratch.
3. Durable memory recall in CC is relevance-based: header scan, side-query selection, memory attachment injection, and dedupe against already-read files.

## Confirmed This Round 6

1. OpenClaw exposes a real hot-pluggable `ContextEngine` registration seam through the plugin slot system.
2. Current bundled extensions do not appear to claim that seam in production code.
3. OpenClaw timeout and overflow compaction recovery branches are not lifecycle-identical: overflow visibly runs maintenance after compaction, while timeout currently does not in the visible branch.

## Confirmed This Round 7

1. OpenClaw has two distinct extension layers:
   - plugin slot / runtime plugin registration
   - embedded-runner internal extension factories
2. The first layer looks like the true external distribution seam; the second looks like host-internal runtime composition.
3. CC memory/compaction behavior is produced by runtime controls plus prompt constraints together, not by prompt wording alone.

## Confirmed This Round 8

1. OpenClaw external plugin delivery is backed by a concrete package contract:
   - `package.json` package metadata declares extension entry files
   - discovery records those entries as plugin candidates
   - `openclaw.plugin.json` supplies canonical plugin identity / kind / schema metadata
2. Bundled `memory-core` proves this is not theoretical:
   - it declares an OpenClaw package extension entry
   - ships a standard plugin manifest
   - exports a default `definePluginEntry(...)` module
3. CC baseline memory exposure is not a single path:
   - `loadMemoryPrompt()` supplies behavioral memory instructions
   - `getMemoryFiles()` + `getClaudeMds()` inject AutoMem / TeamMem entrypoint content into the CLAUDE.md-style context path
   - under `tengu_moth_copse`, that baseline index injection is filtered out and relevant-memory attachments take over more of the durable-recall job

## Confirmed This Round 9

1. In OpenClaw, slot-bearing plugins can still be capability hybrids:
   - `kind` governs slot ownership
   - it does not force a one-capability-only runtime shape
2. Bundled `memory-lancedb` demonstrates this directly:
   - it claims `kind: "memory"`
   - but still registers tools and lifecycle hooks, and can prepend recall context
3. Stock bundled manifests still lean conservative:
   - only `memory-core` and `memory-lancedb` surfaced with `kind`
   - no bundled manifest with a `kind` array was observed
4. In CC, `tengu_moth_copse` is now clearly a cross-cutting architecture flag rather than a tiny prompt switch:
   - it changes relevant-memory prefetch activation
   - baseline memory-file injection
   - `loadMemoryPrompt()` index behavior
   - extraction prompt behavior

## Confirmed This Round 10

1. OpenClaw timeout/overflow asymmetry is now sharper:
   - overflow recovery performs immediate post-compaction maintenance
   - timeout recovery does not visibly do the same in `run.ts`
2. Timeout-triggered compaction can still later reach maintenance only indirectly:
   - via ordinary turn-finalization
   - only if the retried turn succeeds cleanly
   - and that later maintenance runs as `reason: "turn"`, not `reason: "compaction"`

## Confirmed This Round 11

1. CC's strongest donor value is increasingly visible as harness design rather than isolated feature code.
2. The first high-value harness packet now looks like:
   - staged context-pressure relief
   - deterministic replacement decisions across turns
   - local-state / wire-state separation
   - scheduled sidecars with safe trigger windows
   - compaction circuit breakers
   - deferred capability exposure through ToolSearch
3. These patterns are now summarized separately in:
   - `research/30_harness_patterns_cc.md`

## Confirmed This Round 12

1. The first CC-harness-to-OpenClaw portability screen is now closed at the structural level.
2. The strongest SNC-ready harness imports are currently:
   - deterministic replacement decisions
   - local-truth vs model-visible projection
   - background sidecars at safe lifecycle windows
   - maintained-artifact reuse
   - circuit breakers
   - explicit mode switches
3. The portability screen also narrows one major architecture call:
   - a stronger SNC now likely wants to own the `contextEngine` slot
   - while still using ordinary plugin hooks for sidecars and maintenance
4. CC's pressure-relief ladder still looks valuable as policy, but not as something SNC should copy literally into OpenClaw v1.
5. This bridge is now tracked in:
   - `research/31_harness_to_openclaw_mapping.md`

## Confirmed This Round 13

1. The first bounded SNC host-shape read is now explicit.
2. Current minimal strong-shape read:
   - one SNC plugin package
   - owns the `contextEngine` slot
   - engine focuses on `assemble`, `compact`, `afterTurn`, `maintain`
   - helper hooks handle transcript shaping and slower sidecars
3. This narrows the main design question again:
   - not "plugin or host fork"
   - but "how thin can the SNC-owned engine stay while still delivering continuity value"
4. This bounded read is now tracked in:
   - `research/32_snc_v1_host_shape.md`

## Confirmed This Round 14

1. The repo read is no longer only SNC-spine-deep; the first broader domain atlases for both codebases are now written.
2. New breadth read:
   - OpenClaw is increasingly legible as a platform made of runtime core, plugin host, channel/gateway fabric, capability stack, and ops/security substrate
   - CC is increasingly legible as a query runtime plus memory/state substrate plus terminal product shell plus remote/service layer
3. This matters for later collaborative deep dives because not all valuable CC behavior belongs to its query loop, and not all OpenClaw risk belongs to the embedded runner.
4. These breadth packets are now tracked in:
   - `research/12_domain_atlas_openclaw.md`
   - `research/13_domain_atlas_cc.md`

## Confirmed This Round 15

1. The research program is now also packetized for future stronger-model collaboration.
2. Parallel-ready workstreams are now defined for:
   - OpenClaw plugin/config/security
   - OpenClaw channel/session/gateway fabric
   - OpenClaw capability stack
   - CC command/product shell
   - CC server/remote/services
   - CC governance/settings/policy
   - CC analytics/summary layer
   - cross-repo donor separation
3. This means later collaboration can deepen the full repos without reopening the already-settled SNC seam documents.
4. This packetization is tracked in:
   - `research/34_collab_workstreams.md`

## Confirmed This Round 16

1. We now have a real incoming SNC plugin baseline rather than only an abstract architecture target.
2. Current assessment:
   - it is already a native OpenClaw `context-engine` plugin
   - it already externalizes per-session writing state and reinjects it during `assemble()`
   - it still leaves `maintain()` effectively unimplemented
   - it still delegates compaction back to the host runtime
3. The strongest conclusion is that the colleague's v1 does **not** fight the current research direction.
   - it largely confirms it
4. This baseline assessment is now tracked in:
   - `research/35_snc_plugin_v1_assessment.md`

## Confirmed This Round 17

1. The incoming SNC plugin baseline is now locally executable, not only structurally reviewed.
2. A dedicated development copy was created at:
   - `data/working/openclaw-v2026.4.1-snc-v1`
3. In that host copy:
   - dependency install completed
   - SNC plugin tests passed
   - workspace typecheck passed
4. One practical host note is now confirmed:
   - full typecheck needs the documented `NODE_OPTIONS=--max-old-space-size=8192`
5. This strengthens the status of the colleague plugin from "credible base" to "validated development baseline."

## Confirmed This Round 18

1. The next-step execution order is now explicit, not only implied by research notes.
2. Current recommended build order:
   - baseline stabilization
   - session-state quality pass
   - real `maintain()` pass
   - SNC-aware compaction pass
   - optional hook/memory integration pass
3. This plan is now tracked in:
   - `research/36_snc_next_step_plan.md`

## Confirmed This Round 19

1. SNC has now moved from planning into its first narrow implementation pass.
2. The first landed code slice is:
   - `session-state` quality improvement inside the validated OpenClaw host workspace
3. That pass tightened behavior in the intended direction:
   - repaired broken Chinese cue matching
   - made directive / focus / assistant-plan extraction more conservative
   - restricted `chapterState.constraints` to user-originated instruction signals
4. Host-facing prompt assembly still holds after this change:
   - `engine.test.ts` was updated to use explicit directive/plan cues rather than weak tone-only text
5. Focused SNC verification is now green again:
   - `extensions/snc/src/session-state.test.ts`
   - `extensions/snc/src/engine.test.ts`
   - `5/5` tests passing

## Confirmed This Round 20

1. SNC now has a first real `maintain()` slice in the working host copy.
2. That slice is intentionally narrow:
   - reads the active transcript branch from `sessionFile`
   - only targets old assistant planning/meta messages
   - rewrites at most one entry per run
   - requires the runtime rewrite helper
3. The current safety boundary is now executable rather than only documented:
   - no rewrite helper means no-op
   - story prose is left untouched
   - recent messages are left untouched
4. Focused SNC verification is green after this maintenance pass:
   - `extensions/snc/src/session-state.test.ts`
   - `extensions/snc/src/engine.test.ts`
   - `8/8` tests passing
5. Full workspace typecheck remains compatible with the documented 8 GB Node heap setting.

## Confirmed This Round 21

1. SNC now has a first compaction-aware enhancement, not only assemble/maintain behavior.
2. The current compaction shape remains host-safe:
   - `ownsCompaction` is still `false`
   - SNC still delegates to stock OpenClaw compaction
   - SNC now adds writing-aware `customInstructions` derived from persisted session state
3. This means SNC can now influence what stock compaction preserves:
   - focus
   - latest directive
   - latest assistant plan
   - active constraints
   - continuity anchors
4. Focused SNC verification is green after this compaction pass:
   - `extensions/snc/src/session-state.test.ts`
   - `extensions/snc/src/engine.test.ts`
   - `9/9` tests passing
5. Full workspace typecheck remains green with the documented 8 GB heap setting.

## Confirmed This Round 22

1. The project is now moving from ad hoc subagent usage to an explicit dispatcher model.
2. The main thread is now defined as:
   - planner
   - scheduler
   - acceptance lead
   - git integration lead
3. This operating mode is now externalized into durable docs rather than held only in conversation.
4. OpenClaw deconstruction is now formally framed as a packetized program with required modification notes per subsystem.
5. Parallel execution is now tracked as a board, not just a loose intention.

## Confirmed This Round 23

1. Dispatcher cycle 1 completed end-to-end with the balanced `1 + 5` operating shape.
2. The first cycle proved the model across both research and implementation packets.
3. Accepted outputs from cycle 1 now include:
   - `OC-01` runtime-core deconstruction
   - `OC-02` plugin/host deconstruction
   - `OC-05` config/security/ops deconstruction
   - dispatcher validation helper
   - SNC hook scaffold v1
4. This means the multi-thread model is now proven not only for exploration, but also for bounded code delivery plus dispatcher-side acceptance.
5. Cycle 1 has become the first reusable dispatcher template rather than a one-off experiment.

## Confirmed This Round 23

1. The SNC plugin now exposes a disabled-by-default hook scaffold.
2. The first hook-facing config surface is now explicit:
   - `before_message_write`
   - `tool_result_persist`
   - `session_end`
3. The scaffold is inert unless enabled in config.
4. Default SNC runtime behavior remains unchanged when hook config is absent.
5. Focused SNC verification and workspace typecheck both passed after the scaffold landed.

## Confirmed This Round 23

1. A repeatable dispatcher-side validation helper now exists for the SNC working host copy.
2. The helper runs exactly the two acceptance gates we care about most right now:
   - focused SNC Vitest
   - 8 GB heap workspace typecheck
3. The helper was executed successfully against:
   - `data/working/openclaw-v2026.4.1-snc-v1`
4. The helper output is dispatcher-friendly:
   - step headings
   - success/failure markers
   - final pass line
5. The helper is documented as part of the operating model:
   - `research/41_dispatcher_validation_helper.md`

## Confirmed This Round 23

1. The balanced steady-state worker shape is now fixed:
   - `1` dispatcher
   - `5` worker slots
2. The first dispatcher cycle has been externalized as a concrete packet, not just a staffing idea.
3. That cycle now covers:
   - two OpenClaw deconstruction packets
   - one OpenClaw config/security packet
   - one SNC hook-integration engineering packet
   - one SNC validation/repo-hygiene packet
4. This means the project now has a real scheduling layer in addition to research and implementation layers.

## Confirmed This Round 24

1. Dispatcher cycle 003 is now fully closed as accepted implementation work, not only worker output.
2. The cycle-003 utility layer is now reflected in canonical docs:
   - `research/64_snc_transcript_shaping_utility.md`
   - `research/65_snc_replacement_ledger_utility.md`
   - `research/66_snc_hook_shaping_integration.md`
   - `research/68_snc_acceptance_matrix.md`
   - `research/70_snc_hook_shaping_spec.md`
3. SNC hook shaping is now a landed bounded behavior:
   - assistant planning/meta chatter can be rewritten before persistence
   - oversized or synthetic tool results can be preview-shaped with frozen session-local replacement fate
   - hook-owned state is cleared on `session_end`
4. The narrow SNC focus gate now also covers the standalone transcript-shaping utility, keeping the utility layer and the hook layer under one fast acceptance loop.
5. This means the SNC implementation frontier has moved again:
   - hook shaping is no longer only a spec
   - the next strongest frontier is the memory/durable-recall evidence lane plus bounded hook/utility convergence

## Confirmed This Round 25

1. Dispatcher cycle 004 has now produced its first accepted large-packet deconstruction outputs.
2. Accepted cycle-004 packets currently cover:
   - OpenClaw memory / recall / durable substrate
   - OpenClaw gateway / daemon / packaging surface
   - CC memory presentation modes / feature-gate matrix
   - CC task / background / subagent infrastructure
3. These packets materially improve the evidence base for SNC's next major layers:
   - durable memory can now be designed against explicit host/donor boundaries rather than broad intuition
   - worker orchestration can now borrow from CC's framework/abort/queue model without importing its whole product shell
   - deployment/productization can now target launcher/service/env seams instead of daemon rewrites
4. One cycle-004 packet was rejected during dispatcher acceptance:
   - the first `OC-08` memo drifted into the local Python MCP gateway in this repo instead of the OpenClaw external snapshot
   - it is not accepted as canonical OpenClaw evidence and has been reissued
5. This confirms the dispatcher discipline is working as intended:
   - worker output is useful
   - but only accepted packets become canonical program truth

## Confirmed This Round 26

1. Dispatcher cycle 004 is now fully closed with all five target packets accepted.
2. The accepted OpenClaw side now additionally covers the missing tool/MCP fabric packet:
   - discovery and packaging
   - tool registration
   - MCP exposure
   - execution
   - policy
   - transcript persistence
3. This closes a major gap in the host map:
   - SNC tool shaping can now be located on evidence-backed seams instead of guessed around the runner
4. The accepted cycle-004 set now gives us a stronger next-step basis for one larger SNC convergence:
   - durable memory design
   - orchestration donor selection
   - tool shaping boundaries
   - deployment/productization boundaries
5. In practical terms, the program has now moved from "bounded hook shaping is landed" to "bounded hook shaping plus the next host/donor design surfaces are mapped well enough to plan a larger version push."

## Confirmed This Round 27

1. The first SNC durable-memory design packet is now closed on accepted evidence rather than broad intuition.
2. That design does not point toward host-memory takeover in v1.
   - it points toward a plugin-owned three-plane sidecar:
   - harvest from SNC session artifacts
   - store plugin-local durable records
   - project only a few scored durable cues during `assemble(...)`
3. This is an important convergence point because it keeps three project rules aligned at once:
   - OpenClaw stays host-owned
   - SNC remains hot-pluggable
   - CC donor ideas are borrowed at the mode/presentation level rather than copied literally
4. Dispatcher cycle 005 is now open to tighten the two adjacent design lanes:
   - multi-worker orchestration
   - tool shaping / helper tools
5. The program is now operating one layer closer to the next larger implementation milestone:
   - not just hook shaping and evidence packets
   - but accepted design packets that can drive the next engineering cut

## Confirmed This Round 28

1. Dispatcher cycle 005 is now fully closed with all three target design packets accepted.
2. The accepted design set now covers the three next-step SNC lanes that were most likely to sprawl without a design pass:
   - durable memory v1
   - multi-worker orchestration v1
   - tool shaping / helper tools v1
3. This materially reduces ambiguity around the next implementation milestone:
   - durable memory no longer points toward host memory takeover
   - orchestration no longer points toward a second scheduler
   - tool shaping no longer points toward executor ownership or broad MCP exposure
4. The external-thread planning surface is now updated to reflect that shift:
   - the design-grade SNC packets are done
   - the remaining open external claims are mainly breadth/product-layer packets
5. The program is now ready to cut the next engineering slice from accepted design, not from raw repo exploration.

## Confirmed This Round 29

1. The remaining external breadth packets have now also been accepted:
   - OpenClaw UI / product surfaces
   - CC command / product shell
   - CC remote / server / service layer
   - CC governance / settings / policy
   - CC secondary intelligence layers
2. This means the codebase-read is no longer only "SNC-critical-path deep" but also broadly rounded:
   - the remaining product-shell, service, governance, and product-feel layers are now mapped
3. The practical effect is that donor separation is cleaner:
   - we can now distinguish CC runtime value from shell/service/governance/product-feel value with much less guesswork
4. The external-thread claim catalog is now effectively exhausted for the current numbered packet set.
5. The next main-thread work can therefore shift away from broad repo decomposition and toward implementation sequencing, repo hygiene, and milestone cutting.

## Confirmed This Round 30

1. A fresh numbered packet set is now live after the first deconstruction wave closed.
2. That new packet set is intentionally constrained:
   - bounded SNC utility implementation
   - OpenClaw modification doctrine
   - CC harness codification
   - future custom-Claw architecture capture
3. This means new parallel work is no longer being opened just to map more repo surface area.
   - every new packet must either unlock `SNC Milestone 1`
   - or increase future freedom to build specialized Claw variants on top of OpenClaw
4. Dispatcher cycle 006 is now active on exactly that basis:
   - durable-memory utility
   - helper-tools utility
   - multi-worker policy utility
   - OpenClaw modification atlas
   - CC harness design codex
5. The larger horizon is now explicit:
   - SNC is the current milestone
   - but the long-range goal is host/harness mastery sufficient to build multiple future custom Claws deliberately

## Confirmed This Round 31

1. The first utility-and-synthesis wave of Phase 3 is now accepted.
2. Newly accepted SNC utility packets now cover:
   - plugin-local durable memory
   - read-only helper tools over SNC-owned artifacts/session-state
   - bounded multi-worker policy primitives
3. Newly accepted architecture packets now cover:
   - an OpenClaw modification atlas
   - a reusable CC harness design codex
4. Main-thread validation closed one real regression and two type-system edges during acceptance:
   - helper-tools `sourceCount` semantics were corrected to reflect total available sources rather than filtered count
   - `durable-memory.ts` needed two TypeScript narrowing fixes before full workspace typecheck passed
5. This is an important program shift:
   - SNC now has more than design packets
   - it has bounded reusable utility layers that can be integrated in later cycles without reopening host-ownership questions

## Confirmed This Round 32

1. The dispatcher-held architecture follow-on is now also accepted.
2. The program now has an explicit long-range doctrine for future custom Claws:
   - OpenClaw remains the host kernel
   - a reusable specialization kernel grows above it
   - CC contributes harness laws rather than literal product shape
   - SNC becomes the first concrete proving ground for that doctrine
3. That closes a strategic gap in the program:
   - we are no longer only trying to ship one stronger plugin
   - we now have a path for building multiple specialized Claw variants deliberately
4. Dispatcher cycle 006 is now fully closed as an accepted cycle.
5. The main remaining open external packet in Phase 3 is now the milestone-1 release envelope.

## Confirmed This Round 33

1. Dispatcher cycle 007 is now fully accepted.
2. SNC durable memory is no longer only a utility or design packet.
   - it is now integrated into the main SNC continuity path through bounded `afterTurn(...)` harvest and `assemble(...)` projection
3. The Milestone 1 helper-tool decision is now explicit:
   - keep the helper-tool utility
   - defer actual runtime registration and any MCP/export choice
4. The first real host-wiring path for SNC worker policy is now explicit:
   - one-shot `runtime="subagent"` + `mode="run"` helpers over existing host session/subagent seams
5. This means the current frontier has shifted again:
   - from "can these utilities exist?" to "which of them should be integrated into Milestone 1, and which should stay deferred?"

## Confirmed This Round 34

1. A new precision excavation wave is now open for external threads.
2. That wave is deliberately narrower than the earlier breadth wave:
   - milestone-1 release envelope
   - exact OpenClaw runner timing
   - exact OpenClaw plugin/sdk stability surfaces
   - exact CC pressure/compaction lifecycle
   - exact CC memory lifecycle contract
3. This wave exists to support future engineering decisions, not to reopen broad repo mapping.
4. The current post-acceptance source-read estimate is now explicit:
   - OpenClaw SNC-relevant understanding is high, but broader host/platform mastery still has room to deepen
   - CC donor understanding is high, but broader repo/product understanding still lags behind the donor-critical core
5. The main-thread development queue is now also externalized as a modular workorder list rather than held only in conversation.

## Confirmed This Round 35

1. The first post-integration durable-memory hardening pass is now landed.
2. That pass improved quality rather than breadth:
   - same-turn duplicate directive fallback no longer inflates confirmation counts
   - weak stale derived entries are pruned from the durable catalog
   - stale durable entry files are cleaned from disk
3. This matters because durable memory is already in the live continuity path.
   - hygiene issues here would otherwise quietly compound over time
4. The next main-thread implementation queue is now clearer:
   - milestone/release envelope
   - worker execution adapter scaffold
   - helper-tool registration remains deferred by policy
5. No new host-ownership expansion was introduced in this pass.

## Confirmed This Round 36

1. The architect audit has now been closed with code-level validation rather than impression-based triage.
2. The strongest correction is factual:
   - `session-state` Chinese extraction was not actually broken in source
   - console mojibake had masked real UTF-8 content
   - direct runtime probes confirmed Chinese directive/plan/constraint extraction still works
3. The real Chinese/runtime gap was elsewhere:
   - `transcript-shaping` had not yet covered Chinese properly
   - hook shaping and maintenance shaping were still using diverged logic
4. That gap is now materially reduced in code:
   - bilingual shaping cues landed in the shared utility
   - `hook-scaffold` now routes assistant shaping through the shared utility
   - `engine maintain()` now routes transcript maintenance shaping through the shared utility
5. This means the current read is sharper:
   - helper tools / worker policy remain deferred by design
   - bilingual shaping/product-path weakness was real
   - that weakness is now fixed in the current working host copy and validated through focused and dispatcher gates

## Confirmed This Round 37

1. `SNC-M2-03` has now crossed from design into code through a bounded worker-execution adapter scaffold.
2. The landed slice is intentionally narrow and host-aligned:
   - build real `sessions_spawn` launch plans from SNC worker contracts
   - mirror accepted/rejected launch outcomes back into SNC controller state
   - build bounded `sessions_yield` and `subagents` control arguments
   - parse pushed internal completion events back into SNC-local worker results
3. This does not yet mean live worker orchestration is fully wired into the engine/session path.
   - the scaffold exists
   - runtime integration still remains a separate next cut
4. The practical value is that future wiring work now has a real contract layer instead of re-deriving host request/response shapes ad hoc.
5. Validation for the scaffold landed cleanly:
   - targeted worker-policy/worker-execution tests passed
   - workspace typecheck passed with the documented 8 GB heap setting

## Confirmed This Round 38

1. `SNC Milestone 1` is no longer only an internal release candidate.
   - the release-facing README and plugin package were tightened
   - the package artifact was rebuilt
   - the milestone branch was pushed as:
     - `codex/snc-m1-release-candidate`
2. The program has now crossed into explicit `Milestone 2` planning.
3. The next phase is intentionally narrower than the original build-out:
   - controller-issued worker launch
   - worker diagnostics/state hygiene
   - clean-host delivery rehearsal
   - bounded durable-memory controls
   - optional helper-surface pilot only if still justified
4. External-thread work is now also split accordingly:
   - carry-forward precision packets (`25-28`)
   - new milestone-2 packets (`29-32`)
5. This means the project is no longer blocked on broad research.
   - research now exists to sharpen specific engineering cuts and future specialization-kernel doctrine

## Confirmed This Round 39

1. The first `Milestone 2` external-thread acceptance wave is now closed.
2. OpenClaw now has accepted precision packets for:
   - exact runner lifecycle timing
   - plugin-sdk / slot stability tiers
3. CC now has accepted precision packets for:
   - pressure / compaction lifecycle order
   - memory lifecycle contract boundaries
4. These packets materially reduce implementation ambiguity rather than only increasing repo coverage:
   - worker-launch and compaction-aware SNC work now rest on sharper host timing
   - future donor imports for pressure/memory now rest on exact lifecycle contracts
5. The remaining open external-thread work is now genuinely narrower:
   - worker invocation seams
   - delivery/marketplace rehearsal
   - delegation ownership/addressed queue exactness
   - milestone-2 product envelope

## Confirmed This Round 40

1. `Milestone 2` has now landed its first runtime compatibility cut for mixed-use assistant sessions.
2. SNC still keeps its writing-specialized upside, but it no longer has to frame every enabled session as writing work.
3. The new hard boundary is:
   - `specializationMode: "auto"` by default
   - neutral continuity framing when no writing artifacts are configured
   - explicit `writing` or `general` override when the operator wants stronger control
4. Prompt-visible state labels are now continuity-oriented rather than fiction-only:
   - `Continuity ledger`
   - `Active state`
5. This matters because future worker, helper-surface, and durable-memory work now has a stable non-writing-safe baseline to build on rather than a writing-only assumption.

## Confirmed This Round 41

1. The second `Milestone 2` external-thread acceptance wave is now closed.
2. OpenClaw now has accepted precision packets for:
   - worker invocation seams
   - clean delivery / marketplace / install lanes
3. CC now has an accepted precision packet for:
   - delegation ownership, addressed routing, and stop-surface separation
4. `Milestone 2` now has an accepted product envelope:
   - one ordinary plugin
   - continuity-first default face
   - `stateDir` as the recommended persistence profile boundary
   - hooks/helper tools still opt-in
5. The next external research frontier is now narrower again:
   - completion-delivery exactness
   - clean-host enable/restart reality
   - remote/follow-up delegation donor precision
   - operator-profile synthesis for `Milestone 2`

## Confirmed This Round 42

1. The phase-8 durable-memory/operator external-thread wave is now closed.
2. OpenClaw now has accepted precision packets for:
   - plugin diagnostics / doctor / config-validate reality
   - gateway launch / working-directory reality
3. CC now has an accepted precision packet for:
   - SessionMemory / extractMemories skip/failure/control behavior
4. `Milestone 2` now also has an accepted durable-memory operator envelope:
   - bounded host diagnostics
   - bounded file/path guidance
   - bounded durable-memory promises
5. The next external research frontier is now narrower again:
   - worker launch failure / rejection truth
   - worker follow-up / yield / control transitions
   - worker failure / partial-result donor behavior
   - worker operator-envelope synthesis

## In Progress Main Lines

- A: single-session state continuity
- B: cross-session memory
- C: context hygiene / token pressure
- E: OpenClaw insertion seams
- F: dispatcher-led multi-thread operating model
- G: OpenClaw full deconstruction program

## Not Started Yet

- D: output density / anti-mechanical mechanisms
- exact call-chain reconstruction for compaction, pruning, hooks, memory recall
- evidence-backed mapping from writing pain points to concrete code mechanisms
- feature-gate/default-state reading that determines which CC memory presentation mode is actually dominant

## Top 3 Current Conclusions

1. The memo is usable, but OpenClaw `v2026.4.1` is not a literal path match for every item in the memo, so further research must follow the current code layout rather than the memo's older path names.
2. CC is no longer just the cleaner cold-start target; it now provides the clearest concrete pattern for separating "current-session state", "durable project memory", "memory presentation mode", and broader host-level harness control.
3. OpenClaw centralizes the "what the model actually sees" path inside the embedded runner attempt flow, and the latest seam read now makes one direction much stronger: SNC should keep defaulting toward plugin/context-engine delivery before considering host-internal rewrites; a slot-bearing SNC core plugin with auxiliary hook behavior now looks like the leading architecture.

## Top 3 Dangerous Unknowns

1. Whether the user's "OpenClaw 4.1" intended tag is exactly `v2026.4.1`, or an older semver-style internal milestone.
2. Whether timeout-triggered compaction later receives an equivalent maintenance pass through another path.
   - narrowed: a later `turn` maintenance path exists
   - still dangerous: it is conditional and not equivalent to immediate compaction maintenance
3. Whether non-default plugins already provide a richer state-anchor or memory-injection path than the default memory-core flow.

## Current Architecture Read

1. SNC v1 is no longer pointing toward "just a smarter memory plugin."
2. The stronger current read is:
   - SNC core plugin owns the `contextEngine` slot
   - SNC uses ordinary lifecycle hooks for sidecars, harvesting, and guardrails
   - OpenClaw internals stay untouched unless later evidence shows the host order itself is a blocker
3. The main remaining structural question is not whether SNC can stay pluggable.
   - it is how much behavior belongs inside the SNC-owned engine versus helper hooks
4. The delivery model is now also explicit:
   - dispatcher thread owns planning, scheduling, acceptance, and repo control
   - workers own bounded packets only
5. The dispatcher model has now been validated in a complete cycle with accepted research packets, accepted support tooling, and accepted SNC code scaffolding.
6. Cycle 2 has now started producing accepted subsystem-grade outputs as well, not just raw worker notes.
7. The first accepted cycle-2 packets materially strengthen both sides of the bridge:
   - OpenClaw session/channel/gateway identity now has a host-safe modification map
   - CC pressure-control now has a donor-grade migration memo
8. OpenClaw capability domains now also have a clearer SNC read:
   - most are compatibility surfaces, not continuity donors
   - `web-search` is the main future donor candidate inside this packet
9. Cycle 2 is now fully closed with accepted outputs on both sides of the bridge:
   - OpenClaw session/gateway fabric
   - OpenClaw capability stack
   - CC orchestration donor packet
   - CC pressure-control donor packet
   - OpenClaw x CC migration matrix
10. External-thread collaboration is now operationalized as a numbered claim catalog rather than only an internal dispatcher idea.
11. The dispatcher has now reserved a small bounded implementation cycle of its own so external threads can stay focused on the larger repo-deconstruction packets.
12. That bounded implementation cycle is now also closed and validated, so the dispatcher has moved from packet design to packet completion on the SNC utility/tooling layer.
13. Hook shaping is now no longer only a migration recommendation or design memo.
   - it is a landed bounded behavior in the working host copy
14. The current SNC near-term frontier is now split in two:
   - memory/durable-recall evidence gathering across OpenClaw and CC
   - selective convergence of duplicated shaping logic if the maintenance cost justifies it
15. The durable-memory side of that frontier is now materially less ambiguous because both the OpenClaw host substrate and the CC presentation/gating model have accepted deconstruction packets.
16. The tool-shaping side of that frontier is now also materially less ambiguous because OpenClaw's tool fabric has an accepted packet that separates registration, execution, policy, and persistence.
17. The durable-memory side of the frontier has now crossed from "evidence gathering" into "accepted v1 design."
18. The next frontier is now no longer "find the missing packet."
   - it is "turn accepted design into bounded utilities and accepted deconstruction into reusable architecture doctrine."
19. The first Phase-3 utility wave has now crossed that frontier successfully:
   - bounded utilities and architecture doctrine are now both accepted artifacts, not only intentions.
20. The architecture horizon is now explicit enough that future implementation work can be judged against two bars at once:
   - "does this help SNC ship?"
   - "does this keep the specialization kernel reusable for later Claws?"
21. The current development frontier is now integration-first rather than discovery-first.
   - durable memory has crossed into the live runtime path
   - helper-tool registration is deferred by decision
   - worker-policy host wiring is now clear enough to become a later engineering cut
22. Durable-memory work has now entered the hardening phase rather than the "first integration" phase.

## Current Breadth Read

1. OpenClaw should now be treated as a host platform, not just a runner plus plugins.
2. CC should now be treated as a product shell around a strong query/memory runtime, not just a single loop with memory.
3. That means future whole-repo work can be distributed by domain:
   - runtime core
   - memory/state
   - plugin/integration fabric
   - UI/product shell
   - ops/policy/governance
4. The repo study is now ready for stronger-model parallelization without losing structure.
5. SNC research is now moving with a real plugin baseline in hand, not just a target architecture.
6. That baseline has now been locally revalidated in a host workspace.
7. The project now has a real execution bridge from research into implementation planning.
8. It also now has a growing deconstruction-grade map of where SNC should consume host identity versus where it can safely wrap or extend behavior.
9. That map now covers not just runtime/plugin/config domains, but also session/gateway fabric and the broader capability stack.
10. The project now has an accepted migration frontier, not just a research frontier.
13. Parallelization is now split into two layers:
   - dispatcher-managed subagents
   - externally claimable numbered work packets for other main threads
14. A new numbered packet wave is now live specifically for:
   - `SNC Milestone 1` utility landing
   - OpenClaw modification doctrine
   - CC harness codification
   - future custom-Claw architecture planning
15. That packet wave is now almost fully closed:
   - `18`, `19`, `20`, `21`, `22`, and `23` are accepted
   - `24` remains open
16. The next meaningful open work is now split into two categories:
   - `24` release-envelope and repo-boundary work
   - deeper source excavation packets that serve long-range OpenClaw/harness mastery rather than immediate missing SNC seams
17. Those deeper packets are now explicitly precision packets rather than breadth packets.
   - the goal is exact lifecycle/stability knowledge where engineering value remains high

## Next Round Read Order

1. OpenClaw:
   - narrow the minimal SNC-owned context-engine surface
   - later lifecycle paths around timeout-compacted retries
   - memory flush / session-memory related hooks that could matter for SNC anchoring
   - progressively deepen non-SNC platform domains using the new atlas
2. CC:
   - only revisit ToolSearch / microCompact where it changes landing decisions
   - feature-gate/default-state reading around memory presentation (`MEMORY.md` injection vs relevant-memory attachments)
   - progressively deepen non-SNC product-shell domains using the new atlas
3. SNC:
   - keep the validated `session-state` pass as the new behavioral baseline
   - treat the first minimal safe `maintain()` slice as landed
   - stress-test the bounded host-shape read in `research/32_snc_v1_host_shape.md`
   - use `research/35_snc_plugin_v1_assessment.md` as the practical baseline review
   - use `research/36_snc_next_step_plan.md` as the execution order
   - use `research/37_snc_compaction_v1.md` as the compaction baseline
   - treat `research/66_snc_hook_shaping_integration.md` as the first landed hook-layer shaping slice
   - move next toward durable-memory evidence packets and only do hook/utility convergence where it meaningfully reduces duplication
4. Collaboration:
  - use `research/34_collab_workstreams.md` as the handoff layer for future stronger-model deep dives
  - use `research/53_external_thread_claims.md` as the current external claim surface
  - use `research/76_external_thread_phase3_plan.md` as the current external launch-order note
  - use `research/77_dispatch_cycle_006.md` as the current internal dispatcher cycle
  - use `research/78_openclaw_modification_atlas.md` and `research/79_cc_harness_design_codex.md` as the current architecture doctrine base
  - use `research/80_custom_claw_architecture_program.md` as the current long-range architecture anchor
   - use `research/87_snc_helper_tool_registration_decision.md` and `research/88_snc_worker_policy_host_wiring_v1.md` as the current integration-boundary decisions
   - use `research/89_snc_module_workorders_round2.md` as the current modular development queue
   - use `research/102_snc_milestone2_program.md` as the current milestone-level build doctrine
   - use `research/103_snc_module_workorders_round3.md` as the current modular development queue
   - use `research/94_external_thread_phase4_plan.md` as the current precision-excavation launch note
   - use `research/104_external_thread_phase5_plan.md` as the current milestone-2 external-thread launch note
   - use `research/109_external_thread_phase5_acceptance_round1.md` as the current phase-5 acceptance note
   - use `research/105_oc12_worker_invocation_seam_matrix.md` as the current worker-launch seam packet
   - use `research/106_oc13_plugin_delivery_marketplace_rehearsal.md` as the current delivery-lane packet
   - use `research/107_cc12_delegation_ownership_queue_matrix.md` as the current delegation-control donor packet
   - use `research/108_snc_milestone2_product_envelope.md` as the current milestone-2 product-boundary packet
   - use `research/111_external_thread_phase5_acceptance_round2.md` as the current phase-5 closing acceptance note
   - use `research/112_external_thread_phase6_plan.md` as the current phase-6 external-thread launch note
   - use `research/110_snc_general_assistant_compatibility_v1.md` as the current mixed-use compatibility note
   - use `research/95_snc_durable_memory_hardening.md` as the current durable-memory quality note
   - use `research/133_external_thread_phase8_acceptance_round1.md` as the current phase-8 closing acceptance note
   - use `research/134_external_thread_phase9_plan.md` as the current phase-9 external-thread launch note
   - use `research/140_external_thread_phase9_acceptance_round1.md` as the current phase-9 acceptance note
   - use `research/147_external_thread_phase10_acceptance_round1.md` as the current phase-10 acceptance note
   - use `research/148_external_thread_phase11_plan.md` as the current phase-11 external-thread launch note
   - use `research/146_snc_worker_launch_result_host_wiring_v1.md` as the current live worker-runtime integration note
   - use `research/100_snc_worker_lifecycle_bookkeeping_v1.md` as the current worker-lifecycle hardening note
   - use `research/101_snc_milestone1_release_candidate.md` as the current milestone release-candidate note
   - use `research/139_snc_controller_launch_replay_governance_v1.md` as the current controller launch replay-governance note

## Anti-Rabbit-Hole Check

- No obvious rabbit hole yet.
- The main risk is over-following old memo paths that no longer exist in OpenClaw `v2026.4.1`.
- Mitigation: treat the memo as a question list, not as ground truth for current filesystem layout.

## Long-Range Route

- Roadmap document: `research/03_research_roadmap.md`
- OpenClaw call-chain working file: `research/10_callchains_openclaw.md`
- CC call-chain working file: `research/11_callchains_cc.md`
- OpenClaw breadth atlas: `research/12_domain_atlas_openclaw.md`
- CC breadth atlas: `research/13_domain_atlas_cc.md`
- CC harness packet: `research/30_harness_patterns_cc.md`
- Harness-to-host bridge: `research/31_harness_to_openclaw_mapping.md`
- Bounded host-shape read: `research/32_snc_v1_host_shape.md`
- Collaboration packet layer: `research/34_collab_workstreams.md`
- Incoming plugin baseline assessment: `research/35_snc_plugin_v1_assessment.md`
- Execution bridge: `research/36_snc_next_step_plan.md`
- Compaction v1 note: `research/37_snc_compaction_v1.md`
- Dispatcher model: `research/38_codex_dispatcher_model.md`
- OpenClaw deconstruction program: `research/39_openclaw_deconstruction_program.md`
- Parallel execution board: `research/40_parallel_execution_board.md`
- Dispatcher cycle 1 packet: `research/41_dispatch_cycle_001.md`
- OC-02 deconstruction: `research/42_oc02_plugin_host_deconstruction.md`
- OC-05 deconstruction: `research/43_oc05_config_security_ops_deconstruction.md`
- OC-01 deconstruction: `research/44_oc01_runtime_core_deconstruction.md`
- SNC hook scaffold note: `research/45_snc_hook_scaffold_v1.md`
- SNC hook scaffold note: `research/41_snc_hook_scaffold.md`
- Dispatcher validation helper: `research/41_dispatcher_validation_helper.md`
- Dispatch cycle 001: `research/41_dispatch_cycle_001.md`
- Dispatch cycle 002: `research/46_dispatch_cycle_002.md`
- OC-03 deconstruction: `research/47_oc03_session_channel_gateway_deconstruction.md`
- OC-04 deconstruction: `research/48_oc04_capability_stack_deconstruction.md`
- CC-01 donor memo: `research/49_cc01_agent_orchestration_donor.md`
- CC-02 donor memo: `research/51_cc02_harness_pressure_tool_exposure.md`
- Migration matrix: `research/52_openclaw_cc_migration_matrix.md`
- External-thread claim catalog: `research/53_external_thread_claims.md`
- External-thread phase 3 plan: `research/76_external_thread_phase3_plan.md`
- Dispatch cycle 006: `research/77_dispatch_cycle_006.md`
- OpenClaw modification atlas: `research/78_openclaw_modification_atlas.md`
- CC harness design codex: `research/79_cc_harness_design_codex.md`
- Custom Claw architecture program: `research/80_custom_claw_architecture_program.md`
- Dispatch cycle 003: `research/69_dispatch_cycle_003.md`
- SNC transcript shaping utility: `research/64_snc_transcript_shaping_utility.md`
- SNC replacement ledger utility: `research/65_snc_replacement_ledger_utility.md`
- SNC acceptance matrix v2: `research/68_snc_acceptance_matrix.md`
- SNC hook shaping spec: `research/70_snc_hook_shaping_spec.md`
- SNC durable-memory utility: `research/81_snc_durable_memory_core_utility.md`
- SNC helper-tools utility: `research/82_snc_helper_tools_utility.md`
- SNC multi-worker policy utility: `research/83_snc_multiworker_policy_utility.md`
- SNC durable-memory integration v1: `research/86_snc_durable_memory_integration_v1.md`
- SNC helper-tool registration decision: `research/87_snc_helper_tool_registration_decision.md`
- SNC worker-policy host wiring v1: `research/88_snc_worker_policy_host_wiring_v1.md`
- SNC module workorders round 2: `research/89_snc_module_workorders_round2.md`
- SNC milestone 2 program: `research/102_snc_milestone2_program.md`
- SNC module workorders round 3: `research/103_snc_module_workorders_round3.md`
- External-thread phase 4 plan: `research/94_external_thread_phase4_plan.md`
- External-thread phase 5 plan: `research/104_external_thread_phase5_plan.md`
- External-thread phase 9 acceptance round 1: `research/140_external_thread_phase9_acceptance_round1.md`
- External-thread phase 10 plan: `research/141_external_thread_phase10_plan.md`
- External-thread phase 10 acceptance round 1: `research/147_external_thread_phase10_acceptance_round1.md`
- External-thread phase 11 plan: `research/148_external_thread_phase11_plan.md`
- External-thread phase 5 acceptance round 1: `research/109_external_thread_phase5_acceptance_round1.md`
- SNC general-assistant compatibility v1: `research/110_snc_general_assistant_compatibility_v1.md`
- SNC durable-memory hardening: `research/95_snc_durable_memory_hardening.md`
- SNC bilingual shaping audit: `research/96_snc_bilingual_shaping_audit.md`
- SNC worker execution adapter scaffold: `research/97_snc_worker_execution_adapter_scaffold.md`
- SNC worker runtime wiring v1: `research/98_snc_worker_runtime_wiring_v1.md`
- SNC worker lifecycle bookkeeping v1: `research/100_snc_worker_lifecycle_bookkeeping_v1.md`
- SNC milestone 1 release candidate: `research/101_snc_milestone1_release_candidate.md`
- SNC controller launch replay governance v1: `research/139_snc_controller_launch_replay_governance_v1.md`
- OC-22 worker follow-up / reply-visibility matrix: `research/142_oc22_worker_followup_reply_visibility_matrix.md`
- OC-23 ambiguous worker launch recovery matrix: `research/143_oc23_ambiguous_worker_launch_recovery_matrix.md`
- CC-17 worker resume sanitization matrix: `research/144_cc17_worker_resume_sanitization_matrix.md`
- SYN-11 SNC worker follow-up / resume envelope: `research/145_syn11_snc_worker_followup_resume_envelope.md`
- SNC worker launch result host wiring v1: `research/146_snc_worker_launch_result_host_wiring_v1.md`
- OC-20 worker launch failure / rejection matrix: `research/135_oc20_worker_launch_failure_rejection_matrix.md`
- OC-21 worker follow-up / control transition matrix: `research/136_oc21_worker_followup_control_transition_matrix.md`
- CC-16 delegation failure / partial-result salvage matrix: `research/137_cc16_delegation_failure_partial_result_matrix.md`
- SYN-10 SNC worker operator envelope: `research/138_syn10_snc_worker_operator_envelope.md`
- OC-10 runner lifecycle timing matrix: `research/90_oc10_runner_lifecycle_timing_matrix.md`
- OC-11 plugin SDK / slot stability atlas: `research/91_oc11_plugin_sdk_slot_stability_atlas.md`
- CC-10 pressure / compaction lifecycle matrix: `research/92_cc10_pressure_compaction_lifecycle_matrix.md`
- CC-11 memory lifecycle contract matrix: `research/93_cc11_memory_lifecycle_contract_matrix.md`
