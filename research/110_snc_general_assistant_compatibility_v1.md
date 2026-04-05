# SNC General-Assistant Compatibility V1

## Purpose

This round closes the first `Milestone 2` compatibility cut:

- SNC should remain writing-specialized
- but it should not force every OpenClaw session into writing framing

The concrete concern was valid:

- normal development work
- ordinary assistant use
- daily task handling

should not automatically inherit writing-specific runtime language just because SNC is enabled.

## What Landed

### 1. bounded specialization mode

SNC config now supports:

- `specializationMode: "auto"`
- `specializationMode: "writing"`
- `specializationMode: "general"`

`auto` is the new default.

### 2. runtime framing no longer assumes every session is writing work

In `auto` mode:

- if writing artifacts are configured, SNC uses writing-oriented framing
- otherwise SNC uses neutral continuity framing

This means a state-only install can now coexist more cleanly with ordinary assistant work.

### 3. session-state projection labels are now neutral

Prompt-visible section labels moved from:

- `Story ledger`
- `Chapter state`

to:

- `Continuity ledger`
- `Active state`

That keeps the continuity model useful for non-writing sessions without deleting the writing path.

### 4. compaction wording is now mode-aware

Compaction guidance now says:

- `writing anchors` in writing mode
- `continuity anchors` in general mode

So SNC no longer tells the host to preserve "writing anchors" during ordinary development-style sessions unless the user explicitly wants that mode.

## Files

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/config.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/config.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/helper-tools.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/hook-scaffold.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/openclaw.plugin.json`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/README.md`

## Validation

Focused validation passed:

- `extensions/snc/src/config.test.ts`
- `extensions/snc/src/engine.test.ts`
- `extensions/snc/src/helper-tools.test.ts`
- `extensions/snc/src/hook-scaffold.test.ts`

Result:

- `31/31` tests passed

Workspace typecheck also passed with:

- `NODE_OPTIONS=--max-old-space-size=8192`

## Practical Read

This does not make SNC "generic" in product identity.
It makes SNC safer as an installed context engine in mixed-use OpenClaw sessions.

That is the right `Milestone 2` move:

- keep the writing-specialized upside
- remove unnecessary writing-first interference from general assistant use

## Follow-on Impact

This compatibility cut now becomes a hard constraint for later `Milestone 2` work:

- controller launch should not assume every delegated job is a writing helper
- helper-surface work should stay opt-in and role-bounded
- durable-memory diagnostics should remain continuity-oriented, not fiction-specific by default
