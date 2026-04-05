# Task Board

Last updated: 2026-04-01

## Doing

1. Deep dive `bridge/bridgeMain.ts`
2. Map bridge concepts onto `openclaw-gateway`

## Next

1. Deep dive `permissions.ts`
2. Deep dive `services/api/claude.ts`
3. Distill plugin vs core-runtime boundaries for `openclaw`

## Later

1. Design the minimum `openclaw` enhancement plugin API
2. Design an `openclaw` session runtime core
3. Design an `openclaw` gateway event protocol

## Blocked

1. Server-side `openclaw` source/config reinspection is currently blocked
Reason:
- the newest SSH password provided by the user did not authenticate successfully in the last attempt

## Notes

The core strategy remains:

- Use the Claude Code source mirror to understand product-grade harness structure
- Use `claw-code` to understand a lighter research-style rewrite
- Only bring back the parts that are truly compatible with `openclaw`
