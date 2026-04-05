# CC Domain Atlas

## Purpose

This note widens the CC read beyond the SNC-critical memory/compact spine.

The goal is not to flatten the repo into a directory dump.
The goal is to preserve a broader architectural picture so later deeper work can be distributed across the whole codebase without losing the main shape.

This is a breadth document, not a deep behavior proof.

## Confidence Rule

- `Confirmed domain`: supported by directory shape plus at least a small representative file sample
- `Tentative domain`: grouped mainly from names and breadth scan

## Domain Map

### 1. Query / Agent Core

Status:

- Confirmed domain

Likely includes:

- `src/query`
- `src/QueryEngine.ts`
- `src/assistant`
- `src/buddy`
- `src/coordinator`
- `src/tasks`
- `src/skills`

Why this grouping:

- these names cluster around conversation ownership, agent orchestration, and task execution

Representative confirmed files:

- `src/QueryEngine.ts`
- `src/query.ts`

Current research value:

- this remains the strongest donor surface for SNC runtime ideas

### 2. Memory / Context / State

Status:

- Confirmed domain

Likely includes:

- `src/context`
- `src/memdir`
- `src/state`
- `src/services/SessionMemory`
- `src/services/extractMemories`
- `src/services/teamMemorySync`
- `src/migrations`

Why this grouping:

- these names cluster around persisted context, rolling state, and long-term memory handling

Representative confirmed files:

- `src/memdir/memdir.ts`
- `src/services/SessionMemory/sessionMemory.ts`
- `src/services/extractMemories/extractMemories.ts`
- `src/state/AppStateStore.ts`

Current research value:

- highest-value donor surface for SNC continuity, memory presentation, and state maintenance

### 3. Tooling / Capability Surface

Status:

- Confirmed domain

Likely includes:

- `src/tools`
- `src/Tool.ts`
- `src/services/tools`
- `src/services/mcp`
- `src/services/lsp`

Why this grouping:

- these names cluster around callable capability exposure and tool/runtime integration

Representative confirmed files:

- `src/tools/ToolSearchTool/ToolSearchTool.ts`
- `src/Tool.ts`

Current research value:

- important for anti-noise control, tool exposure policy, and host harness comparison

### 4. Interface / Terminal UX

Status:

- Confirmed domain

Likely includes:

- `src/cli`
- `src/screens`
- `src/components`
- `src/ink`
- `src/keybindings`
- `src/outputStyles`
- `src/vim`
- `src/voice`

Why this grouping:

- these names cluster around operator-facing interaction and terminal UX

Representative file samples:

- `src/cli/structuredIO.ts`
- `src/cli/remoteIO.ts`

Current research value:

- secondary for SNC core, but valuable later for author workflow and command ergonomics

### 5. Server / Remote / Connectivity

Status:

- Confirmed domain

Likely includes:

- `src/server`
- `src/remote`
- `src/upstreamproxy`
- `src/bridge`
- `src/entrypoints`
- `src/bootstrap`
- parts of `src/services/api`

Why this grouping:

- these names cluster around backend service entry, remote control, and network connectivity

Representative file samples:

- `src/server/createDirectConnectSession.ts`
- `src/server/directConnectManager.ts`
- `src/services/api/client.ts`
- `src/services/api/claude.ts`

Current research value:

- useful for later productization, remote workflows, and understanding how much of CC's behavior depends on network/service layers

### 6. Settings / Policy / Governance

Status:

- Confirmed domain

Likely includes:

- `src/services/policyLimits`
- `src/services/remoteManagedSettings`
- `src/services/settingsSync`
- `src/commands/permissions`
- `src/commands/privacy-settings`
- `src/commands/config`

Why this grouping:

- these names cluster around guardrails, settings propagation, and policy enforcement

Representative evidence:

- confirmed by directory names; not yet deeply read as an independent subsystem

Current research value:

- important later for understanding which CC behaviors come from governance rather than prompt/runtime tricks

### 7. Analytics / Summaries / Suggestions

Status:

- Tentative-to-confirmed domain

Likely includes:

- `src/services/analytics`
- `src/services/AgentSummary`
- `src/services/toolUseSummary`
- `src/services/PromptSuggestion`
- `src/services/tips`
- `src/services/MagicDocs`
- `src/services/autoDream`

Why this grouping:

- these names cluster around summarization, suggestion, and secondary intelligence products layered around the main agent

Representative evidence:

- breadth scan only; exact behavior still unverified

Current research value:

- likely important for output-style quality and product polish later, but not yet first-pass SNC donor priority

### 8. Commands As Product Surface

Status:

- Confirmed domain

Likely includes:

- `src/commands/*`

Why this grouping:

- CC has a very large command surface compared with a minimal assistant runtime, which means product behavior is exposed heavily through commands, not only through the main query loop

Representative breadth signals:

- memory, review, session, tasks, config, mcp, skills, plugin, permissions, output-style, compact, status, voice, vim, upgrade

Current research value:

- this matters because some "CC behavior" may really live in command/product surface design rather than in the query engine itself

## Current Breadth Read

CC no longer looks like "one query loop with memory."

At this stage it looks more like a bundled operator environment made of:

1. a query/agent runtime
2. a memory/state substrate
3. a large callable tool plane
4. a terminal-first UI/product shell
5. a remote/server layer
6. a command/governance layer

That matters for later comparison work:

- some value in CC comes from runtime harness
- some comes from memory design
- and some may come from product shell decisions that should not be mistaken for core agent architecture
