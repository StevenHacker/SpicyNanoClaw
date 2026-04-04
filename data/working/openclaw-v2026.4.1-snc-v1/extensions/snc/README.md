# SpicyNanoClaw

`snc` is a hot-pluggable OpenClaw plugin for writing continuity.

It is meant for the sessions where you do not want the thread to go soft halfway through: long-form drafting, chapter work, outline-to-prose runs, revision passes, and any workflow where the assistant needs to keep the brief in its teeth.

## Fastest Install

If you already have the release-candidate package:

```bash
openclaw plugins install ./openclaw-snc-0.1.0.tgz
```

Then enable it:

```json5
plugins.slots.contextEngine = "snc"
```

That is the shortest path to a working SNC session.

## Good First Config

If you want the minimal useful setup, start here:

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
        },
      },
    },
  },
}
```

Then add these when you want richer project-specific writing context:

- `briefFile`
- `ledgerFile`
- `packetDir`

## What Milestone 1 Actually Does

- installs as a normal OpenClaw plugin
- activates through `plugins.slots.contextEngine`
- injects brief, ledger, and packet context into every turn
- persists per-session writing state when `stateDir` is configured
- harvests and projects plugin-owned durable memory
- performs bounded transcript shaping through optional hooks
- performs bounded tool-result replacement previews through optional hooks
- folds worker results back into SNC state and tracks worker lifecycle through optional hooks
- keeps host compaction and host worker execution ownership in OpenClaw

## Install Options

Release-candidate package:

```bash
openclaw plugins install ./openclaw-snc-0.1.0.tgz
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

Milestone 1 does not claim:

- host memory-slot ownership
- public MCP export for SNC helper tools
- a general worker scheduler
- persistent/session-mode worker orchestration
- deep runtime rewrites of OpenClaw

## Validation

Inside the engineering workspace, the milestone gate is:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate_snc_milestone1.ps1
```

That gate checks:

- SNC plugin test surface
- plugin package dry-run
- OpenClaw workspace typecheck with the required `8 GB` heap
