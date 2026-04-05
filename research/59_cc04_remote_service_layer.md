# CC-04 Remote / Server / Service Layer

## Purpose

This packet isolates the Claude Code surfaces that depend on remote session transport, backend services, upstream APIs, and product service architecture rather than on the local harness alone.

For SNC, this matters because some CC behaviors are only possible because Anthropic ships a broader service plane around the client. We need to separate reusable local ideas from service-only behavior.

## Main Entry Files

### CLI and remote entrypoints

- `data/external/claude-code-leeyeel-4b9d30f/src/entrypoints/cli.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/entrypoints/init.ts`

### Direct-connect and remote-session transport

- `data/external/claude-code-leeyeel-4b9d30f/src/server/createDirectConnectSession.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/server/directConnectManager.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/server/types.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/remote/RemoteSessionManager.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/remote/SessionsWebSocket.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/remote/remotePermissionBridge.ts`

### Upstream service adapters

- `data/external/claude-code-leeyeel-4b9d30f/src/services/api/client.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/api/claude.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/api/bootstrap.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/api/sessionIngress.ts`

### Product-shell remote setup

- `data/external/claude-code-leeyeel-4b9d30f/src/commands/remote-setup/remote-setup.tsx`

## Verified Read

### 1. The claim's `src/server/*` label is narrower than the code reality

The code current state shows that `src/server/*` is only a thin slice of the remote/service story. The real layer is spread across:

- `src/server/*` for direct-connect session bootstrap and WS manager types
- `src/remote/*` for live remote-session orchestration
- `src/services/api/*` for upstream service and persistence interactions

So if claim wording suggests a single compact "server layer," the code does not support that simplification.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/server/*`
- `data/external/claude-code-leeyeel-4b9d30f/src/remote/*`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/api/*`

### 2. CLI fast paths expose a true service/control plane

`entrypoints/cli.tsx` special-cases service-oriented modes before the ordinary interactive shell:

- `remote-control` / legacy `remote` / `sync` / `bridge`
- `daemon`
- `environment-runner`
- `self-hosted-runner`

It also checks policy before bridge mode via `isPolicyAllowed('allow_remote_control')`.

This means CC product behavior includes a control plane outside the main local REPL.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/entrypoints/cli.tsx`

### 3. Direct-connect is a transport bootstrap plus WS manager pair

`createDirectConnectSession.ts` POSTs to `${serverUrl}/sessions`, validates the response, and returns a transport config with:

- `sessionId`
- `wsUrl`
- optional `authToken`

It can also request `dangerously_skip_permissions`.

`DirectConnectSessionManager` then owns the live socket side:

- inbound message handling
- permission request callbacks
- permission response sending
- interrupt sending
- disconnect lifecycle

This is a clean local transport abstraction, even though it assumes a cooperating remote service contract.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/server/createDirectConnectSession.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/server/directConnectManager.ts`

### 4. `RemoteSessionManager` is the higher-level session bridge

`RemoteSessionManager.ts` sits above raw transport details and coordinates remote session behavior such as:

- websocket-backed remote session communication
- permission response forwarding
- request cancellation and interrupt paths
- event forwarding back to the remote session

This is closer to a session-control adapter than to a model-runtime donor.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/remote/RemoteSessionManager.ts`

### 5. `SessionsWebSocket` and `remotePermissionBridge` adapt remote protocol into local CLI expectations

The remote transport is not just "open a socket." Two adjacent files make the bridge product-safe:

- `SessionsWebSocket.ts` accepts any inbound message with a string `type`, forwards interpretation to downstream handlers, authenticates via headers, and implements reconnect logic with retry limits and permanent-close handling
- `remotePermissionBridge.ts` creates synthetic assistant/tool-use messages for remote permission requests because the local CLI permission UI expects local assistant-message shape, not raw remote control payloads

This is a strong donor pattern for SNC: keep protocol adaptation outside the core runtime, and explicitly bridge remote control semantics into local operator-facing approval flows.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/remote/SessionsWebSocket.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/remote/remotePermissionBridge.ts`

### 6. `services/api/client.ts` is a provider/auth adapter, not a generic runtime primitive

`getAnthropicClient(...)` conditionally builds clients for:

- first-party Anthropic API
- AWS Bedrock
- Azure Foundry
- Vertex AI

It also performs auth refresh and provider-specific header/environment handling.

This is valuable as an adapter-boundary example, but weak as a direct donor because it is tightly coupled to Anthropic SDKs, provider env contracts, and Claude Code product headers.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/services/api/client.ts`

### 7. `services/api/claude.ts` is request-shaping infrastructure with strong provider coupling

`claude.ts` is not just "call the model." It handles:

- `cache_control` placement
- task budget shaping
- streaming to non-streaming fallback
- retry/fallback behavior
- provider-specific request assembly

There are useful architectural ideas here, but the concrete implementation is heavily tied to Anthropic request semantics and prompt-cache behavior.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/services/api/claude.ts`

### 8. `sessionIngress.ts` is a real durability/reliability layer

`sessionIngress.ts` is especially important because it handles remote transcript durability rather than cosmetic API calls. Verified mechanics include:

- per-session sequential append wrappers to avoid concurrent writes
- optimistic concurrency via `Last-Uuid`
- recovery from `409` conflicts by adopting server state
- bounded retry with backoff
- session log hydration and teleport-event retrieval

This is one of the stronger local donor-pattern areas in the packet, even though it still assumes a backing service.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/services/api/sessionIngress.ts`

### 9. `bootstrap.ts` and adjacent product APIs are service-only productization layers

`bootstrap.ts` fetches server bootstrap data and persists it into disk config cache. The wider `src/services/api/*` tree also includes usage, credits, Grove/privacy, quota, referral, and other product APIs.

These are important for understanding why CC feels integrated, but they are not strong donors for SNC runtime architecture.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/services/api/bootstrap.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/api/*`

### 10. `remote-setup` is product-shell onboarding, not a core remote donor

The remote setup command belongs to the service-backed product shell around CC. It should be read as onboarding/product enablement rather than as a reusable remote-runtime primitive.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/commands/remote-setup/remote-setup.tsx`

## Remote / Service Atlas

### Local transport and control adapters

- `createDirectConnectSession.ts`
- `directConnectManager.ts`
- `RemoteSessionManager.ts`
- `SessionsWebSocket.ts`
- `remotePermissionBridge.ts`

These are the closest things to portable remote-control patterns.

They already show the right separation for SNC:

- transport reliability and reconnect handling
- permission-payload adaptation for local approval UX
- session-control logic above raw socket mechanics

### Upstream model/provider adapters

- `services/api/client.ts`
- `services/api/claude.ts`

These abstract multiple providers, but the abstractions are still shaped around Anthropic-first product requirements.

### Session durability and transcript sync

- `services/api/sessionIngress.ts`

This is the strongest operational reliability surface in the packet.

### Product bootstrap and account/product APIs

- `services/api/bootstrap.ts`
- quota, usage, Grove/privacy, referral, overage, review-related APIs under `services/api/*`

These are mostly productization surfaces, not SNC donors.

### Control-plane process entrypoints

- `remote-control`
- `daemon`
- `environment-runner`
- `self-hosted-runner`

These define product deployment and control modes outside the ordinary local REPL.

## Service-Dependency Note

The current code supports a clear split.

### Behaviors that mostly depend on local design plus a thin service contract

- direct-connect session creation plus websocket manager
- remote permission handoff
- interrupt/cancel forwarding
- sequential remote transcript append with conflict recovery

These are plausible donor-pattern areas for SNC.

### Behaviors that depend heavily on Anthropic product/service architecture

- bootstrap data
- Grove/privacy web settings
- usage and quota APIs
- credits/referral/overage flows
- provider-specific auth and prompt-cache semantics
- remote setup onboarding

These should not be treated as portable SNC architecture.

## Donor-Risk Note

### Stronger donor patterns

- separate remote transport bootstrap from live session manager
- keep permission bridging explicit rather than hidden in the runtime loop
- serialize remote transcript writes per session
- recover from append conflicts by adopting remote head state instead of blindly failing

### Medium-risk donor patterns

- provider/client adapter boundaries
- runner and daemon split for non-interactive execution modes

These are useful patterns, but the concrete CC code is entwined with product flags and provider assumptions.

### High-risk or service-only surfaces

- anything that depends on Anthropic account/product APIs
- cache-control specifics in `claude.ts`
- onboarding and setup commands tied to Claude web or org entitlements

## SNC Relevance

This packet is important mostly as a warning label and a pattern source.

Warning:

- some impressive CC capabilities are enabled by service architecture that SNC does not automatically inherit

Pattern source:

- remote transport/session adapters can stay outside the core runtime
- transcript durability deserves its own reliability layer
- permissions for remote execution should be bridged explicitly, not smuggled through ad hoc tool logic

For SNC, that points toward optional adapters and service modules rather than deep host rewrites.

## Modification Guidance

### Wrap

- build SNC remote or daemon features behind explicit transport/session adapters
- keep remote transcript durability in a separate module with clear ownership
- isolate provider-specific client code behind one adapter boundary

### Extend

- borrow the sequential append plus conflict-recovery pattern for any SNC remote session log
- borrow explicit interrupt and permission-response channels for remote worker control

### Defer

- first-party product bootstrap
- account/quota/privacy/product APIs
- remote onboarding/product enablement flows

### Do-not-touch

- do not make SNC core depend on Anthropic-specific service contracts
- do not port `claude.ts` literally into SNC without first separating the useful harness ideas from provider-specific request rules
- do not assume `src/server/*` alone represents the real CC remote/service architecture

## Still Unverified

- exact protocol details for every `remote/*` event type across all product modes
- how much of the bridge/daemon runner contract is stable versus feature-flag controlled
- which service APIs are hard requirements for specific CC product modes versus optional enrichments
