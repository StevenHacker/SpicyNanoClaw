# CC-14 Memory Hygiene / Pruning / Explainability Matrix

## Purpose

Extract the specific Claude Code memory-hygiene mechanisms that are worth donating into SNC Milestone 2 follow-up work: update-vs-duplicate rules, stale-memory avoidance, pruning budgets, and inspectability surfaces that help operators understand memory quality. This packet is intentionally not a broad "memory system overview."

## Scope

- Repo: `data/external/claude-code-leeyeel-4b9d30f`
- Focus:
  - memory extraction rules
  - dedupe and stale-memory handling
  - selector and surfacing budgets
  - operator/main-agent visibility of memory writes and memory freshness
  - donor value vs product-shell dressing
- Main entry files:
  - `data/external/claude-code-leeyeel-4b9d30f/src/services/extractMemories/prompts.ts`
  - `data/external/claude-code-leeyeel-4b9d30f/src/services/extractMemories/extractMemories.ts`
  - `data/external/claude-code-leeyeel-4b9d30f/src/memdir/findRelevantMemories.ts`
  - `data/external/claude-code-leeyeel-4b9d30f/src/memdir/memoryAge.ts`
  - `data/external/claude-code-leeyeel-4b9d30f/src/memdir/memoryScan.ts`
  - `data/external/claude-code-leeyeel-4b9d30f/src/memdir/memoryTypes.ts`
  - `data/external/claude-code-leeyeel-4b9d30f/src/memdir/paths.ts`
  - `data/external/claude-code-leeyeel-4b9d30f/src/utils/attachments.ts`
  - `data/external/claude-code-leeyeel-4b9d30f/src/utils/messages.ts`
  - `data/external/claude-code-leeyeel-4b9d30f/src/skills/bundled/remember.ts`
  - `data/external/claude-code-leeyeel-4b9d30f/src/components/memory/MemoryFileSelector.tsx`

## Verified Structure / Lifecycle / Contract

### 1. Extraction and update rules

| Area | Verified behavior |
| --- | --- |
| extraction source window | extraction prompt is limited to the most recent messages only |
| duplicate avoidance | prompt explicitly says to update an existing memory file rather than create a duplicate |
| stale correction | prompt explicitly says to update or remove memories that turn out to be wrong or outdated |
| index discipline | `MEMORY.md` is treated as an index, not a memory; it is kept concise because the prompt truncates after about 200 lines |
| team-memory hygiene | combined prompt explicitly says not to store sensitive data in shared team memories |
| main-agent precedence | `hasMemoryWritesSince(...)` short-circuits background extraction when the main agent already wrote auto-memory files in that range |
| extraction scope | background extractor uses a narrow tool allowlist and may only write inside the memory directory |

The strongest donor pattern here is not "CC stores memories." It is "CC sharply constrains how memories are created and updated."

### 2. Hygiene and pruning matrix

| Mechanism | Verified behavior | Donor value |
| --- | --- | --- |
| memory-path trust boundary | `autoMemoryDirectory` excludes `projectSettings`; only trusted settings sources can redirect memory root | prevents hostile repo-controlled memory path injection |
| scan budget | `scanMemoryFiles(...)` excludes `MEMORY.md`, sorts newest-first, caps to 200 files | bounded recall corpus |
| selector budget | `findRelevantMemories(...)` asks Sonnet to select up to 5 clearly useful memories only | bounded recall surface |
| already-surfaced filtering | `alreadySurfaced` paths are removed before selector call | avoids wasting budget on repeated memories |
| recent-tool suppression | selector prompt tells the model not to surface generic usage docs for tools already being used | cuts redundant noise |
| truncated surfacing | `readMemoriesForSurfacing(...)` caps by lines and bytes, then marks truncation | bounded prompt cost with explicit partial-read semantics |
| read-state dedupe | `filterDuplicateMemoryAttachments(...)` filters against `readFileState` before marking survivors | prevents self-dropping and repeated injection |
| stale warning | memories older than one day get an explicit freshness caveat | helps prevent authoritative stale assertions |

There is no single global "memory garbage collector" contract in the verified code. Hygiene is distributed across extraction rules, scan caps, selector caps, stale warnings, and attachment dedupe.

### 3. What not to save

`memoryTypes.ts` adds a second hygiene layer beyond the extractor prompt.

Verified non-goals include:

- code patterns or architecture snapshots as if they were timeless facts
- file paths and line references without current-state verification
- git history and debugging transcripts
- CLAUDE.md content
- ephemeral task details

It also explicitly tells the agent:

- treat memory as point-in-time observation
- verify against current code before asserting a remembered claim as fact
- if memory conflicts with current state, trust current state and update or remove stale memory

### 4. Explainability / inspectability surfaces

| Surface | Verified behavior | Runtime value |
| --- | --- | --- |
| `memory_saved` system message | emitted with written topic-file paths after extraction | tells the main thread that memories were saved |
| relevant-memory header | `Memory (saved today/yesterday/X days ago): <path>` or a stronger stale warning for older files | exposes freshness directly in context |
| `memoryFreshnessNote(...)` | reused by `FileReadTool` for memory files | keeps stale warning behavior consistent across recall and direct reads |
| truncated read metadata | attachment keeps `limit` when the surfaced file was clipped | signals that more content exists |
| UI / review affordances | `MemoryFileSelector` and `/remember` help users inspect or reorganize memory | useful product shell, but not core donor runtime |

### 5. Product shell vs donor substrate

Donor-value substrate:

- extraction prompt hygiene rules
- update-vs-duplicate rule
- "remove outdated memories" rule
- narrow write permissions
- short-circuit when the main agent already wrote memory
- stale-memory warnings
- selector and surfacing budgets
- trusted-source gating for memory path overrides

Product-shell dressing:

- `/remember` review/promotion workflow
- `MemoryFileSelector` UI
- broader memory review toggles and operator UX around manual browsing

The donor frontier is the hygiene contract, not the shell commands.

## Key Findings

1. Claude Code's strongest memory donor value is a hygiene contract, not a memory UI.
2. Duplicate avoidance is enforced in multiple places: extractor prompt, main-agent-write short-circuit, selector-side dedupe, and read-state dedupe.
3. Stale-memory handling is explicit and operator-legible; older memories are not silently treated as equal-confidence facts.
4. Pruning is budgeted and distributed rather than a single GC pass.
5. Path trust boundaries matter: memory-root override is intentionally denied to repo-controlled project settings.

## SNC Relevance

This packet is directly relevant to `SNC-Milestone2-04 Durable Memory Diagnostics And Controls`.

If SNC adds diagnostics, pruning, or controls, the best donor moves are:

- age/freshness visibility
- duplicate suppression before store growth becomes operator pain
- update-in-place preference over append-only clutter
- trusted-source rules for memory-root changes
- explicit saved-memory notifications or inspectable summaries

The least useful donor move would be copying CC's `/remember` shell before SNC has the underlying hygiene contract.

## Modification Guidance

- `wrap`:
  - expose SNC durable-memory freshness, last-write, and topic-level duplication signals
  - keep memory-save notifications operator-visible
- `extend`:
  - adopt update-vs-duplicate heuristics and stale-memory caveats in SNC durable-memory diagnostics
  - consider bounded scan and bounded surfacing budgets instead of unbounded catalog injection
  - keep memory-root overrides behind trusted operator-controlled config, not project-controlled config
- `defer`:
  - user-facing memory review shell, browser UI, or promotion workflows
- `avoid`:
  - append-only durable memory without dedupe or age signals
  - repo-controlled path overrides that can redirect memory writes to unsafe locations
  - claiming SNC has "memory hygiene" if it only has storage

## Still-unverified questions

1. Whether CC has a later-stage automated compaction or archival pass for old memory files beyond the scan and surfacing caps verified here.
2. The exact production schema and operational tooling around team-memory review flows, which are peripheral to SNC's current donor needs.
3. How much of the memory UI shell materially feeds back into runtime recall quality versus being purely operator convenience.
