# Research Index

Last updated: 2026-04-01

## Completed

1. First-pass analysis of the Python rewrite repo
   - [claw-code-analysis-20260401.md](C:/Users/Administrator/Documents/codex_project_1/data/external/claw-code-analysis-20260401.md)

2. First-pass architecture analysis of the source mirror repo
   - [claude-code-leeyeel-analysis-20260401.md](C:/Users/Administrator/Documents/codex_project_1/data/external/claude-code-leeyeel-analysis-20260401.md)

3. Read-only runtime inspection of the server-side `openclaw`
   - Confirmed `openclaw` and `openclaw-gateway` processes
   - Confirmed loopback listeners on `127.0.0.1:18789/18791/18792`

4. Deep-dive map of the harness runtime around `QueryEngine`
   - [queryengine-deep-dive.md](C:/Users/Administrator/Documents/codex_project_1/research/openclaw-harness/docs/queryengine-deep-dive.md)

## Current Focus

1. Deep dive `bridge/bridgeMain.ts`
2. Deep dive `utils/permissions/permissions.ts`
3. Map extracted harness ideas onto `openclaw`
4. Design the minimum useful `openclaw` enhancement plugin

## Current Conclusions

1. We should not try to clone Claude Code wholesale.
2. The most valuable transferable ideas so far are:
   - session runtime shell
   - dedicated turn loop
   - capability-aware tool orchestration
   - explicit runtime init protocol
   - file-based transcript ledger
   - file-based explicit memory
3. The least urgent areas are:
   - UI surface
   - full experimental feature matrix
   - swarm / multi-agent product behaviors
   - cloud-specific or Anthropic-specific transport details

## Next Deliverables

1. [bridge-deep-dive.md](C:/Users/Administrator/Documents/codex_project_1/research/openclaw-harness/docs/bridge-deep-dive.md)
2. [permissions-deep-dive.md](C:/Users/Administrator/Documents/codex_project_1/research/openclaw-harness/docs/permissions-deep-dive.md)
3. [openclaw-enhancement-plugin-design.md](C:/Users/Administrator/Documents/codex_project_1/research/openclaw-harness/docs/openclaw-enhancement-plugin-design.md)
