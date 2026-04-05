# CC-06 Memory Presentation Modes / Feature-Gate Matrix

## Purpose

This memo distinguishes the ways CC presents memory to the model and the gates that control each path.

The core question is not "does CC have memory?"
The question is:

- what is always injected as prompt context
- what becomes a runtime attachment
- what runs as background extraction
- what is prompt-only versus runtime-gated

## Evidence Basis

Primary code evidence used for this memo:

- `data/external/claude-code-leeyeel-4b9d30f/src/context.ts:162-186`
- `data/external/claude-code-leeyeel-4b9d30f/src/constants/prompts.ts:466-496`
- `data/external/claude-code-leeyeel-4b9d30f/src/QueryEngine.ts:311-325`
- `data/external/claude-code-leeyeel-4b9d30f/src/memdir/memdir.ts:419-507`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/claudemd.ts:1135-1150`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/attachments.ts:2196-2237`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/attachments.ts:2357-2405`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/messages.ts:3707-3721`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/extractMemories/extractMemories.ts:362-566`
- `data/external/claude-code-leeyeel-4b9d30f/src/query/stopHooks.ts:136-156`
- `data/external/claude-code-leeyeel-4b9d30f/src/cli/print.ts:962-969`

## Memory Presentation Matrix

| Mode | Where it is assembled | Gate state | What the model sees | Classification |
| --- | --- | --- | --- | --- |
| Baseline memory injection | `context.ts` builds `claudeMd` via `getClaudeMds(filterInjectedMemoryFiles(await getMemoryFiles()))` and returns it in user context | Default on, unless `CLAUDE_CODE_DISABLE_CLAUDE_MDS` or `--bare` with no explicit `--add-dir` | Loaded `CLAUDE.md`, `.claude/CLAUDE.md`, `.claude/rules/*.md`, and other memory files in the standard prompt path | Prompt-level baseline injection |
| Memory prompt mechanics | `memdir.ts -> loadMemoryPrompt()` and `constants/prompts.ts` via `systemPromptSection('memory', () => loadMemoryPrompt())` | `isAutoMemoryEnabled()` must be true | Instructions about how to save memories, where `MEMORY.md` lives, when to access memory, and how to search it | Prompt-only instruction layer |
| Relevant-memory attachment recall | `query.ts` starts `startRelevantMemoryPrefetch(...)`, then `attachments.ts` returns `relevant_memories` attachments | Requires `isAutoMemoryEnabled()` and `tengu_moth_copse` | One runtime attachment containing selected memory files, each rendered as a system reminder with header plus content | Runtime-gated recall path |
| Extraction mode | `query/stopHooks.ts` fires `extractMemoriesModule.executeExtractMemories(...)`, `cli/print.ts` drains the pending extraction before shutdown | Requires `EXTRACT_MEMORIES` and `isExtractModeActive()` plus `isAutoMemoryEnabled()` | A forked agent prompt that scans memory files, writes topic files, and may emit a memory-saved notice | Background extraction sidecar |
| QueryEngine custom-prompt fallback | `QueryEngine.ts` injects `loadMemoryPrompt()` only when `customSystemPrompt !== undefined && hasAutoMemPathOverride()` | Explicit SDK override only | Memory-mechanics prompt is added even when the caller replaces the default system prompt | Prompt-only fallback, not the main interactive path |
| Team memory combined prompt | `memdir.ts -> loadMemoryPrompt()` can delegate to `teamMemPrompts.buildCombinedMemoryPrompt(...)` | Requires `TEAMMEM` and team memory enabled | Private and team memory directories plus scope guidance | Prompt-level variant of baseline injection |

Key presentation distinction:

- Baseline injection is the default "memory is in context" path.
- Relevant-memory recall is a separate runtime attachment path that adds targeted memory files on demand.
- Extraction mode is not presentation for the main model turn; it is a forked background writer.
- QueryEngine's prompt-only memory injection is a special SDK/custom-prompt compatibility path, not the normal session path.

## Feature-Gate Matrix

| Gate / setting | Location | Default behavior in code | Affects | Mode classification |
| --- | --- | --- | --- | --- |
| `CLAUDE_CODE_DISABLE_CLAUDE_MDS` | `context.ts:165-172` | Hard disables `CLAUDE.md` discovery | Baseline prompt injection | Prompt gate |
| `--bare` / `CLAUDE_CODE_SIMPLE` | `context.ts:165-172`, `memdir/paths.ts:30-55` | Disables auto memory and auto-discovery unless explicit `--add-dir` is present | Baseline memory prompt and other auto-memory behaviors | Runtime gate |
| `CLAUDE_CODE_REMOTE` without `CLAUDE_CODE_REMOTE_MEMORY_DIR` | `memdir/paths.ts:44-49` | Auto memory is off | Baseline prompt injection and extraction entrypoints | Runtime gate |
| `autoMemoryEnabled` setting | `memdir/paths.ts:50-55` | Default true unless explicitly disabled | Auto memory prompt mechanics, relevant-memory recall, extraction, /remember, /dream | Runtime gate |
| `hasAutoMemPathOverride()` | `memdir/paths.ts:194-196`, `QueryEngine.ts:311-319` | Opt-in signal for SDK callers | Prompt-only memory-mechanics injection when custom system prompt replaces default | Prompt fallback gate |
| `tengu_moth_copse` | `memdir/memdir.ts:419-490`, `utils/claudemd.ts:1135-1150`, `utils/attachments.ts:2357-2365`, `services/extractMemories/extractMemories.ts:366-369` | Cached default false | Hides the `MEMORY.md` index from the prompt and activates relevant-memory attachment recall; also removes index content from extraction prompt building | Cross-cutting presentation gate |
| `EXTRACT_MEMORIES` | `query/stopHooks.ts:141-156`, `cli/print.ts:962-969`, `backgroundHousekeeping.ts:34-37` | Feature-gated build/runtime module | Turns on forked background extraction and draining | Runtime sidecar gate |
| `tengu_passport_quail` | `memdir/paths.ts:69-77`, `services/extractMemories/extractMemories.ts:536-547` | Cached false | Master switch for extraction mode activation | Runtime gate |
| `tengu_slate_thimble` | `memdir/paths.ts:73-77`, `cli/print.ts:965-969` | Cached false | Allows extraction mode in non-interactive sessions | Runtime gate |
| `TEAMMEM` | `memdir/memdir.ts:448-472`, `memdir/teamMemPrompts.ts:22-99`, `memoryFileDetection.ts:107-172` | Feature-gated | Adds shared team memory directory, shared prompt, and team recall paths | Prompt + runtime hybrid |
| `tengu_coral_fern` | `memdir/memdir.ts:375-406` | Cached false | Enables "searching past context" guidance section inside the memory prompt | Prompt-only guidance gate |
| `tengu_herring_clock` | `memdir/paths.ts:69-77`, `memdir/memdir.ts:500-505` | Cached false | Used as a cohort marker when auto memory is disabled | Telemetry/cohort gate |
| `tengu_paper_halyard` | `utils/claudemd.ts:1157-1165` | Cached false | Lets project/local memory be skipped from `getClaudeMds()` | Prompt composition gate |
| `tengu_session_memory` / `tengu_sm_compact` | `services/compact/sessionMemoryCompact.ts:403-431` | Cached false | Controls session-memory compaction ownership | Related but not memory-presentation |

## Dominant Mode Note

The dominant CC memory presentation mode is baseline prompt injection, not attachment recall.

Why:

- `context.ts` always builds and caches the `claudeMd` user context unless `CLAUDE_CODE_DISABLE_CLAUDE_MDS` or a bare-mode suppression applies.
- `constants/prompts.ts` always includes `systemPromptSection('memory', () => loadMemoryPrompt())` in the normal prompt assembly path.
- `tengu_moth_copse` defaults false, so the memory index is normally present in the prompt rather than being suppressed.
- Relevant-memory recall is only activated when `isAutoMemoryEnabled()` and `tengu_moth_copse` are both true, and then only after a successful prefetch.

So the default mental model should be:

1. memory instructions and index content are prompt-first
2. targeted relevant-memory attachments are an opt-in runtime enhancement
3. extraction is a separate background write path

## Extraction Mode Read

Extraction mode is not a stronger form of recall.
It is a sidecar that writes durable memory.

Evidence:

- `query/stopHooks.ts:141-156` triggers extraction after turns when `EXTRACT_MEMORIES` and `isExtractModeActive()` are true.
- `services/extractMemories/extractMemories.ts:395-427` builds a prompt from existing memory files and runs a forked agent labeled `extract_memories`.
- `services/extractMemories/extractMemories.ts:536-566` shows the gate stack: `tengu_passport_quail`, `isAutoMemoryEnabled()`, and remote-mode exclusion.
- `cli/print.ts:962-969` drains in-flight extraction before shutdown in non-interactive paths.

That means extraction is a write-side continuation of durable memory, not a presentation mode for the current turn.

## Migration Guidance For SNC Durable Memory

If we borrow from CC for SNC, the order should be:

1. Keep a stable baseline memory prompt first.
   - CC proves that memory policy and memory index are easiest to reason about when they live in prompt assembly, not in scattered tool hooks.
2. Add runtime recall as a separate attachment layer.
   - CC's `relevant_memories` attachments are a better fit for selective recall than for the primary durable-memory contract.
3. Keep extraction as a background writer, not a foreground dependency.
   - The forked extraction agent is a good donor pattern, but SNC should not require it to answer a normal turn.
4. Treat gate-driven index suppression as a mode switch, not a new memory subsystem.
   - `tengu_moth_copse` is a presentation-policy gate, not a storage engine.
5. Keep prompt-only fallback logic limited to SDK/custom-prompt replacements.
   - `QueryEngine` shows a special-case compatibility path, but not a general model for the main runtime.

Practical SNC rule:

- baseline durable memory should be readable even when runtime recall is off
- runtime recall should improve precision, not become the only way memory exists
- extraction should remain best-effort and decoupled from the main answer path

## SNC Relevance

This packet matters to SNC because it gives a clean separation for durable memory design:

- prompt injection for stable continuity
- attachment recall for selective resurfacing
- extraction for background persistence
- feature gates for runtime policy changes without rewriting the core host

That separation is exactly what SNC needs if durable memory is going to stay hot-pluggable instead of becoming a host fork.

## Modification Guidance

Recommended stance by area:

- `context.ts` baseline injection: `Wrap preferred`
- `memdir.ts` memory prompt assembly: `Wrap preferred`
- `utils/claudemd.ts` filter logic: `Wrap preferred`, with small internal edits only if the presentation contract changes
- `utils/attachments.ts` relevant-memory recall: `Hot-pluggable seam`
- `query/stopHooks.ts` extraction trigger: `Hot-pluggable seam`
- `services/extractMemories/*` background writer: `Hot-pluggable seam`, but keep it bounded
- `QueryEngine.ts` custom-prompt fallback: `Host-owned seam`, only if SDK compatibility demands it

Do not over-import CC's exact shape:

- do not collapse baseline injection and runtime recall into one mechanism
- do not make extraction mandatory for normal sessions
- do not move memory policy into a hidden prompt-only branch when a runtime gate is clearer

## Still-Unverified Questions

1. Is `tengu_moth_copse` enabled for any real production cohort, or is it still a narrow experiment?
2. Is `EXTRACT_MEMORIES` enabled broadly in the same builds that ship the normal memory prompt, or only in specific ant/internal distributions?
3. Does `QueryEngine` ever execute as a primary runtime path for memory in a non-SDK environment, or is it only a compatibility path for custom system prompts?
4. Are there other memory-presentation gates outside this packet that can suppress or duplicate `MEMORY.md` content indirectly?
5. Does the team-memory path ever become the dominant mode for a nontrivial cohort, or is it still a secondary branch layered on auto memory?
