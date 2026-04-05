# CC-09 Harness Design Codex

## Purpose

This file closes packet `CC-09` from `research/53_external_thread_claims.md` and `research/77_dispatch_cycle_006.md`.

Its job is not to restate the whole CC architecture.
Its job is to turn the accepted CC packets into a durable donor handbook for:

- SNC
- later specialized Claw products built on OpenClaw

This codex only uses:

- accepted CC packets
- direct reads from the frozen CC snapshot at `data/external/claude-code-leeyeel-4b9d30f`

Accepted packet basis:

- `research/30_harness_patterns_cc.md`
- `research/49_cc01_agent_orchestration_donor.md`
- `research/51_cc02_harness_pressure_tool_exposure.md`
- `research/58_cc03_command_product_shell.md`
- `research/59_cc04_remote_service_layer.md`
- `research/60_cc05_governance_settings_policy.md`
- `research/61_cc06_memory_mode_feature_matrix.md`
- `research/62_cc07_secondary_intelligence_layers.md`
- `research/63_cc08_task_subagent_infra.md`

Direct code checks used for synthesis:

- `src/QueryEngine.ts`
- `src/query.ts`
- `src/utils/toolResultStorage.ts`
- `src/utils/task/framework.ts`
- `src/tasks/LocalMainSessionTask.ts`
- `src/context.ts`
- `src/constants/prompts.ts`
- `src/memdir/memdir.ts`
- `src/services/SessionMemory/sessionMemory.ts`
- `src/services/compact/autoCompact.ts`
- `src/services/compact/sessionMemoryCompact.ts`
- `src/types/command.ts`
- `src/commands.ts`
- `src/entrypoints/cli.tsx`
- `src/services/api/sessionIngress.ts`
- `src/remote/remotePermissionBridge.ts`
- `src/utils/settings/settings.ts`
- `src/utils/settings/pluginOnlyPolicy.ts`
- `src/utils/privacyLevel.ts`
- `src/query/stopHooks.ts`
- `src/services/PromptSuggestion/promptSuggestion.ts`
- `src/services/AgentSummary/agentSummary.ts`
- `src/tools/ToolSearchTool/ToolSearchTool.ts`
- `src/utils/toolSearch.ts`

## 1. Harness Principle Catalog

### 1. Persistent conversation owner plus separate turn loop

CC keeps a persistent conversation owner and a separate iterative turn executor.
`QueryEngine` owns per-conversation state across turns, while `query.ts` owns the re-entrant loop that handles model calls, tool execution, recovery, and continuation.

Evidence:

- packet: `research/49_cc01_agent_orchestration_donor.md`
- code: `src/QueryEngine.ts:180-182`, `src/QueryEngine.ts:209`, `src/QueryEngine.ts:675`, `src/query.ts:248-303`

Why it matters:

- session truth does not have to be rebuilt every turn
- later subagents, resume paths, and sidecars have a stable owner to attach to

### 2. Explicit worker identity and addressed queue ownership

CC does not treat all work as one anonymous loop.
`querySource` and `agentId` decide which queue items a loop may consume, which hooks fire, and which side work is allowed.

Evidence:

- packets: `research/49_cc01_agent_orchestration_donor.md`, `research/63_cc08_task_subagent_infra.md`
- code: `src/query.ts:342`, `src/query.ts:373-386`, `src/query.ts:1560-1577`, `src/query.ts:1683-1687`

Why it matters:

- main-thread prompts do not leak into subagents
- background work can share infrastructure without sharing prompt ownership

### 3. Background task state and transcript isolation are first-class runtime boundaries

CC treats background tasks as durable runtime objects, not UI decorations.
The task framework preserves UI-held state on re-register, gates terminal eviction, and routes explicit task notifications.
`LocalMainSessionTask` writes to an isolated sidechain transcript so a backgrounded main session survives `/clear` and other foreground changes.

Evidence:

- packet: `research/63_cc08_task_subagent_infra.md`
- code: `src/utils/task/framework.ts:77-95`, `src/utils/task/framework.ts:125-138`, `src/utils/task/framework.ts:289`, `src/tasks/LocalMainSessionTask.ts:102-114`, `src/tasks/LocalMainSessionTask.ts:357-416`

Why it matters:

- auxiliary work can stay durable without corrupting the main session
- worker state survives resume/background transitions cleanly

### 4. Context pressure is handled as a staged control ladder

CC does not jump straight from large context to full summarization.
The loop spends cheaper and more deterministic reductions first:

1. aggregate tool-result budget
2. snip
3. microcompact
4. context collapse
5. autocompact

Evidence:

- packets: `research/30_harness_patterns_cc.md`, `research/51_cc02_harness_pressure_tool_exposure.md`
- code: `src/query.ts:369-468`

Why it matters:

- cheaper hygiene preserves more structure
- summarization is treated as the last expensive recovery step, not the first

### 5. Deterministic shaping decisions must freeze across turns

CC's tool-result shaping is not just truncation.
`ContentReplacementState` records what has been seen and what has been replaced, then re-applies the exact same replacement text later and reconstructs that state on resume or fork.

Evidence:

- packets: `research/30_harness_patterns_cc.md`, `research/51_cc02_harness_pressure_tool_exposure.md`
- code: `src/utils/toolResultStorage.ts:369-445`, `src/utils/toolResultStorage.ts:769-933`, `src/utils/toolResultStorage.ts:960-1010`

Why it matters:

- prompt-visible shaping stays byte-stable
- resume, fork, and repeated pressure passes do not drift unpredictably

### 6. Local truth and model-visible projection are separate planes

CC sometimes changes what is sent to the model without mutating local truth in the same way.
That is visible in aggregate tool-result replacement, collapsed-context projection, and task/transcript separation.

Evidence:

- packets: `research/30_harness_patterns_cc.md`, `research/51_cc02_harness_pressure_tool_exposure.md`
- code: `src/utils/toolResultStorage.ts:695-703`, `src/utils/toolResultStorage.ts:924-933`, `src/query.ts:428-441`

Why it matters:

- the host can preserve richer internal state for persistence and diagnostics
- the model can still see a smaller, policy-shaped working context

### 7. Maintenance should run as side work at safe windows

CC repeatedly schedules maintenance as background or stop-hook work rather than inlining it into the main answer path.
Relevant-memory prefetch starts once per turn and is consumed only if ready.
Session memory registers a post-sampling hook.
Prompt suggestion and durable-memory extraction are launched from stop-hook windows.

Evidence:

- packets: `research/49_cc01_agent_orchestration_donor.md`, `research/30_harness_patterns_cc.md`, `research/61_cc06_memory_mode_feature_matrix.md`, `research/62_cc07_secondary_intelligence_layers.md`
- code: `src/query.ts:301-303`, `src/services/SessionMemory/sessionMemory.ts:267-374`, `src/query/stopHooks.ts:139-149`, `src/services/PromptSuggestion/promptSuggestion.ts:319-330`

Why it matters:

- slow upkeep does not pollute the main turn
- safe trigger windows make sidecars easier to reason about and abort

### 8. Reuse maintained artifacts before asking for a new summary

CC prefers maintained session artifacts over fresh summarization when compaction fires.
`autoCompact` tries session-memory compaction first, waits for any in-flight extraction, then reuses the maintained session-memory artifact as the compaction summary.

Evidence:

- packets: `research/30_harness_patterns_cc.md`, `research/51_cc02_harness_pressure_tool_exposure.md`
- code: `src/services/compact/autoCompact.ts:287-349`, `src/services/compact/sessionMemoryCompact.ts:526-620`, `src/services/SessionMemory/sessionMemory.ts:343-347`

Why it matters:

- continuity artifacts become first-class runtime assets
- compaction does not have to reconstruct state from scratch under pressure

### 9. Automatic recovery needs continuity accounting and failure ceilings

CC does not treat compaction as "try forever."
It carries task budget state across compaction boundaries and uses consecutive-failure tracking as a circuit breaker for autocompact.

Evidence:

- packets: `research/49_cc01_agent_orchestration_donor.md`, `research/30_harness_patterns_cc.md`, `research/51_cc02_harness_pressure_tool_exposure.md`
- code: `src/query.ts:291`, `src/query.ts:511-513`, `src/query.ts:702-703`, `src/services/compact/autoCompact.ts:56-70`, `src/services/compact/autoCompact.ts:257-349`

Why it matters:

- compaction should not reset the economics of a long-running task
- doomed automatic recovery should stop consuming turns and API calls

### 10. Memory presentation is a mode architecture, not one blob

CC separates:

- baseline prompt injection
- memory-mechanics prompt guidance
- relevant-memory attachment recall
- extraction as a background writer

This is controlled by explicit gates rather than being one undifferentiated memory system.

Evidence:

- packet: `research/61_cc06_memory_mode_feature_matrix.md`
- code: `src/context.ts:162-172`, `src/constants/prompts.ts:476-495`, `src/memdir/memdir.ts:419-470`, `src/QueryEngine.ts:316-318`, `src/query/stopHooks.ts:149-151`

Why it matters:

- stable continuity, selective recall, and write-side harvesting can evolve independently
- memory policy becomes a runtime mode choice, not prompt sprawl

### 11. Capability supply and behavior modes are harness controls too

CC treats some behavior changes as mode switches, not as tiny prompt edits.
ToolSearch defers tool exposure until needed and returns `tool_reference` blocks instead of dumping every schema inline.
Command execution types and availability filtering also show that shell capability supply is actively managed.

Evidence:

- packets: `research/51_cc02_harness_pressure_tool_exposure.md`, `research/58_cc03_command_product_shell.md`
- code: `src/tools/ToolSearchTool/ToolSearchTool.ts:26`, `src/tools/ToolSearchTool/ToolSearchTool.ts:358-468`, `src/utils/toolSearch.ts:2-6`, `src/utils/toolSearch.ts:157-177`, `src/utils/toolSearch.ts:368-421`, `src/types/command.ts:26`, `src/types/command.ts:75`, `src/types/command.ts:145`, `src/commands.ts:409-485`, `src/commands.ts:619-685`

Why it matters:

- the model does not need the full callable surface on every turn
- large behavior changes are easier to manage when they are named modes with explicit gates

## 2. Runtime Harness vs Shell vs Service vs Governance vs Secondary Intelligence

| Plane | What belongs here | Representative CC evidence | Donor rule |
| --- | --- | --- | --- |
| Runtime harness | Turn ownership, worker identity, task isolation, pressure control, transcript shaping, memory presentation, compaction policy | `src/QueryEngine.ts`, `src/query.ts`, `src/utils/toolResultStorage.ts`, `src/utils/task/framework.ts`, `src/services/SessionMemory/sessionMemory.ts`, `src/services/compact/sessionMemoryCompact.ts`, `src/context.ts`, `src/memdir/memdir.ts` | Primary donor lane. These are the strongest reusable ideas for SNC and future Claws. |
| Shell / product feel | CLI routing, command registry, command execution types, REPL-facing panes, remote-safe command filtering, operator affordances | `src/types/command.ts`, `src/commands.ts`, `src/entrypoints/cli.tsx`, accepted packet `research/58_cc03_command_product_shell.md` | Borrow when building product completeness, not when defining the runtime spine. |
| Service architecture | Remote-control entrypoints, daemon/runner modes, transcript append reliability, remote permission bridging, provider adapters | `src/entrypoints/cli.tsx`, `src/services/api/sessionIngress.ts`, `src/remote/remotePermissionBridge.ts`, accepted packet `research/59_cc04_remote_service_layer.md` | Borrow adapter patterns only. Do not import Anthropic service contracts literally. |
| Governance / policy | Settings precedence, managed policy, privacy suppression, permission rules, plugin-only restrictions | `src/utils/settings/settings.ts`, `src/utils/settings/pluginOnlyPolicy.ts`, `src/utils/privacyLevel.ts`, accepted packet `research/60_cc05_governance_settings_policy.md` | Borrow trust boundaries and restriction patterns, not enterprise delivery UX or vendor policy plumbing. |
| Secondary intelligence | Prompt suggestions, summaries, tips, analytics, MagicDocs-style helpers | `src/query/stopHooks.ts`, `src/services/PromptSuggestion/promptSuggestion.ts`, `src/services/AgentSummary/agentSummary.ts`, accepted packet `research/62_cc07_secondary_intelligence_layers.md` | Keep these optional and best-effort. They improve feel, not the core harness contract. |

Separation rule:

- if a mechanism changes what the model sees, when maintenance runs, or how recovery behaves under pressure, it is harness
- if it mainly improves operator UX, remote packaging, org control, or product feel, it is not the runtime harness even if it looks "smart"

## 3. Transferability Grades

### Borrow Now

- Persistent session owner plus separate turn loop. This is the cleanest reusable runtime shape in the donor set.
- Explicit worker identity, addressed queue ownership, and isolated background transcripts. Future SNC worker flows need these boundaries even if they stay minimal at first.
- Staged pressure policy. Carry the ordering discipline now, even if SNC only implements a reduced ladder at first.
- Deterministic tool-result shaping with frozen decisions across turns. This is the highest-signal donor for transcript stability.
- Local-truth vs model-visible projection, provided the projection is explicit and reconstructible.
- Safe-window sidecars and deferred prefetch. Strong fit for durable memory, helper workers, and future research sidecars.
- Maintained-artifact-first compaction. SNC already has session-state artifacts, so this donor maps immediately.
- Circuit breakers and failure ceilings around automatic maintenance. This is generic host hygiene and should travel early.
- Memory mode separation: baseline continuity, targeted recall, and best-effort extraction should remain distinct.

### Borrow Later

- Full ToolSearch-style deferred capability plane. Valuable only once a specialized Claw has a large helper-tool or MCP surface.
- Budget continuity across compaction. Important once a product exposes explicit task budgets or other long-running worker economics.
- The full task-framework polish around retain, eviction grace, and notification dedupe. Strong donor, but it matters most once background work becomes user-visible.
- Remote transcript durability and explicit permission-bridge adapters. Good patterns if a future product grows a real service plane.
- Shell command typing, availability filtering, and dynamic command merging. Useful for a mature operator shell, not for SNC's current core.

### Do Not Borrow Literally

- Cached microcompact and other provider-coupled API context-edit behavior.
- CC's exact ToolSearch exception matrix, unsupported-model lists, beta transport assumptions, and feature-flag names.
- The broad CC command tree, onboarding flows, remote setup, buddy/coordinator UX, and other product-shell breadth.
- Anthropic-specific API clients, bootstrap/quota/privacy/product APIs, and remote-control/session service contracts.
- Managed-settings UX, GrowthBook/analytics vendors, and exact enterprise policy delivery plumbing.
- MagicDocs-style file-owning automation or any product-feel sidecar treated as correctness-critical runtime behavior.

## 4. SNC Relevance

This codex strengthens the current SNC direction rather than changing it.
The best CC imports for SNC still live in harness policy, not in shell parity or service replication.

Immediate SNC fit:

- deterministic tool-result shaping and stable replacement decisions
- staged pressure handling where SNC acts before delegated host compaction
- session-artifact-first compaction guidance using SNC-owned state
- durable-memory design that separates baseline projection, selective recall, and background harvesting
- explicit worker identity and queue policy for later multi-worker growth

Low-fit SNC imports right now:

- ToolSearch-style deferred capability infrastructure
- remote/service plane features
- enterprise governance stack parity
- secondary-intelligence polish such as suggestions, tips, and progress summaries

Practical SNC rule:

- use CC mainly as a harness donor inside the accepted OpenClaw seams
- do not treat CC shell breadth, service depth, or policy surface as evidence that SNC should take host ownership

## 5. Modification Guidance For Future Donor Use

1. Classify the donor before copying it.
   Decide whether the candidate is harness, shell, service, governance, or secondary intelligence. Only harness ideas should move directly into a product's runtime spine.
2. Port principles before implementations.
   Recreate the ordering, invariants, and ownership boundaries first. Copying CC code literally is usually the wrong move once provider, shell, or host assumptions differ.
3. Keep model-visible projection explicit.
   If a future Claw shapes transcripts, tool results, or memory attachments, store stable decisions and make resume/fork/compaction reconstruction possible.
4. Schedule sidecars instead of inlining them.
   Maintenance, extraction, suggestions, summaries, and research fetches should run at clear lifecycle windows, remain abortable, and fail without poisoning the main turn.
5. Reuse maintained artifacts before re-summarizing.
   Session state, durable memory projections, worker notes, and other maintained artifacts should feed compaction and resume paths before new summary generation is attempted.
6. Express major behavior changes as explicit modes.
   Memory presentation, capability deferral, restricted environments, and similar cross-cutting changes should be named runtime modes with clear defaults and gates.
7. Import service and governance patterns only as adapters.
   Sequential append, permission bridging, trust-tier exclusions, and privacy suppression are good donor ideas. Vendor endpoints, enterprise UX, and policy transport are not.
8. Keep secondary intelligence optional.
   Suggestions, tips, summaries, and similar layers can improve product feel, but they should stay outside correctness-critical turn execution.

Bottom line:

- CC's strongest reusable value is harness discipline
- the surrounding shell, service, governance, and product-feel layers matter mainly because they must stay separated from that harness discipline
