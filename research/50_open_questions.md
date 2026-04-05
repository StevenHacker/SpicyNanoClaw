# Open Questions - After Round 1

## 1. Does the user's "OpenClaw 4.1" definitely mean tag `v2026.4.1`?

- Missing evidence:
  - a project note, release note, or internal naming convention that maps "4.1" to `v2026.4.1`
- Files / sources to read:
  - `data/external/openclaw-v2026.4.1/CHANGELOG.md`
  - `data/external/openclaw-v2026.4.1/README.md`
  - tag / release metadata from upstream
- Why no design decision yet:
  - if this mapping is wrong, all later seam analysis could be version-shifted

## 2. Where did OpenClaw move the memo's old `context-pruning` and `compaction-safeguard` logic?

- Missing evidence:
  - exact call chain from runner loop to pruning / safeguard hooks
- Files / sources to read:
  - `src/agents/pi-embedded-runner/compact.ts`
  - `src/agents/pi-embedded-runner/compaction-hooks.ts`
  - `src/agents/pi-embedded-runner/compaction-runtime-context.ts`
  - `src/agents/pi-embedded-runner/run/compaction-timeout.ts`
  - `src/agents/pi-embedded-runner/run/history-image-prune.ts`
- Why no design decision yet:
  - SNC insertion advice is unsafe until the current compaction seam is verified

## 3. What exactly does OpenClaw's `ContextEngine.assemble()` feed into the final model prompt?

- Missing evidence:
  - remaining uncertainty is no longer the contract itself
  - remaining uncertainty is which concrete engine implementation is active by default and what it actually emits
- Files / sources to read:
  - `src/context-engine/legacy.ts`
  - `src/context-engine/registry.ts`
  - context-engine implementation files
- Why no design decision yet:
  - we now know where the seam is, but not yet what the default engine concretely does at runtime

## 4. Does OpenClaw have a real "current state anchor" or only prompt assembly plus memory/tool recall?

- Missing evidence:
  - a confirmed state object or state summary injected every turn
- Files / sources to read:
  - `src/agents/pi-embedded-runner/run/attempt.ts`
  - `src/agents/pi-embedded-runner/system-prompt.ts`
  - `src/context-engine/*`
- Why no design decision yet:
  - the answer changes whether SNC should add a dedicated state layer or adapt an existing one

## 8. Which concrete OpenClaw context-engine implementation is default in `v2026.4.1`, and how does it use `assemble/compact/maintain`?

- Missing evidence:
  - closed for the default path
  - still open for any non-legacy engine shipped by plugins
- Files / sources to read:
  - plugin-provided engine registrations, if any
- Why no design decision yet:
  - default path is now known; plugin-provided alternatives are still unknown

## 9. In overflow / timeout cases, does OpenClaw compaction happen before or after context-engine maintenance, and can they conflict?

- Missing evidence:
  - the visible asymmetry is now confirmed
  - it is also now confirmed that timeout-triggered compaction may later receive ordinary `reason: "turn"` maintenance after a successful retry
  - still open: whether that weaker, delayed path is sufficient for any SNC state layer that depends on immediate post-compaction canonicalization
- Files / sources to read:
  - `src/agents/pi-embedded-runner/run.ts`
  - `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`
- Why no design decision yet:
  - SNC state summarization could easily fight runtime compaction if different trigger branches have different post-compact lifecycles
  - we now know timeout recovery can later hit turn-maintenance, but not in the same immediate lifecycle stage as overflow

## 10. Where does OpenClaw default memory recall actually enter the active run?

- Missing evidence:
  - the prompt/tool/runtime path is now closed for the default memory-core flow
  - still open: whether any non-default plugin injects richer always-on memory or state into context assembly
- Files / sources to read:
  - non-default memory plugins, if any
  - plugin-provided context engines that may bundle memory/state differently
- Why no design decision yet:
  - default recall path is now known, but the full plugin ecosystem seam is still broader than the default path

## 5. What is the exact boundary between CC `SessionMemory` and `extractMemories`?

- Missing evidence:
  - the architectural split is now mostly closed
  - still open: exact prompt contents and how much quality comes from wording vs control flow
- Files / sources to read:
  - `src/services/SessionMemory/prompts.ts`
  - `src/services/extractMemories/prompts.ts`
  - any direct tests covering these flows
- Why no design decision yet:
  - we now know the boundary structurally, but still need prompt-level quality signals before borrowing behavior verbatim

## 6. How does CC route long-term memory back into the active query?

- Missing evidence:
  - the baseline injection path is now closed
  - still open: which presentation mode is the real dominant one in this snapshot / feature configuration
- Files / sources to read:
  - feature-flag defaults / tests for `tengu_moth_copse`
  - `src/utils/attachments.ts`
  - attachment rendering / system-reminder formatting paths
- Why no design decision yet:
  - SNC may want both a stable state anchor and selective durable recall, but we still need to know which CC presentation mode is central versus transitional

## 7. How much of CC's anti-noise behavior comes from runtime mechanisms versus prompt wording?

- Missing evidence:
  - the first enforcement packet is now closed for microCompact, tool-result budgeting, deferred tools, and ToolSearch
  - still open: which parts of those harness ideas are most compatible with OpenClaw's host shape
- Files / sources to read:
  - `src/query.ts`
  - `src/services/compact/*`
  - `src/tools/ToolSearchTool/*`
  - `src/Tool.ts`
  - then compare against OpenClaw insertion seams
- Why no design decision yet:
  - SNC should borrow hard constraints, not just prompt rhetoric
  - we now have the CC-side harness packet, but not yet the OpenClaw-side attachment plan for each pattern

## 12. Which CC harness ideas are genuinely worth transplanting into SNC, and which are too coupled to CC's own runtime assumptions?

- Missing evidence:
  - the first portability screen is now closed at the architectural level
  - still open: the exact v1 cut line between "must own inside SNC core engine" and "can stay as auxiliary hooks"
- Files / sources to read:
  - `research/30_harness_patterns_cc.md`
  - `research/31_harness_to_openclaw_mapping.md`
  - `research/10_callchains_openclaw.md`
  - OpenClaw hook / plugin / context-engine seam code
- Why no design decision yet:
  - the bridge is now structurally visible
  - the remaining question is packaging and capability ordering, not whether CC still has donor value

## 11. Can SNC ship as one OpenClaw plugin package that claims the `contextEngine` slot while still cooperating cleanly with host memory plugins?

- Missing evidence:
  - the package/manifest/entry contract is now closed
  - it is also now confirmed that a slot-bearing plugin can still expose tools/hooks
  - still open: the most robust activation pattern for a slot-bearing SNC package, and whether one package should own all SNC capabilities or only the state anchor
- Files / sources to read:
  - `src/plugins/slots.ts`
  - `src/plugins/loader.ts`
  - existing multi-capability plugin examples under `extensions/*`
- Why no design decision yet:
  - this directly affects SNC packaging, upgrade safety, and how much host behavior we can preserve without internal rewrites
  - the repo now says "one core plugin is technically plausible", but bundled house style still looks more conservative than a multi-kind all-in-one package

## 13. How much of SNC v1 should live inside a plugin-owned context engine versus separate hook-driven sidecars?

- Missing evidence:
  - the first bounded host-shape read is now written down
  - still open: whether the proposed engine/hook split is the minimum viable shape or still too broad
- Files / sources to read:
  - `research/31_harness_to_openclaw_mapping.md`
  - `research/32_snc_v1_host_shape.md`
  - `src/context-engine/types.ts`
  - `src/plugins/types.ts`
  - any remaining OpenClaw lifecycle paths that constrain engine-owned maintenance
- Why no design decision yet:
  - this is now the central SNC packaging question
  - it determines whether v1 is a focused continuity engine with helper hooks, or a broader host-control plugin

## 14. Can SNC get most of the value of CC's pressure-relief ladder without changing OpenClaw host ordering?

- Missing evidence:
  - current evidence says deterministic transcript shaping and maintained-artifact reuse are easy to port
  - still open: whether earlier light-pressure stages can be layered in cleanly before host compaction starts
- Files / sources to read:
  - `research/31_harness_to_openclaw_mapping.md`
  - `src/agents/pi-embedded-runner/run.ts`
  - `src/agents/pi-embedded-runner/compact.ts`
  - message/tool-result persistence hooks
- Why no design decision yet:
  - this is the main line between "SNC adapts CC policy" and "SNC starts rewriting OpenClaw orchestration"

## 15. Which non-SNC platform domains in OpenClaw are most likely to later constrain SNC packaging or rollout?

- Missing evidence:
  - the first breadth atlas exists
  - still open: which host-platform subsystems outside the embedded runner will actually matter for SNC deployment, settings, security, or remote workflows
- Files / sources to read:
  - `research/12_domain_atlas_openclaw.md`
  - `src/plugins/*`
  - `src/gateway/*`
  - `src/channels/*`
  - `src/config/*`
  - `src/security/*`
- Why no design decision yet:
  - SNC may stay architecturally clean in the runner but still hit packaging or lifecycle constraints elsewhere in the host platform

## 16. Which valuable CC ideas actually live in its broader product shell rather than in the query/memory runtime?

- Missing evidence:
  - the first breadth atlas exists
  - still open: how much of CC's apparent quality comes from command surface, UI shell, governance, or remote/service features instead of core runtime harness
- Files / sources to read:
  - `research/13_domain_atlas_cc.md`
  - `src/commands/*`
  - `src/cli/*`
  - `src/services/*`
  - `src/server/*`
- Why no design decision yet:
  - later borrowing decisions will be cleaner if we separate "runtime donor ideas" from "product shell donor ideas"

## 17. Which future whole-repo workstreams are safest to parallelize without duplicating the settled SNC seam docs?

- Missing evidence:
  - the first collaboration packet layer is now written
  - still open: which packets should be prioritized first when stronger models join
- Files / sources to read:
  - `research/34_collab_workstreams.md`
  - `research/12_domain_atlas_openclaw.md`
  - `research/13_domain_atlas_cc.md`
- Why no design decision yet:
  - the workstream set exists now
  - the remaining question is sequencing and staffing, not whether the split is possible

## 18. What should be the first post-baseline upgrade on top of the incoming SNC plugin?

- Missing evidence:
  - the baseline plugin assessment now exists
  - still open: whether the best next step is extraction-quality work, real `maintain()` logic, or SNC-aware compaction reuse
- Files / sources to read:
  - `research/35_snc_plugin_v1_assessment.md`
  - `data/incoming/snc-codex-transfer/.../overlay/extensions/snc/src/engine.ts`
  - `data/incoming/snc-codex-transfer/.../overlay/extensions/snc/src/session-state.ts`
  - `research/31_harness_to_openclaw_mapping.md`
  - `research/32_snc_v1_host_shape.md`
- Why no design decision yet:
  - we now have a real base
  - the remaining decision is upgrade ordering, not architecture direction
