# SpicyNanoClaw

SpicyNanoClaw is OpenClaw with a better memory for writing, evidence-grounding, and long-horizon continuity.

It is a hot-pluggable `contextEngine` plugin that helps long sessions keep their brief, preserve active constraints, carry forward the right plans, fold back helper-worker results, and trim planning sludge before it takes over the thread.

If you already like OpenClaw but want a version that holds shape better across many turns, this is the one to try.

## 30-Second Start

Host baseline:

- `OpenClaw >= 2026.4.1`

If you downloaded or cloned this repo, the shortest try-today install is:

```bash
openclaw plugins install ./data/releases/snc/openclaw-snc-1.0.0.tgz
```

Then enable SNC:

```json5
{
  plugins: {
    slots: {
      contextEngine: "snc",
    },
    entries: {
      snc: {
        enabled: true,
        config: {
          stateDir: "./.snc/state",
        },
      },
    },
  },
}
```

That is enough to boot the plugin and start getting per-session continuity.

In a normal OpenClaw environment, the config usually lives at:

- `~/.openclaw/openclaw.json`

So the practical flow is:

1. install the package with `openclaw plugins install ...`
2. edit `~/.openclaw/openclaw.json`
3. set `plugins.slots.contextEngine = "snc"`
4. put SNC options under `plugins.entries.snc.config`
5. restart the OpenClaw gateway or app process after config changes

By default, SNC also isolates cross-session durable memory by agent-family when a `sessionKey` is present, so different agents do not automatically share one long-horizon memory pool just because they point at the same `stateDir`.
If you want to force a custom shared or custom-scoped pool, set:

```json5
memoryNamespace: "shared-writing"
```

For ordinary development or daily assistant work, keep:

```json5
specializationMode: "auto"
```

and switch to:

```json5
specializationMode: "general"
```

when you want SNC to stay explicitly neutral.

## If You Want The Good Writing Path

Once the basic install works, add your writing artifacts:

- `briefFile`
- `ledgerFile`
- `packetDir`

If you also want SNC to steer prose quality instead of only continuity, enable the optional writing-only style overlay. It stays out of durable memory and only activates on `writing-prose` turns.

Built-in first-party profile ids:

- `mist-suspense`
- `streetwise-banter`
- `bustling-intrigue`
- `pressure-escalation`

Minimal richer config:

```json5
{
  plugins: {
    slots: {
      contextEngine: "snc",
    },
    entries: {
      snc: {
        enabled: true,
        config: {
          briefFile: "./docs/snc/brief.md",
          ledgerFile: "./docs/snc/ledger.md",
          packetDir: "./docs/snc/packets",
          stateDir: "./.snc/state",
          style: {
            enabled: true,
            mode: "auto"
          },
          hooks: {
            enabled: true,
            targets: [
              "before_message_write",
              "tool_result_persist",
              "session_end",
              "subagent_spawned",
              "subagent_ended"
            ]
          }
        }
      }
    }
  }
}
```

Restart the gateway after changing plugin config.

## Optional Writing Style Overlay

The style overlay is a writing-only surface layer:

- off for `general` assistant turns
- off for `evidence-grounding` turns by default
- on for `writing-prose` turns when a profile is configured or auto-selected
- never persisted into SNC durable memory, worker state, or continuity state

Recommended safe starter config:

```json5
style: {
  enabled: true,
  mode: "auto",
  intensity: 0.72,
  strictness: 0.82,
  maxExamples: 1
}
```

Pin a built-in archetype:

```json5
style: {
  enabled: true,
  mode: "profile",
  profileId: "mist-suspense"
}
```

Load an external desensitized profile:

```json5
style: {
  enabled: true,
  mode: "profile",
  profileFile: "./docs/snc/styles/mist-profile.json"
}
```

Use this layer for:

- anti-"说明书感" suppression
- prose vitality
- scene-first motion
- bodily and sensory anchoring
- dialogue texture

Do not use it as a replacement for:

- current evidence
- contradiction handling
- user constraints
- factual reading tasks

External profile rule:

- external profiles must be desensitized, not raw-source
- SNC only accepts profiles with `safety_mode: "desensitized"`
- external profiles must provide `copyright_guardrails.operational_prompt_fields` and `research_only_fields`
- SNC only projects external fields that the profile explicitly marks as safe for live prompt use

## Full-Feature OpenClaw Config

If you want SNC's full current feature set in OpenClaw, use one explicit config like this:

```json5
{
  plugins: {
    slots: {
      contextEngine: "snc",
    },
    entries: {
      snc: {
        enabled: true,
        config: {
          briefFile: "./docs/snc/brief.md",
          ledgerFile: "./docs/snc/ledger.md",
          packetDir: "./docs/snc/packets",
          stateDir: "./.snc/state",
          specializationMode: "writing",
          maxSectionBytes: 24576,
          durableMemory: {
            maxCatalogEntries: 64,
            staleEntryDays: 30,
            projectionLimit: 3,
            projectionMinimumScore: 3
          },
          style: {
            enabled: true,
            mode: "profile",
            profileId: "mist-suspense",
            intensity: 0.8,
            strictness: 0.9,
            maxExamples: 1
          },
          hooks: {
            enabled: true,
            targets: [
              "before_message_write",
              "tool_result_persist",
              "session_end",
              "subagent_spawned",
              "subagent_ended"
            ],
            maxRewritesPerSession: 6,
            maxReplacementBytes: 768,
            maxToolResultBytes: 2048
          }
        }
      }
    }
  }
}
```

Notes:

- this is the current "full SNC" OpenClaw profile
- do not set `memoryNamespace` unless you intentionally want multiple agent families to share one durable-memory pool
- if you want neutral daily-assistant behavior, change `specializationMode` back to `"auto"` or `"general"`

## Optional Hook Layer

Hooks are useful, but they are still opt-in.

If you want bounded transcript shaping, tool-result preview shaping, and worker lifecycle bookkeeping, add:

```json5
hooks: {
  enabled: true,
  targets: [
    "before_message_write",
    "tool_result_persist",
    "session_end",
    "subagent_spawned",
    "subagent_ended"
  ]
}
```

## OpenClaw Host Usage

The safest OpenClaw-side rollout is:

1. start with only:
   - `stateDir`
   - `specializationMode: "auto"`
2. verify the plugin is visible:

```bash
openclaw plugins inspect snc --json
openclaw plugins list
```

3. validate host config:

```bash
openclaw config validate --json
openclaw plugins doctor
```

4. only then add:
   - `briefFile`
   - `ledgerFile`
   - `packetDir`
   - optional hooks

If you want to roll back to legacy behavior, remove or disable the slot:

```json5
plugins.slots.contextEngine = null
```

or point it back to your previous context engine, then restart OpenClaw.

## What v1.0.0 Gives You

- continuity-oriented context assembly that can stay neutral for normal development and daily assistant work
- evidence-first posture when the user explicitly asks to read, inspect, compare, quote, or list from current materials
- per-session state for directives, plans, focus, constraints, and continuity notes
- plugin-owned durable-memory harvest, bounded recall projection, bounded memory diagnostics, and bounded explainability
- agent-family-scoped durable-memory isolation by default, so unrelated agents do not cross-pollinate long-horizon memory through one shared `stateDir`
- conflict-aware suppression when fresher current evidence clearly beats older durable cues
- bounded transcript shaping for planning and meta chatter
- bounded tool-result preview replacement
- host-backed worker launch, follow-up observation, lifecycle bookkeeping, and diagnostics
- clean-host install and validation paths that match ordinary OpenClaw plugin use
- writing-output discipline that pushes report/process language out of direct drafting turns
- optional writing-only style overlay with built-in archetypes and external profile loading
- multilingual continuity hardening through Unicode-aware dedupe and correction-aware carry-forward
- continuity-aware compaction guidance while keeping compaction ownership in OpenClaw

## Why OpenClaw Users Usually Like It Fast

SNC does not ask you to replace your host.

It installs like a normal plugin, activates through one slot value, and can be rolled back the same way. That means you can try a writing-specialized continuity layer without committing to a forked runtime.

## Other Install Paths

If you are already inside an OpenClaw workspace and want a live local link:

```bash
openclaw plugins install -l ./extensions/snc
```

If and when the package is published to a registry, the target one-liner is:

```bash
openclaw plugins install openclaw-snc
```

## What v1.0.0 Does Not Pretend To Be

- not a host memory-slot takeover
- not a public MCP surface for SNC helper tools yet
- not a general worker scheduler
- not persistent worker-session orchestration
- not a resume-guaranteeing worker platform
- not a guaranteed late-reply delivery layer
- not a hard fork of OpenClaw internals

This is a bounded specialization layer with a writing advantage, not a replacement host.

## Design Intent

SNC is designed around a strict truth order:

1. current evidence
2. same-session continuity
3. cross-session durable memory
4. optional upper creative layers

That means:

- SNC should help the model remember and stay honest
- SNC should not turn memory into a catch-all platform
- SNC should not let style or inspiration overwrite factual support
- SNC should keep host ownership with OpenClaw whenever the host boundary should remain authoritative

The optional style overlay is therefore a writing-only surface layer, not a memory lane.

## Validation

These validation scripts live in the engineering repository.
They are not shipped inside the installed plugin package.

The current release gate is:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate_snc_v1.ps1
```

The clean-host install rehearsal is:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate_snc_clean_host_rehearsal.ps1
```

That rehearsal verifies:

- packaged install into a clean OpenClaw host mirror
- recommended base config write + schema validation
- `plugins inspect` / `plugins list` confirmation for the installed SNC package

The v1.0.0 gate checks:

- focused SNC validation
- dispatcher validation plus workspace typecheck
- package artifact build
- clean-host install rehearsal against a real host mirror

If you are validating an already installed plugin outside this repository, use normal host commands instead:

```bash
openclaw config validate --json
openclaw plugins inspect snc --json
openclaw plugins doctor
```

## Repo Pointers

If you are here as an OpenClaw user, these are the two useful paths:

- installable package: [`data/releases/snc/openclaw-snc-1.0.0.tgz`](./data/releases/snc/openclaw-snc-1.0.0.tgz)
- plugin source: [`data/working/openclaw-v2026.4.1-snc-v1/extensions/snc`](./data/working/openclaw-v2026.4.1-snc-v1/extensions/snc)

## Post-v1 TODO

The next bounded wave is:

1. faster SNC-scoped local validation and a leaner release gate
2. a separate code-context plane for coding-task grounding
3. an operator-truth inspect surface for projected, suppressed, held-back, and omitted context
4. style overlay v2 and writing/inspiration workflow work above the truth planes

## Local MCP Production Ops

The local Codex gateway also exposes production-host helpers for the live OpenClaw box.

Required env vars:

- `OPENCLAW_PROD_SSH_HOST`
- `OPENCLAW_PROD_SSH_USER`
- `OPENCLAW_PROD_SSH_PASSWORD`
- `OPENCLAW_PROD_RUNTIME_ROOT`
- `OPENCLAW_PROD_REPO_ROOT`
- `OPENCLAW_PROD_RUN_AS`

Useful tools:

- `openclaw_prod_status()`
  - checks production host, current branch, current commit, active `contextEngine`, gateway status, and the default runtime / repo roots
- `openclaw_prod_layout()`
  - returns a curated decomposition of the production OpenClaw runtime root versus the production repo root
  - useful when you need to quickly answer "this path is runtime state, workspace, story asset, recovery log, or source repo?"
- `openclaw_prod_tree(path?, max_depth?, include_files?)`
  - returns a directory tree for production paths
  - `path` supports `runtime`, `repo`, `runtime/<subpath>`, `repo/<subpath>`, or an absolute path
- `openclaw_prod_exec(command, workdir?, timeout_seconds?, run_as?)`
  - runs a shell command on the production host
  - default working directory is the OpenClaw repo root, so you do not need to manually `cd` first
