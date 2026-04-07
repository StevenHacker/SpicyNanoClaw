# SpicyNanoClaw (plugin)

`snc` is a writing-oriented OpenClaw context-engine plugin.

Current scope:

- installs as a normal OpenClaw plugin
- activates through `plugins.slots.contextEngine`
- injects SNC writing context from configured files on every turn
- persists a structured per-session state store when `stateDir` is configured
- extracts a lightweight story ledger and chapter state in `afterTurn()`
- delegates compaction back to the OpenClaw runtime

## Install

Published package, using the current placeholder npm spec:

```bash
openclaw plugins install openclaw-snc
```

Local development checkout:

```bash
openclaw plugins install -l ./extensions/snc
```

## Enable

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
          sessionPatterns: ["^agent:(rosyreviewer|gemwriter|nukelly|alicereviewer):"],
          maxSectionBytes: 24576,
        },
      },
    },
  },
}
```

Restart the gateway after changing plugin config.

## Delivery Model

SNC is packaged as a plugin rather than a fork so existing OpenClaw users can:

- install it with `openclaw plugins install`
- switch back to `legacy` by changing one slot value
- upgrade SNC independently from the OpenClaw core

Rename the package before publishing if you want a scoped npm name.

## Next Milestones

- tighten the story-ledger extraction heuristics and schema
- add `maintain()` logic for safe transcript cleanup
- validate the plugin on a clean OpenClaw checkout
