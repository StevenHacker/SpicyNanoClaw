# Openclaw Server README

Last updated: 2026-04-02

## What This Server Is

This is the live `openclaw` server state and routing node behind `/home/admin/.openclaw`.

It is not a clean code repository.
It is an operational home directory with config, bindings, memory stores, channel state, plugins, logs, and recovery artifacts.

## Source Of Truth

- Live config: `/home/admin/.openclaw/openclaw.json`
- Backups: `/home/admin/.openclaw/config-backups/`
- Recovery logs: `/home/admin/.openclaw/recovery-logs/`
- Safe apply: `/home/admin/.openclaw/scripts/safe-apply-config.sh`
- Rollback: `/home/admin/.openclaw/scripts/rollback-openclaw.sh`

## How We Manage It

1. Pull a redacted snapshot to this repo.
2. Diff against the last known snapshot.
3. Update the feature map.
4. If behavior changed, update this README.
5. If a config change is needed, generate a candidate and apply it through the server's safe apply script.

## Review Cadence

- Weekly snapshot and diff
- Immediate review after every config change
- Monthly cleanup pass for stale agents, bindings, plugins, and temp artifacts

## Change Rules

1. No direct cowboy edits to live config without a fresh snapshot.
2. No blind edits without diff.
3. No README changes before confirming the live state actually changed.
4. No secrets copied into this repo.

## Files In This Repo

- Snapshot store: [`snapshots`](C:/Users/Administrator/Documents/codex_project_1/research/openclaw-harness/server/snapshots)
- Feature inventory: [feature-map.md](C:/Users/Administrator/Documents/codex_project_1/research/openclaw-harness/server/feature-map.md)
- Change log: [change-log.md](C:/Users/Administrator/Documents/codex_project_1/research/openclaw-harness/server/change-log.md)

## Current Status

- Snapshot automation: ready
- First redacted live snapshot: complete
- Feature map: first pass complete
- Server README: initialized
- Live config decomposition: in progress

## First-Pass Findings

- The live config is already structured, not random:
  - `meta`
  - `wizard`
  - `auth`
  - `models`
  - `agents`
  - `tools`
  - `bindings`
  - `commands`
  - `session`
  - `channels`
  - `gateway`
  - `plugins`
- The server is multi-agent by design, not a single assistant with aliases.
- Telegram routing is an important operational surface.
- The directory has a lot of useful safety plumbing already:
  - backups
  - rollback
  - recovery logs
  - candidate configs
- It also has obvious config-sprawl risk.

## Next Step

Do a deeper decomposition of:

1. `agents.list`
2. `plugins.entries`
3. `bindings`
4. `gateway`
