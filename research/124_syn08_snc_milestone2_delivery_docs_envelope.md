# SYN-08 SNC Milestone 2 Delivery / Docs Envelope

## Purpose

Define the bounded Milestone 2 delivery and documentation envelope for SNC after the phase-7 host/operator packets. This is not a new architecture plan. It is a release/docs packet for what SNC should tell operators first, what config it should recommend, and what it must still avoid promising.

## Scope

- Synthesis inputs:
  - `research/114_oc15_plugin_enablement_restart_matrix.md`
  - `research/116_syn07_snc_milestone2_operator_profile.md`
  - `research/121_oc16_contextengine_slot_lifecycle_matrix.md`
  - `research/122_oc17_config_path_statedir_matrix.md`
- Live code touchpoints:
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/README.md`
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/openclaw.plugin.json`
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/config.ts`
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
- This packet stays bounded to delivery, install docs, first-run profile, demo order, and explicit non-promises.

## Verified Structure / Lifecycle / Contract

### 1. What the delivery/docs surface should lead with

Current code and accepted packets support a simple top-level operator story:

1. SNC is an ordinary OpenClaw `context-engine` plugin.
2. Installation follows the normal plugin lane, not a host fork lane.
3. Activation requires explicit `plugins.slots.contextEngine = "snc"`.
4. Config changes are restart-oriented.
5. `stateDir` is the real persistence boundary.

That is the strongest honest Milestone 2 story.

### 2. Install-priority matrix

| Docs priority | What to recommend | Why |
| --- | --- | --- |
| first | managed plugin install package / copied delivery lane | matches OpenClaw clean-host delivery contract |
| second | explicit `plugins.slots.contextEngine = "snc"` | slot ownership is separate from install and enabled state |
| third | explicit `stateDir` using `~` or absolute path | current plugin path resolution is CWD-relative |
| fourth | restart gateway after config changes | matches verified host behavior |
| fifth | optional `specializationMode` choice | real product shaping, but not required for first activation |

Install surfaces that should not lead the docs:

- `--link` developer install
- marketplace-first framing
- loader-internal reload behavior

### 3. Recommended first-run profile

Recommended first-run Milestone 2 profile:

- install SNC through the ordinary plugin lane
- set `plugins.slots.contextEngine = "snc"`
- keep `plugins.entries.snc.enabled = true`
- set `stateDir` explicitly with `~` or absolute path
- keep `specializationMode = "auto"` unless the operator knows they want `general`
- keep hooks off by default in the first-run path

Why this is the best first-run profile:

- it exercises the real plugin boundary
- it enables persistent continuity, durable memory, and worker-state hygiene
- it avoids path ambiguity
- it avoids turning optional hook behavior into a hidden default

### 4. README / demo order

Recommended docs order:

1. what SNC is: ordinary context-engine plugin with continuity and bounded delegation
2. fastest honest install: install, select slot, restart
3. recommended first-run config: explicit `stateDir`, `specializationMode`
4. what improves when `stateDir` is present
5. optional hooks section
6. swap / disable / uninstall safety note
7. validation / rehearsal commands

Recommended demo order:

1. show SNC as a normal plugin activation
2. show continuity improvement with `stateDir`
3. show one bounded delegation / fold-back flow
4. optionally show hooks later as an enhancement

This sequencing matches current host and plugin reality better than leading with hooks or helper-tool ambitions.

### 5. Swap / disable / uninstall note that docs must include

Phase-7 packet `37` makes one operator warning mandatory:

- slot selection is sticky
- disabling or uninstalling SNC does not currently auto-reselect `legacy`

So docs should explicitly say:

- before disabling or uninstalling SNC, reselect another context engine such as `legacy`
- then restart

This is not optional polish. It is required for a safe clean-host story.

### 6. Path guidance docs must include

Phase-7 packet `38` makes one path warning mandatory:

- SNC config paths are currently resolved through plugin `resolvePath(...)`
- relative values resolve against the gateway process CWD
- they are not guaranteed to be relative to the config file or plugin directory

So docs should:

- prefer `~/...` or absolute paths in first-run examples
- keep relative examples only in explicitly development-oriented sections

### 7. Explicit non-promises for Milestone 2

Milestone 2 should not promise:

- live plugin hot-reload as an operator feature
- automatic fallback to `legacy` after SNC disable or uninstall
- marketplace-first delivery as the main install lane
- helper tools as a default public runtime surface
- hooks as mandatory baseline behavior
- a remote-control platform or general worker console
- memory-slot ownership
- host-platform rewrite or kernel architecture ambitions

### 8. Current README tensions

Two current README tendencies are weaker than the verified operator envelope:

| Current tendency | Why it is weaker than the phase-7 envelope |
| --- | --- |
| `Good First Config` turns hooks on | accepted operator profile keeps hooks optional and disabled-by-default |
| config examples use relative paths like `./.snc/state` | current code resolves them against process CWD, which is not a clean-host-safe assumption |

These are documentation tensions, not proof that the runtime contract is different.

## Key Findings

1. The clean Milestone 2 docs story is still "ordinary plugin install, explicit slot, explicit stateDir, restart."
2. The docs must now include two concrete warnings: sticky `contextEngine` slot cleanup and CWD-relative SNC path resolution.
3. Hooks, helper tools, marketplace-first delivery, and control-platform language should remain outside the first-run narrative.
4. The strongest honest demo is continuity plus bounded delegation, not platform ambition.
5. The current README is directionally close, but its first-run config is still more aggressive than the verified operator envelope.

## SNC Relevance

This packet is directly usable for the next README, release note, demo, and clean-host rehearsal pass.

It narrows the Milestone 2 outward promise to what the code already supports well:

- continuity
- persistence when `stateDir` is configured
- bounded worker-state fold-back
- ordinary plugin delivery

That is the right product posture for SNC right now.

## Modification Guidance

- `wrap`:
  - update SNC docs to lead with managed install, explicit slot selection, explicit `stateDir`, and restart
  - add a short swap/remove safety note for `contextEngine` reselection
  - move hooks into an explicit opt-in section
- `extend`:
  - add validation output or troubleshooting guidance that prints resolved `stateDir` and current slot ownership
- `defer`:
  - marketplace-first docs
  - helper-tool public docs
  - broader multi-worker control narrative
- `avoid`:
  - relative-path first-run examples without caveat
  - implying that plugin disable/uninstall is automatically self-healing
  - leading release messaging with long-range custom-Claw ambition

## Still-unverified questions

1. The exact final package/release artifact name and whether Milestone 2 docs will ship with a prebuilt archive, npm lane, or both.
2. Whether the main thread will keep the current README structure or replace it with a shorter install-first page.
3. Whether post-Milestone-2 validation tooling will expose slot and path diagnostics directly enough to shrink the docs warning burden.
