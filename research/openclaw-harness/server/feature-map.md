# Openclaw Feature Map

Last updated: 2026-04-02

## Purpose

This file tracks what the live server can actually do.
Do not paste raw config here. Summarize behavior.

## Live Config Source

- Host: `47.253.63.166`
- Root: `/home/admin/.openclaw`
- Main config: `/home/admin/.openclaw/openclaw.json`

## Sections To Maintain

## Models

- Default mode: `merge`
- Providers observed:
  - `kimi-coding`
  - `honoursoft`
  - `bailian`
  - `openai-codex`
- Notable models observed:
  - `kimi-coding/k2p5`
  - `bailian/qwen3.5-plus`
  - `bailian/qwen3-max-2026-01-23`
  - `openai-codex/gpt-5.2`
  - `openai-codex/gpt-5.3-codex`
  - `openai-codex/gpt-5.4`
- Routing notes:
  - agent defaults point primary to `openai-codex/gpt-5.3-codex`
  - fallback points to `openai-codex/gpt-5.4`
  - Qwen is already a first-class agent model, not just a backup path
- Oddities:
  - `honoursoft` provider exists with no listed models in the snapshot excerpt, which smells like either custom runtime resolution or stale config complexity

## Agents

- Defaults:
  - workspace: `/home/admin/.openclaw/workspace`
  - timezone: `Asia/Shanghai`
  - compaction mode: `safeguard`
  - remote memory search provider exists with local fallback
- Agent list observed in snapshot excerpt:
  - `main`
  - `kimiwriting` / `KellyWriter`
  - `kimimanager` / `AlfredManager`
  - `bigo` / `BigO`
  - `coderX` / `CoderX`
  - `alicereviewer` / `AliceReviewer`
  - `gemwriter` / `GeminiWriter` appears present but the current snapshot excerpt cut off before full details
- Special-purpose agents:
  - writing-oriented agents are clearly a big part of this server
  - review and manager agents are first-class, not sidecars
- Dead or suspicious agents:
  - naming is inconsistent: both `coderX` and lowercase-style ids exist elsewhere in the directory tree
  - needs a dedicated cleanup pass for agent naming drift and stale workspaces

## Tools

- Top-level tool sections:
  - `web`
  - `sessions`
  - `agentToAgent`
- Immediate read:
  - this server treats browsing, session lifecycle, and inter-agent routing as core capabilities
- Anything non-default:
  - needs deeper decomposition from the full redacted snapshot, but the tool layout already suggests a harness-style runtime rather than a single-bot config

## Bindings

- Current binding count: `9`
- Confirmed routing style:
  - bindings map channel/account pairs to agent ids
  - Telegram is actively used for agent routing
- Observed account-specific routes:
  - `manager -> kimimanager`
  - `writing -> kimiwriting`
  - `bigo -> bigo`
- Anything duplicated or risky:
  - a 9-binding setup is already enough to drift quietly
  - binding review should check for dead Telegram accounts, agents that no longer exist, and orphaned reviewer routes

## Channels

- Telegram:
  - present and clearly operational
  - state directories include command hashes and update offsets for multiple identities
- Other channels:
  - none confirmed from the current snapshot summary

## Gateway

- Restart path:
  - `openclaw gateway restart`
- Health/status path:
  - `openclaw gateway status`
  - safe apply script specifically checks for `RPC probe: ok`
- Operational quirks:
  - this setup already assumes safe-restart validation, which is good and should not be bypassed

## Plugins

- Plugin config sections:
  - `load`
  - `entries`
  - `installs`
- Immediate read:
  - plugin loading is first-class in live config, not an afterthought
- Unclear or stale plugins:
  - needs a dedicated pass because stale plugin entries are one of the easiest ways to accumulate bullshit config over time

## Session and Memory

- Session behavior:
  - live config includes a top-level `session` section
  - runtime home also has `subagents/runs.json`, `delivery-queue/`, and many workspaces
- Memory stores:
  - multiple SQLite memory files exist under `/home/admin/.openclaw/memory/`
  - there is also per-workspace `MEMORY.md`, `SOUL.md`, `USER.md`, `IDENTITY.md`, `TOOLS.md`
- Temp/runtime artifacts:
  - `/home/admin/.openclaw/temp` is full of candidate configs and apply logs
  - this is useful, but also a sign the system can rot if no one curates it

## Risks

- Config sprawl:
  - high
  - this directory is already an ecosystem, not a config file
- Secret sprawl:
  - medium to high
  - auth, credentials, and device state are distributed across several subtrees
- Stale backups:
  - medium
  - backups are plentiful, which is good, but there should still be a sanity pass on retention and usefulness
- Naming collisions:
  - high
  - workspace names, agent ids, and memory db names already show inconsistency

## Next Review

- Snapshot date: `2026-04-02`
- Diff against: the next pulled redacted snapshot
- Main questions:
  - what exactly is inside `agents.list` beyond the excerpt?
  - which plugin entries are live vs stale?
  - how much of `/temp` is active workflow vs old debris?
  - whether `honoursoft` is truly live or just config luggage
