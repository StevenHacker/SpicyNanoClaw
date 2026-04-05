# SNC-18 Helper-Tool Registration Decision

## 1. Question Definition

This packet decides whether SNC helper tools should enter `SNC Milestone 1` as registered runtime tools, or whether Milestone 1 should stop at the accepted helper-tool utility and defer registration.

The key boundary is that three layers must stay separate:

- internal SNC helper-tool utility
- ordinary plugin-tool registration inside the SNC plugin
- MCP/export of any registered helper tools

Collapsing those layers would blur a distinction that the accepted OpenClaw tool-fabric read already makes explicit: registration, execution, policy, persistence, and MCP exposure are different lanes.

## 2. Evidence Read

- `research/00_overview.md`
  - Phase 3 utility packets are accepted, and the program has moved from broad exploration toward bounded integration and milestone-cutting decisions.
- `research/73_snc_tool_shaping_helper_tools_v1.md`
  - helper tools are only justified in v1 as small read-only projections over SNC-owned artifacts or SNC session-state
  - helper tools are meant to complement hook shaping, not replace it
  - MCP is an optional later export lane, not the reason helper tools exist
- `research/82_snc_helper_tools_utility.md`
  - the accepted helper layer is intentionally projection-only
  - it reads SNC-owned files and persisted session state
  - it does not register tools into the plugin entry
  - it does not touch host tool policy or MCP exposure
- `research/56_oc08_mcp_tool_integration_fabric.md`
  - OpenClaw separates tool registration, execution, policy, tool-result persistence, and MCP exposure
  - registered plugin tools are already part of the runtime capability surface and immediately inherit policy and persistence consequences
  - MCP serving is a second exposure layer over already-registered tools, not the first decision point
- `research/85_dispatch_cycle_007.md`
  - this cycle explicitly asks whether Milestone 1 should register helper tools or keep them internal
- supporting milestone framing from `research/80_custom_claw_architecture_program.md`
  - `helper-tools utility` sits inside Milestone 1's bounded continuity core
  - `helper-tool registration decisions` sit in Milestone 2 controlled integration

## 3. Milestone 1 Recommendation

Milestone 1 should keep the accepted helper-tools utility, but should not register SNC helper tools into the plugin entry yet.

In milestone terms:

- `Milestone 1`: ship the helper-tool utility as internal, tested, plugin-local infrastructure
- `Later`: make a separate registration decision for model-visible helper tools after the controlled integration lane is ready

This is the strongest evidence-backed split:

- `research/82_snc_helper_tools_utility.md` deliberately stops at builder/utility level, so the accepted implementation has not yet claimed runtime tool exposure as part of the milestone surface
- `research/56_oc08_mcp_tool_integration_fabric.md` shows registration is not a neutral refactor; it moves SNC into host tool exposure, execution, policy, and transcript-persistence semantics
- `research/73_snc_tool_shaping_helper_tools_v1.md` treats helper tools as optional bounded projections, not as a mandatory part of the first SNC continuity release
- `research/80_custom_claw_architecture_program.md` already separates `helper-tools utility` from `helper-tool registration decisions`

If helper tools are promoted later, the first promotion step should be ordinary plugin-tool registration of small read-only SNC-owned projection tools. MCP/export should remain a separate later choice.

## 4. What Should Stay Deferred

- plugin-entry registration of `buildSncHelperTools(...)` or any equivalent builder into the default SNC runtime surface
- default model-visible exposure of helper schemas for SNC artifact lookup or session-state projection
- helper-specific `before_tool_call` guardrails or approval flows, because those only become necessary once helper invocation is real
- any helper tool outside the bounded read-only class already accepted in `research/73_snc_tool_shaping_helper_tools_v1.md`, especially durable-memory recall helpers, orchestration helpers, or tools that mutate external systems
- MCP serving/export of SNC helper tools through existing plugin-tool or channel/gateway surfaces
- any gateway or channel method added just to expose SNC helper behavior

## 5. Risks If We Register Too Early

- scope drift: Milestone 1 stops being a bounded continuity core and starts becoming a tool-surface integration milestone
- validation drift: the accepted helper-tool packet proves builder behavior, not end-to-end registered-tool behavior inside the plugin entry, transcript, and approval paths
- transcript-noise regression: registered helper calls would create tool-result messages that then need shaping and persistence handling, which can add clutter before the utility has proven real need
- source-of-truth blur: model-visible helper reads can overlap with prompt assembly, persisted session-state projection, and later durable-memory projection, making SNC's local-truth versus visible-projection boundary less crisp
- export creep: once tools are registered, MCP exposure is mechanically nearby in OpenClaw's fabric, which invites distribution work before runtime value is demonstrated
- host-ownership pressure: early registration makes it easier to drift from read-only SNC projections into policy tweaks, approval changes, or a second capability stack, all of which conflict with the accepted host-owned tool-policy lanes

## 6. SNC Relevance

SNC's accepted near-term value is still continuity: context-engine control, bounded transcript shaping, and plugin-local utility layers that remain hot-pluggable.

Keeping helper tools internal in Milestone 1 preserves that shape:

- SNC keeps the utility layer without widening the default capability surface
- OpenClaw keeps authority over tool policy, dangerous-tool controls, and MCP/export
- a later registration pass can be judged on measured need rather than on the mere existence of a utility

The clean decision is:

- `Milestone 1`: helper-tools utility stays in
- `Milestone 1`: helper-tool registration stays out
- `Later`: if promoted, register only small read-only SNC-owned projection tools first, and treat MCP/export as a separate later decision
