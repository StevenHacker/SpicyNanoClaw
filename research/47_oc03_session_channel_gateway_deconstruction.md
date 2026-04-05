# OC-03 Session / Channel / Gateway Fabric

## Purpose

This packet deconstructs the OpenClaw subsystem that turns an inbound surface event into canonical session identity and then exposes that identity back through gateway-facing workflow and ops surfaces.

For SNC, this domain matters because it answers one hard question:

- what host-owned identity should SNC trust when it partitions continuity state

The answer is not "invent a parallel SNC session model."
The answer is "consume host-resolved identity after routing and binding."

## Main Subsystem Split

### `src/routing`

- Host-owned route fabric.
- Resolves `channel + account + peer + group/team/roles` into:
  - `agentId`
  - `sessionKey`
  - `mainSessionKey`
  - `lastRoutePolicy`

Key files:

- `data/external/openclaw-v2026.4.1/src/routing/resolve-route.ts`
- `data/external/openclaw-v2026.4.1/src/routing/session-key.ts`

### `src/sessions`

- Canonical identity grammar and ambiguity policy.
- Encodes thread parent/child semantics and decides which persisted store key wins when duplicate `sessionId` matches exist.

Key files:

- `data/external/openclaw-v2026.4.1/src/sessions/session-key-utils.ts`
- `data/external/openclaw-v2026.4.1/src/sessions/session-id-resolution.ts`

### `src/channels`

- External-conversation binding bridge.
- Resolves provider-specific conversation/thread identity into host-facing binding context.
- Contains thread-binding policy, channel registry normalization, and inbound session metadata upkeep.

Key files:

- `data/external/openclaw-v2026.4.1/src/channels/conversation-binding-context.ts`
- `data/external/openclaw-v2026.4.1/src/channels/registry.ts`
- `data/external/openclaw-v2026.4.1/src/channels/thread-bindings-policy.ts`
- `data/external/openclaw-v2026.4.1/src/channels/session.ts`

### `src/gateway`

- Host control plane over the already-defined identity fabric.
- Handles startup, channel runtime lifecycle, run-to-session recovery, session inspection/history, chat event buffering, and operator APIs.

Key files:

- `data/external/openclaw-v2026.4.1/src/gateway/server.ts`
- `data/external/openclaw-v2026.4.1/src/gateway/server.impl.ts`
- `data/external/openclaw-v2026.4.1/src/gateway/server-channels.ts`
- `data/external/openclaw-v2026.4.1/src/gateway/server-session-key.ts`
- `data/external/openclaw-v2026.4.1/src/gateway/session-utils.ts`
- `data/external/openclaw-v2026.4.1/src/gateway/server-chat.ts`

### `src/chat`

- Peripheral for this packet.
- Useful utilities exist here, but it is not the canonical session/channel/gateway seam for SNC v1.

Representative file:

- `data/external/openclaw-v2026.4.1/src/chat/tool-content.ts`

## Verified Read

### 1. Route resolution is the canonical host identity seam

`resolve-route.ts` is the real route fabric, not a convenience helper.
It evaluates bindings, caches route outcomes, builds both `sessionKey` and `mainSessionKey`, and decides whether inbound last-route updates should land on the main session or the specific session branch.

This means SNC should trust host route outputs, not reconstruct them from raw channel metadata later.

Primary evidence:

- `data/external/openclaw-v2026.4.1/src/routing/resolve-route.ts`

### 2. Session identity grammar is explicit and structural

`session-key.ts` plus `session-key-utils.ts` define the shared identity grammar.
Thread child/parent relationships are encoded into session key shape and parsing logic, rather than inferred ad hoc at higher layers.

This is important because SNC continuity keys should compose with host identity rather than trying to flatten threads into a separate model.

Primary evidence:

- `data/external/openclaw-v2026.4.1/src/routing/session-key.ts`
- `data/external/openclaw-v2026.4.1/src/sessions/session-key-utils.ts`

### 3. Duplicate-session ambiguity is already a solved host problem

`session-id-resolution.ts` proves OpenClaw already has an explicit ambiguity policy when multiple store entries map to the same `sessionId`.
Structural match is preferred; otherwise freshness wins.

SNC should not add a second ambiguity rule at the plugin layer unless a proven host defect blocks continuity.

Primary evidence:

- `data/external/openclaw-v2026.4.1/src/sessions/session-id-resolution.ts`

### 4. Conversation binding is already plugin-aware

`conversation-binding-context.ts` first asks provider-side binding hooks and provider threading hooks, then falls back to target parsing.
That makes it the safest existing place to align external conversation identity with SNC continuity needs across channels and threaded providers.

Primary evidence:

- `data/external/openclaw-v2026.4.1/src/channels/conversation-binding-context.ts`

### 5. Channel identity normalization is registry-backed

`registry.ts` shows channel identity can be normalized and aliased through the active plugin registry.
That means external and bundled channel plugins can influence channel identity normalization without editing route core.

Primary evidence:

- `data/external/openclaw-v2026.4.1/src/channels/registry.ts`

### 6. Thread continuity is constrained by host policy, not only by SNC intent

`thread-bindings-policy.ts` owns placement, timeout, max-age, and spawn policy for thread bindings, including channel-specific native-thread assumptions.

So even if SNC wants stronger continuity on threaded platforms, it must respect host thread-binding expiry/spawn rules instead of building a parallel thread model.

Primary evidence:

- `data/external/openclaw-v2026.4.1/src/channels/thread-bindings-policy.ts`

### 7. Inbound session metadata writes already have a host path

`channels/session.ts` records inbound session metadata and can update last-route state, but it does so through the inbound-session runtime layer instead of inventing a parallel persistence channel.

SNC should observe or consume this state, not fork the write path.

Primary evidence:

- `data/external/openclaw-v2026.4.1/src/channels/session.ts`

### 8. Gateway recovery surfaces consume identity; they do not define it

`server-session-key.ts` is a recovery bridge, not a source of truth.
It resolves `runId -> sessionKey` via:

- live run context
- bounded cache
- combined gateway session store fallback

`session-utils.ts` and `server-chat.ts` mostly provide workflow/operator surfaces such as session listing, transcript reads, previews, buffering, and lifecycle event persistence.

These are valuable SNC wrap points for observability and author tooling, but not the right place to redefine canonical continuity identity.

Primary evidence:

- `data/external/openclaw-v2026.4.1/src/gateway/server-session-key.ts`
- `data/external/openclaw-v2026.4.1/src/gateway/session-utils.ts`
- `data/external/openclaw-v2026.4.1/src/gateway/server-chat.ts`

### 9. Gateway channel lifecycle is host ops fabric

`server-channels.ts` handles channel runtime start/stop/restart, manual-stop state, and health monitor behavior.
This is operational lifecycle code, not an SNC continuity seam.

Primary evidence:

- `data/external/openclaw-v2026.4.1/src/gateway/server-channels.ts`

## SNC Modification Guidance

### Safe read

Use host-resolved identity as SNC partition input:

- `sessionKey`
- `mainSessionKey`
- `conversationId`
- `parentConversationId`

Do this after route resolution and conversation binding, not before.

### Safe extension zones

#### 1. Provider-aware conversation binding

Best hot-pluggable seam in this packet:

- `data/external/openclaw-v2026.4.1/src/channels/conversation-binding-context.ts`

This is where SNC can align provider-side conversation/thread behavior with continuity needs without editing host route core.

#### 2. Gateway/session observability surfaces

Wrap-preferred surfaces:

- `data/external/openclaw-v2026.4.1/src/gateway/session-utils.ts`
- `data/external/openclaw-v2026.4.1/src/gateway/server-chat.ts`

These are good places for:

- continuity diagnostics
- author dashboards
- session inspection overlays
- continuity debugging tools

#### 3. Registry-backed channel normalization

Consumer seam, not hardcode seam:

- `data/external/openclaw-v2026.4.1/src/channels/registry.ts`

If SNC later needs channel-sensitive continuity handling, prefer normalized channel identity from the registry rather than custom string rules.

## Unsafe / Internal-Edit-Only Zones

Only consider internal edits here if a host defect is clearly proven and hot-pluggable methods cannot solve it.

### High blast radius

- `data/external/openclaw-v2026.4.1/src/routing/resolve-route.ts`
- `data/external/openclaw-v2026.4.1/src/routing/session-key.ts`
- `data/external/openclaw-v2026.4.1/src/sessions/session-key-utils.ts`
- `data/external/openclaw-v2026.4.1/src/sessions/session-id-resolution.ts`

Why:

- canonical routing and identity grammar
- shared across host runtime
- silent misbinding risk if modified incorrectly

### Host recovery / control plane internals

- `data/external/openclaw-v2026.4.1/src/gateway/server-session-key.ts`
- `data/external/openclaw-v2026.4.1/src/gateway/server-channels.ts`
- `data/external/openclaw-v2026.4.1/src/gateway/server.impl.ts`
- `data/external/openclaw-v2026.4.1/src/gateway/server-methods.ts`

Why:

- cache/store recovery behavior
- restart/manual-stop/health semantics
- broad control-plane blast radius

## Classification Summary

- `Hot-pluggable seam`: `src/channels/conversation-binding-context.ts`
- `Hot-pluggable seam`: `src/channels/registry.ts` as a consumer seam for normalized channel identity
- `Host-owned seam`: `src/routing/resolve-route.ts`
- `Host-owned seam`: `src/routing/session-key.ts`
- `Host-owned seam`: `src/sessions/session-key-utils.ts`
- `Host-owned seam`: `src/channels/session.ts`
- `Wrap preferred`: `src/gateway/session-utils.ts`
- `Wrap preferred`: `src/gateway/server-chat.ts`
- `Internal edit only if proven necessary`: `src/sessions/session-id-resolution.ts`, `src/gateway/server-session-key.ts`, `src/gateway/server-channels.ts`, `src/gateway/server.impl.ts`
- `Out of SNC v1 scope`: `src/chat/tool-content.ts`, most of `src/gateway/server-methods.ts`

## SNC Takeaway

For this whole domain, the strongest rule is simple:

- SNC should consume host identity after routing and binding
- SNC should wrap gateway/session visibility surfaces when it needs tooling
- SNC should not create a second session model unless a proven host bug forces it
