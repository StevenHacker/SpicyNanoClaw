# SpicyNanoClaw

`snc` is a hot-pluggable OpenClaw plugin for writing continuity, evidence-grounding, and long-horizon memory trust.

It is meant for the sessions where you do not want the thread to go soft halfway through: long-form drafting, chapter work, outline-to-prose runs, revision passes, and any workflow where the assistant needs to keep the brief in its teeth.

It is also designed not to fight ordinary OpenClaw assistant work. When you do not configure writing artifacts, SNC can stay in a more neutral continuity mode instead of framing every session like a drafting run.

## Fastest Install

If you already have the release package:

```bash
openclaw plugins install ./openclaw-snc-1.0.0.tgz
```

Then enable it:

```json5
plugins.slots.contextEngine = "snc"
```

That is the shortest path to a working SNC session.

In a normal OpenClaw host, the config usually lives at:

- `~/.openclaw/openclaw.json`

So the practical host-side flow is:

1. install the package
2. edit `~/.openclaw/openclaw.json`
3. set `plugins.slots.contextEngine = "snc"`
4. add SNC options under `plugins.entries.snc.config`
5. restart the OpenClaw gateway or app after config changes

Important:

- plugin config must live under `plugins.entries.snc.config`
- if you put `briefFile`, `ledgerFile`, `packetDir`, or `stateDir` anywhere else, SNC will not see them

If you want to control how strongly SNC leans into writing-specific framing, use:

- `specializationMode: "auto"`: default, writing-aware when writing artifacts are configured
- `specializationMode: "general"`: neutral continuity framing for normal development or daily assistant work
- `specializationMode: "writing"`: force writing-first framing

## OpenClaw Environment Checklist

Recommended host rollout:

1. start with only:
   - `stateDir`
   - `specializationMode: "auto"`
2. validate that the host sees the plugin:

```bash
openclaw plugins inspect snc --json
openclaw plugins list
```

3. validate the host config:

```bash
openclaw config validate --json
openclaw plugins doctor
```

4. only after that, add:
   - `briefFile`
   - `ledgerFile`
   - `packetDir`
   - optional hook targets

Rollback is ordinary OpenClaw rollback:

- remove or disable `plugins.slots.contextEngine = "snc"`
- or point the slot back to the previous context engine
- restart the OpenClaw host

## Recommended Base Config

If you want the minimal useful setup for real continuity, start here:

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
          specializationMode: "auto"
        },
      },
    },
  },
}
```

That is the recommended `v1.0.0` base profile:

- persistent continuity and durable-memory reuse through `stateDir`
- neutral assistant behavior by default through `specializationMode: "auto"`
- no hook-layer policy changes unless you explicitly opt in

By default, SNC isolates cross-session durable memory by agent-family when a `sessionKey` is present.
That means two different agents can share one `stateDir` without automatically sharing the same long-horizon memory catalog.
If you want to override that, set:

```json5
memoryNamespace: "shared-writing"
```

Then add these when you want richer project-specific writing context:

- `briefFile`
- `ledgerFile`
- `packetDir`

If you also want SNC to actively steer prose away from "说明书感", enable the optional writing style overlay. It is separate from memory and only activates on `writing-prose` turns.

Built-in first-party profile ids:

- `mist-suspense`
- `streetwise-banter`
- `bustling-intrigue`
- `pressure-escalation`

If the session is mostly normal engineering or daily assistant work, set:

```json5
specializationMode: "general"
```

## Opt-In Hook Layer

Hooks are still optional.

Turn them on only when you want bounded transcript shaping, tool-result preview shaping, or worker lifecycle bookkeeping:

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

## Optional Writing Style Overlay

The style overlay is a writing-only surface layer:

- off for `general` assistant turns
- off for `evidence-grounding` turns by default
- on for `writing-prose` turns when a profile is configured or auto-selected
- never persisted into SNC durable memory or worker state

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

Pin a built-in profile:

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

This layer is for:

- prose vitality
- anti-report / anti-checklist / anti-review voice
- scene-first motion
- sensory anchoring
- dialogue texture

It is not allowed to override:

- current evidence
- contradiction suppression
- explicit user constraints
- anti-fabrication behavior

External profile rule:

- external profiles must be desensitized, not raw-source
- SNC only accepts external profiles with `safety_mode: "desensitized"`
- external profiles must provide `copyright_guardrails.operational_prompt_fields` and `research_only_fields`
- SNC only projects the external fields that the profile explicitly marks as safe for live prompt use

## What v1.0.0 Actually Does

- installs as a normal OpenClaw plugin
- activates through `plugins.slots.contextEngine`
- injects brief, ledger, packet, and continuity context into every turn
- shifts into evidence-first posture when the user explicitly asks to read, inspect, compare, quote, or list from current materials
- persists per-session writing state when `stateDir` is configured
- harvests, prunes, and projects plugin-owned durable memory with bounded diagnostics and bounded explainability
- keeps cross-session durable memory agent-scoped by default, instead of treating one shared `stateDir` as one flat memory pool
- suppresses contradicted durable cues when fresher current evidence clearly wins
- performs bounded transcript shaping through optional hooks
- performs bounded tool-result replacement previews through optional hooks
- folds worker launch results, follow-up observations, and completion/fallback worker state back into SNC-owned memory
- projects bounded worker launch, worker diagnostics, and worker controller sections when worker state exists
- supports `specializationMode: auto | general | writing` so SNC does not force writing framing onto every session
- hardens writing-output discipline so direct drafting turns keep process chatter and report-mode language out of the draft
- adds an optional writing-only style overlay with built-in archetypes and external profile loading
- strengthens multilingual continuity by using Unicode-aware dedupe and correction-aware carry-forward
- keeps host compaction and host worker execution ownership in OpenClaw

## Install Options

Release package:

```bash
openclaw plugins install ./openclaw-snc-1.0.0.tgz
```

Local linked source inside an OpenClaw workspace:

```bash
openclaw plugins install -l ./extensions/snc
```

Future registry install path:

```bash
openclaw plugins install openclaw-snc
```

## Richer Writing Config

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
          style: {
            enabled: true,
            mode: "auto",
            intensity: 0.72,
            strictness: 0.82,
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
        },
      },
    },
  },
}
```

Restart the gateway after changing plugin config.

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
- leave `memoryNamespace` unset unless you intentionally want multiple agent families to share one durable-memory pool
- if you want a neutral assistant profile instead of writing-first behavior, switch `specializationMode` to `"auto"` or `"general"`

## Why It Feels Better

SNC is not trying to replace OpenClaw.

It is trying to help OpenClaw hold narrative shape longer:

- less drift
- less recap sludge
- clearer active constraints
- cleaner planning traces
- better fold-back from helper workers

## Explicit Defers

v1.0.0 does not claim:

- host memory-slot ownership
- public MCP export for SNC helper tools
- a general worker scheduler
- persistent/session-mode worker orchestration
- guaranteed late reply delivery after every accepted follow-up
- resume from the exact point of interruption
- deep runtime rewrites of OpenClaw

## Design Intent

SNC is a bounded specialization layer, not a replacement host.

Its design intent is:

1. current evidence stays above memory
2. same-session continuity stays above cross-session durable memory
3. creative style stays above truth planes, not inside them
4. OpenClaw keeps host ownership wherever the host boundary should remain authoritative

That is why:

- style overlay is writing-only
- external profiles must be desensitized
- durable memory is bounded and suppressible
- operator truth matters as much as raw capability

## Validation

Inside the engineering workspace, the release gate is:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate_snc_v1.ps1
```

The clean-host delivery rehearsal gate is:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate_snc_clean_host_rehearsal.ps1
```

The v1.0.0 gate checks:

- focused SNC validation
- dispatcher validation
- package artifact build
- clean-host install rehearsal

The clean-host gate checks:

- packaged install into a clean OpenClaw host mirror
- recommended base config write + schema validation
- `plugins inspect` / `plugins list` verification for the installed SNC package

These PowerShell scripts are repository-only engineering helpers.
They are not bundled into the installed plugin package itself.

If you are validating SNC after installation in a normal OpenClaw host, use:

```bash
openclaw config validate --json
openclaw plugins inspect snc --json
openclaw plugins doctor
```

## Post-v1 TODO

The next bounded implementation wave is:

1. faster SNC-scoped local validation
2. a separate code-context plane for coding-task grounding
3. an operator-truth inspect surface
4. style overlay v2 and bounded writing/inspiration workflow work

This should target `v1.1.0`, not another milestone-style public version line.
