# SpicyNanoClaw

SpicyNanoClaw is OpenClaw with a better memory for writing.

It is a hot-pluggable `contextEngine` plugin that helps long sessions keep their brief, preserve active constraints, carry forward the right plans, fold back helper-worker results, and trim planning sludge before it takes over the thread.

If you already like OpenClaw but want a version that holds shape better across many turns, this is the one to try.

## 30-Second Start

Host baseline:

- `OpenClaw >= 2026.4.1`

If you downloaded or cloned this repo, the shortest try-today install is:

```bash
openclaw plugins install ./data/releases/snc/openclaw-snc-0.1.0.tgz
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

## If You Want The Good Writing Path

Once the basic install works, add your writing artifacts:

- `briefFile`
- `ledgerFile`
- `packetDir`

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

## What Milestone 1 Already Gives You

- writing-oriented context assembly through the OpenClaw `contextEngine` slot
- per-session state for directives, plans, focus, constraints, and continuity notes
- plugin-owned durable-memory harvest and bounded recall projection
- bounded transcript shaping for planning and meta chatter
- bounded tool-result preview replacement
- bounded worker-result fold-back and worker lifecycle bookkeeping
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

## What Milestone 1 Does Not Pretend To Be

- not a host memory-slot takeover
- not a public MCP surface for SNC helper tools yet
- not a general worker scheduler
- not persistent worker-session orchestration
- not a hard fork of OpenClaw internals

This is a bounded first release with a clear writing focus.

## Validation

The current milestone gate is:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate_snc_milestone1.ps1
```

Current release-candidate status:

- plugin test surface: `59/59`
- package dry-run: passed
- workspace typecheck: passed
- built package: `data/releases/snc/openclaw-snc-0.1.0.tgz`

## Repo Pointers

If you are here as an OpenClaw user, these are the two useful paths:

- installable package: [`data/releases/snc/openclaw-snc-0.1.0.tgz`](./data/releases/snc/openclaw-snc-0.1.0.tgz)
- plugin source: [`data/working/openclaw-v2026.4.1-snc-v1/extensions/snc`](./data/working/openclaw-v2026.4.1-snc-v1/extensions/snc)
