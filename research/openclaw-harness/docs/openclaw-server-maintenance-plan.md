# Openclaw Server Maintenance Plan

Last updated: 2026-04-02

## Position

The right way to manage this server is not to treat `/home/admin/.openclaw` as a code repo.

It is an operational state directory.

That means the workflow should be:

1. inspect
2. snapshot
3. diff
4. explain
5. prepare candidate change
6. apply through the existing safe path
7. update README and feature inventory

Anything more chaotic will turn into config archaeology.

## Current Facts

Observed on server:

- Main config: `/home/admin/.openclaw/openclaw.json`
- Backup dir: `/home/admin/.openclaw/config-backups/`
- Audit log: `/home/admin/.openclaw/logs/config-audit.jsonl`
- Safe apply script: `/home/admin/.openclaw/scripts/safe-apply-config.sh`
- Rollback script: `/home/admin/.openclaw/scripts/rollback-openclaw.sh`
- Manual backup script: `/home/admin/.openclaw/scripts/backup-openclaw-config.sh`

High-level config sections:

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

This is already enough structure to manage cleanly.

## Goal

Have me maintain three things on a steady cadence:

1. versioned config snapshots
2. feature decomposition
3. README accuracy

## Recommended Structure

Keep the long-term tracking artifacts in this local repo, not only on the server.

Recommended local artifacts:

- `research/openclaw-harness/server/`
- `research/openclaw-harness/server/snapshots/`
- `research/openclaw-harness/server/feature-map.md`
- `research/openclaw-harness/server/README.openclaw-server.md`
- `research/openclaw-harness/server/change-log.md`

Server stays the source of truth for live state.
This repo becomes the source of truth for understanding, history, and decisions.

## Operating Modes

### 1. Passive review mode

Use when:

- no live changes are needed
- we only want to understand drift and current behavior

Steps:

1. read `openclaw.json`
2. redact secrets
3. save a timestamped local snapshot
4. diff against previous snapshot
5. update feature map
6. update README if the public behavior changed

### 2. Change-prep mode

Use when:

- we want to add or modify an agent, model, binding, channel, plugin, or gateway behavior

Steps:

1. snapshot current live config
2. generate a candidate config locally
3. explain intended delta in plain language
4. push candidate to server temp path
5. apply with `safe-apply-config.sh`
6. inspect status
7. if success, archive the candidate and update README
8. if failure, trust rollback and inspect recovery logs

### 3. Post-change documentation mode

Use when:

- a live change already happened and the docs are behind

Steps:

1. diff current live config vs last documented snapshot
2. summarize what changed
3. refresh feature map
4. refresh README sections affected

## Cadence

Do not over-engineer this.

Recommended cadence:

- Weekly:
  - snapshot live config
  - diff against previous snapshot
  - refresh feature map if drift exists

- After every real config change:
  - save snapshot
  - update README
  - write one-line entry to local change log

- Monthly:
  - cleanup review
  - look for dead agents, stale bindings, orphaned plugins, duplicate model routes

That is enough. More frequent than this is usually vanity.

## Feature Decomposition Method

Break the server into stable domains:

1. Models
   - providers
   - default mode
   - routing policy

2. Agents
   - defaults
   - agent list
   - role split

3. Bindings
   - which channel/account maps to which agent

4. Channels
   - Telegram and any future channels

5. Gateway
   - runtime behavior
   - health/restart path

6. Plugins and skills
   - what is loaded
   - why it exists

7. Session behavior
   - persistence
   - memory
   - temporary state

Each review should answer:

- what exists
- what is active
- what is redundant
- what is risky
- what is undocumented

## README Policy

The README should not be a dump of raw config.

It should answer:

1. what this server is for
2. which agents exist and why
3. how requests are routed
4. what channels are connected
5. how to safely change config
6. where rollback and logs live
7. what changed recently

If a detail only matters to recovery or debugging, keep it in the feature map or change log, not in the top-level README.

## Safety Rules

These are the only ones worth keeping:

1. never edit live config without making a fresh snapshot
2. never apply a candidate directly when `safe-apply-config.sh` already exists
3. never trust memory over diff
4. never update README before confirming the live system actually changed

## What I Should Own

My job in this workflow should be:

1. inspect current server state
2. produce local redacted snapshots
3. generate feature decomposition
4. write README updates
5. prepare candidate configs
6. explain the blast radius before applying
7. use the safe apply and rollback path instead of cowboy edits

## What To Build Next

The next useful artifacts are:

1. a local snapshot script that pulls and redacts `openclaw.json`
2. a feature map template
3. a README template for the server
4. a change review checklist

## Bottom Line

The plan is simple:

- let the server keep running the live state
- let this repo keep the understanding
- let backups and rollback stay server-side
- let me handle the diffs, decomposition, and docs

That is the least stupid way to manage this thing over time.
