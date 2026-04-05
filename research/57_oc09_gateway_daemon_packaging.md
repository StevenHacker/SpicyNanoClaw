# OC-09 Gateway / Daemon / Packaging Surface

## 1. Daemon / Gateway Packaging Map

- `package.json` is the top-level distribution contract: it exposes `openclaw` via `openclaw.mjs`, ships the built runtime in `dist/`, and declares the runtime and packaging scripts that bootstrap the app.
- `openclaw.mjs` is the real launcher entrypoint. It enforces the Node floor, applies the warning filter, and then imports `dist/entry.js` or `dist/entry.mjs`.
- `scripts/run-node.mjs` is the developer and service bootstrapper. It checks whether `dist/` is stale, rebuilds if needed, writes build stamps, syncs runtime artifacts, and then launches `openclaw.mjs`.
- `src/gateway/boot.ts` is a local boot helper, not a network service. It reads `BOOT.md`, builds a one-shot prompt, runs an agent turn, and restores the main session mapping afterward.
- `src/gateway/server-runtime-state.ts` is the gateway runtime assembly point. It resolves bind hosts, creates HTTP servers, wires the WebSocket server, attaches plugin and hook handlers, and prepares readiness and chat state.
- `src/gateway/server-http.ts` is the request multiplexer. It decides which surface handles a request and keeps the builtin routes ordered ahead of plugin routes and control UI fallback.
- `src/gateway/server/http-listen.ts` is the bind/retry shim. It retries `EADDRINUSE` briefly and turns bind failures into gateway-specific errors.
- `src/gateway/server-startup-log.ts` is the operator-facing startup summary. It prints the model, listen endpoints, log file, Nix mode note, and dangerous-flag warnings.
- `src/daemon/service.ts` is the cross-platform service manager wrapper. It chooses LaunchAgent, systemd user service, or Scheduled Task support based on platform.
- `src/daemon/node-service.ts` is a thin node-host wrapper over the gateway service. It re-labels the same service machinery for the node host and adjusts environment markers and log prefix.
- `src/daemon/launchd.ts`, `src/daemon/systemd.ts`, and `src/daemon/schtasks.ts` are the platform-specific install/start/stop/restart implementations.
- `src/daemon/service-env.ts` builds the service environment. It injects state/config paths, temp dir, proxy settings, CA bundle settings, PATH trimming, and service markers.
- `Dockerfile`, `docker-compose.yml`, `fly.toml`, and `render.yaml` are the main packaging manifests. They define the runtime image, network exposure, port mapping, health checks, and platform-specific defaults.

## 2. Remote Control / Service Exposure Note

- The gateway is a single multiplexed control plane: one listener carries HTTP, WebSocket, and gateway-adjacent control surfaces.
- `src/config/types.gateway.ts` describes the default shape as a single port with a default loopback bind. `src/gateway/net.ts` expands that into `loopback`, `lan`, `tailnet`, `auto`, and `custom` bind modes.
- `src/gateway/server-http.ts` exposes the important HTTP surfaces in one place: hooks, OpenAI-compatible chat completions, embeddings, `/tools/invoke`, session kill/history, Slack, optional OpenResponses/OpenAI endpoints, canvas, plugin HTTP routes, control UI, and health/readiness probes.
- `src/gateway/server-runtime-state.ts` attaches the WebSocket upgrade handler to the same HTTP server, so the HTTP and WS control planes are intentionally co-located.
- `src/gateway/control-ui.ts` is a full HTTP surface, not a static asset dump. It serves the control UI, bootstrap config, avatars, and security headers from the same gateway listener.
- `src/gateway/server/http-auth.ts` shows that different surfaces have different trust rules. Canvas requests can be authorized by bearer token or by an already-authorized node client; plugin routes may require gateway auth before handler dispatch.
- `src/gateway/server/hooks.ts` has its own hook token, request-body limits, idempotency/replay cache, and rate limiting. It is a separate exposure plane from the normal operator WebSocket.
- `src/gateway/client.ts` and `src/gateway/call.ts` are the remote client side of the same control plane. They refuse plaintext `ws://` to non-loopback targets by default, require explicit credentials for URL overrides, and support TLS fingerprint pinning for `wss://`.
- `src/gateway/server-startup-log.ts` and `src/gateway/server-runtime-state.ts` both warn when the bind host is non-loopback. The code treats non-loopback exposure as an explicit security decision, not a neutral default.

## 3. Deployment Constraints

- The packaging story is split across local CLI bootstrap, desktop service managers, and container/PaaS deployment recipes. There is no single universal launch path.
- The default gateway bind is loopback-oriented. Moving to `lan` or other non-loopback modes is a conscious exposure step and should be paired with auth.
- `Dockerfile` defaults to a loopback-bound gateway, but it also ships a health check on `/healthz` and a `gateway --allow-unconfigured` command. `docker-compose.yml` overrides that with `--bind lan` and host port mappings.
- `fly.toml` runs the gateway on port `3000`, forces HTTPS, and keeps at least one machine warm. `render.yaml` uses `OPENCLAW_GATEWAY_PORT=8080` and auto-generates a gateway token.
- `src/daemon/launchd.ts` makes it clear that macOS LaunchAgents require a logged-in GUI session. Headless deployments need a custom LaunchDaemon, which is explicitly not shipped here.
- `src/daemon/systemd.ts` installs a user service, not a system service. It depends on `systemctl --user`, may need user-bus fallback handling, and can fail if the user session is unavailable.
- `src/daemon/schtasks.ts` prefers Scheduled Tasks on Windows, but it can fall back to a Startup-folder launcher when task registration is blocked. That fallback is a convenience path, not a hardened service manager.
- `src/daemon/service-env.ts` shows that service startup depends on state/config directories, temp dir, PATH shaping, and CA bundle injection. Deployments that omit those values will get a different runtime than the interactive shell.
- `openclaw.mjs` and `package.json` do not advertise exactly the same Node floor. The launcher self-check is slightly looser than the package manifest, so release packaging should follow the stricter manifest unless that discrepancy is intentionally resolved later.
- `src/gateway/boot.ts` is workspace-local automation. It should be treated as an operator-side boot hook, not as part of the externally exposed control plane.

## 4. SNC Relevance

- This packet is about deployment and control-plane surfaces, so its value to SNC is mostly in how the host can be packaged and exposed safely.
- SNC should prefer these seams when it needs deployment behavior, startup orchestration, or service wiring. It should not start by rewriting host service managers.
- The strongest SNC-adjacent seam is not session identity or channel routing; it is the service wrapper layer that decides what gets exposed, where it listens, and how it is launched.
- The packaging layer also gives SNC a practical distribution path: keep the host stable, ship SNC as a bounded addition, and let platform-specific service wrappers carry the deployment differences.

## 5. Modification Guidance

- `Hot-pluggable seam`: Docker/Fly/Render env values, default port/bind choices, `allow-unconfigured` packaging flags, control UI enablement, and the service env wrapper that injects paths and CA settings.
- `Host-owned seam`: `src/gateway/server-runtime-state.ts`, `src/gateway/server-http.ts`, `src/gateway/server/http-listen.ts`, `src/daemon/service.ts`, `src/daemon/launchd.ts`, `src/daemon/systemd.ts`, and `src/daemon/schtasks.ts`.
- `Wrap preferred`: `openclaw.mjs`, `scripts/run-node.mjs`, and `src/gateway/boot.ts`. These are launchers and one-shot helpers, so they should stay thin unless there is a proven reason to move host behavior into them.
- `Internal edit only if proven necessary`: service-manager behavior, listen/bind semantics, auth gating for exposed routes, and the startup rules that decide whether the gateway is local-only or network-visible.
- `Out of SNC v1 scope`: session identity rework, gateway protocol redesign, and broadening network exposure without tightening auth and bind policy first.

## 6. Still-Unverified Questions

- Which deployment path is canonical for SNC shipping: local desktop service manager, Docker, or a PaaS recipe.
- Whether `gateway.mode=remote` is expected to stay private-tunnel oriented or may be exposed more broadly in some deployments.
- Whether the Node version floor mismatch between `openclaw.mjs` and `package.json` is intentional or just stale drift.
- Whether `src/gateway/boot.ts` is meant to remain an operator convenience hook or become part of a productized startup workflow.
- Whether the container and PaaS manifests are meant to be kept in lockstep or allowed to diverge by target platform.

