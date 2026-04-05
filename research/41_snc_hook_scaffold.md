# SNC Hook Scaffold

## Current Decision

SNC now exposes a disabled-by-default hook scaffold.

The scaffold does not change default runtime behavior.
It only registers hook handlers when the config explicitly enables them.

## Current Hook Surface

The first bounded hook targets are:

- `before_message_write`
- `tool_result_persist`
- `session_end`

These are the safest early seams for later transcript shaping and sidecar upkeep.

## Current Shape

Current working-host implementation:

- `extensions/snc/src/config.ts`
  - adds a `hooks` config block
  - resolves `enabled` plus selected targets

- `extensions/snc/src/hook-scaffold.ts`
  - installs placeholder no-op hooks only when enabled

- `extensions/snc/index.ts`
  - wires the scaffold into plugin registration

## Why This Is Safe

1. Default behavior remains unchanged.
   - if `hooks.enabled` is absent or false, nothing is registered

2. The scaffold is intentionally inert.
   - handlers are no-op placeholders

3. The scope is bounded.
   - only three early hooks are exposed
   - nothing touches `engine.ts` or `session-state.ts`

## Next Hook Questions

1. Should `before_message_write` become a message-shaping adapter or stay a hygiene-only gate?
2. Should `session_end` own sidecar flushes, or should it remain a thin signal hook?
3. Do we want a separate opt-in for transcript shaping vs sidecar upkeep, or keep one combined hook gate for v1?
