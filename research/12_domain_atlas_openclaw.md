# OpenClaw Domain Atlas

## Purpose

This note complements the earlier repo map.

The earlier map focused on SNC-relevant runtime spines.
This file answers a broader question:

- if we want to eventually "eat through" the whole OpenClaw repo
- what are the major architectural domains outside the immediate SNC chain

This is a breadth document, not a deep behavior proof.

## Confidence Rule

- `Confirmed domain`: supported by directory shape plus at least a small representative file sample
- `Tentative domain`: grouped mainly from directory names and package naming

## Domain Map

### 1. Agent Runtime Core

Status:

- Confirmed domain

Likely includes:

- `src/agents`
- `src/context-engine`
- `src/flows`
- `src/tasks`
- `src/process`
- `src/auto-reply`

Why this grouping:

- these names cluster around run orchestration, context handling, and agent lifecycle

Representative confirmed files:

- `src/agents/pi-embedded-runner/run/attempt.ts`
- `src/context-engine/types.ts`

Current research value:

- this remains the SNC host-critical zone

### 2. Plugin / Extension Host

Status:

- Confirmed domain

Likely includes:

- `src/plugins`
- `src/plugin-sdk`
- `src/hooks`
- `src/mcp`

Why this grouping:

- these names cluster around registration, manifests, slot ownership, hook wiring, and third-party integration surfaces

Representative confirmed files:

- `src/plugins/types.ts`
- `src/plugins/api-builder.ts`
- `src/plugins/loader.ts`

Current research value:

- this is the main "preserve host, add SNC hot-pluggably" surface

### 3. Channel / Messaging Fabric

Status:

- Confirmed domain

Likely includes:

- `src/channels`
- `src/chat`
- `src/routing`
- `src/sessions`
- `src/pairing`

Why this grouping:

- these names cluster around conversation binding, channel delivery, and session identity

Representative file samples:

- `src/channels/account-summary.ts`
- `src/channels/channel-config.ts`

Current research value:

- not the first SNC insertion seam, but important for later multi-surface deployment and conversation identity behavior

### 4. Gateway / External Control Plane

Status:

- Confirmed domain

Likely includes:

- `src/gateway`
- parts of `src/daemon`
- parts of `src/interactive`

Why this grouping:

- these names cluster around externally callable methods, policy, and service exposure

Representative file samples:

- `src/gateway/agent-prompt.ts`
- `src/gateway/assistant-identity.ts`

Current research value:

- likely important when SNC later needs stable remote control, orchestration, or product packaging beyond the embedded runner

### 5. User Interface Surfaces

Status:

- Tentative-to-confirmed domain

Likely includes:

- `src/cli`
- `src/tui`
- `src/terminal`
- `src/interactive`
- `src/canvas-host`
- `src/wizard`

Why this grouping:

- these names cluster around operator-facing interaction surfaces rather than core agent logic

Representative file evidence:

- not deeply read yet; grouping currently rests mostly on directory names

Current research value:

- lower priority for SNC v1 core, but important later for author workflow and operational ergonomics

### 6. Capability Media Stack

Status:

- Tentative-to-confirmed domain

Likely includes:

- `src/image-generation`
- `src/media`
- `src/media-understanding`
- `src/tts`
- `src/web-search`
- `src/link-understanding`

Why this grouping:

- these names cluster around model-adjacent content processing capabilities

Representative evidence:

- no deep read yet; confidence mainly from directory names and matching extension packages like `image-generation-core`, `media-understanding-core`, `speech-core`

Current research value:

- likely secondary for SNC, but relevant for multimodal or voice-enabled writing workflows

### 7. Config / Security / Runtime Ops

Status:

- Confirmed domain

Likely includes:

- `src/config`
- `src/secrets`
- `src/security`
- `src/infra`
- `src/logging`
- `src/cron`
- `src/daemon`
- `src/bootstrap`

Why this grouping:

- these names cluster around runtime environment, policy, lifecycle, and hardening

Representative evidence:

- confirmed through repeated reads in plugin/config paths
- not yet deeply mapped as an independent subsystem

Current research value:

- important for later SNC packaging, rollout safety, and operational defaults

### 8. Shared Foundations

Status:

- Confirmed domain

Likely includes:

- `src/shared`
- `src/utils`
- `src/types`
- `src/compat`
- `src/i18n`
- `src/generated`
- `src/docs`
- `src/scripts`
- `src/test-helpers`
- `src/test-utils`

Why this grouping:

- these look like cross-cutting support layers rather than product domains

Representative evidence:

- directory structure only; no special subsystem claim yet

Current research value:

- useful as a support atlas, but not a first-pass design driver

## Extension Surface Atlas

OpenClaw's `extensions/` tree is itself a major architectural signal.

At current breadth, it appears to split into these broad bands:

### Provider adapters

Examples:

- `anthropic`
- `openai`
- `ollama`
- `openrouter`
- `groq`
- `mistral`
- `xai`

Read:

- confirmed by names

### Channel / chat platform adapters

Examples:

- `telegram`
- `discord`
- `slack`
- `whatsapp`
- `signal`
- `matrix`
- `msteams`

Read:

- confirmed by names

### Tool / web / browser capabilities

Examples:

- `browser`
- `firecrawl`
- `duckduckgo`
- `brave`
- `tavily`
- `searxng`

Read:

- confirmed by names

### Core capability plugins

Examples:

- `memory-core`
- `memory-lancedb`
- `media-understanding-core`
- `image-generation-core`
- `speech-core`

Read:

- confirmed by names plus partial deep read of both memory plugins

### Platform / special-host integrations

Examples:

- `device-pair`
- `diagnostics-otel`
- `thread-ownership`
- `voice-call`
- `phone-control`

Read:

- tentative; domain intent inferred from names

## Current Value For Long-Term Research

If we eventually want full-repo mastery rather than SNC-only local optimization, OpenClaw currently looks like five large programs living in one tree:

1. the embedded agent runtime
2. the plugin host and extension registry
3. the channel/gateway delivery fabric
4. the capability stack around media/search/speech
5. the operational/security/config substrate

The most important meta-point is:

- SNC is only one slice of a larger host platform
- and any deep future work should keep distinguishing "runtime core" from "host platform" from "extension ecosystem"
