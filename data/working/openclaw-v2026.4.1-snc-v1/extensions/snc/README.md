# SpicyNanoClaw

`snc` is a hot-pluggable OpenClaw plugin for writing continuity, evidence-grounding, and long-horizon memory trust.

It is meant for the sessions where you do not want the thread to go soft halfway through: long-form drafting, chapter work, outline-to-prose runs, revision passes, and any workflow where the assistant needs to keep the brief in its teeth.

It is also designed not to fight ordinary OpenClaw assistant work. When you do not configure writing artifacts, SNC can stay in a more neutral continuity mode instead of framing every session like a drafting run.

## Fastest Install

If you already have the release-candidate package:

```bash
openclaw plugins install ./openclaw-snc-0.2.0.tgz
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

That is the recommended `Milestone 3` base profile:

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

## What Milestone 3 Actually Does

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
- strengthens multilingual continuity by using Unicode-aware dedupe and correction-aware carry-forward
- keeps host compaction and host worker execution ownership in OpenClaw

## Install Options

Release-candidate package:

```bash
openclaw plugins install ./openclaw-snc-0.2.0.tgz
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

## Why It Feels Better

SNC is not trying to replace OpenClaw.

It is trying to help OpenClaw hold narrative shape longer:

- less drift
- less recap sludge
- clearer active constraints
- cleaner planning traces
- better fold-back from helper workers

## Explicit Defers

Milestone 3 does not claim:

- host memory-slot ownership
- public MCP export for SNC helper tools
- a general worker scheduler
- persistent/session-mode worker orchestration
- guaranteed late reply delivery after every accepted follow-up
- resume from the exact point of interruption
- deep runtime rewrites of OpenClaw

## Validation

Inside the engineering workspace, the milestone gate is:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate_snc_milestone3.ps1
```

The clean-host delivery rehearsal gate is:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate_snc_clean_host_rehearsal.ps1
```

The milestone gate checks:

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
