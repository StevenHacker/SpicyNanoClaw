# OC-01 Agent Runtime Core

## Subsystem Purpose

`OC-01` 是 OpenClaw 的宿主运行时核心，决定：

- 哪个 `ContextEngine` 生效
- 模型最终看到什么消息
- system prompt 如何分层装配
- post-turn maintenance 何时运行
- compaction / recovery 路径如何收束

对 SNC 来说，重心在 embedded runner，而不是 `flows/` 或 `tasks/`。

核心文件：

- [run.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\agents\pi-embedded-runner\run.ts)
- [attempt.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\agents\pi-embedded-runner\run\attempt.ts)
- [types.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\context-engine\types.ts)

## Main Entry Files

Context-engine 契约与解析：

- [types.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\context-engine\types.ts)
- [registry.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\context-engine\registry.ts)
- [init.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\context-engine\init.ts)
- [legacy.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\context-engine\legacy.ts)
- [delegate.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\context-engine\delegate.ts)

Runner / runtime spine：

- [run.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\agents\pi-embedded-runner\run.ts)
- [attempt.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\agents\pi-embedded-runner\run\attempt.ts)
- [attempt.context-engine-helpers.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\agents\pi-embedded-runner\run\attempt.context-engine-helpers.ts)
- [context-engine-maintenance.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\agents\pi-embedded-runner\context-engine-maintenance.ts)
- [compact.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\agents\pi-embedded-runner\compact.ts)
- [system-prompt.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\agents\system-prompt.ts)
- [system-prompt.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\agents\pi-embedded-runner\system-prompt.ts)

工作副本中的安全使用证明：

- [engine.ts](C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1\extensions\snc\src\engine.ts)

## Verified Runtime / Call-Chain Notes

- `ContextEngine` 解析
  - `run.ts` 初始化 built-ins 并从 config slot 解析 active engine
  - 默认 fallback 是 `legacy`

- bootstrap 路径
  - existing-session startup 会调用 `runAttemptContextEngineBootstrap(...)`
  - helper 内部会先可选 `bootstrap()`，再 `maintain("bootstrap")`

- 模型可见装配路径
  - `attempt.ts` 调 `assembleAttemptContextEngine(...)`
  - 返回的 `messages` 可以替换活跃消息列表
  - 返回的 `systemPromptAddition` 会 prepend 到已生成 system prompt 上
  - 之后 hooks 还可以继续 override / prepend / append
  - 所以最终 prompt 装配是多阶段的

- post-turn 生命周期
  - 成功 turn 完结后先跑 `afterTurn()`
  - 如果无 prompt error / abort，再跑 `maintain("turn")`
  - 如果没有 `afterTurn()`，宿主会退化到 `ingestBatch()` 或逐条 `ingest()`

- maintenance seam
  - runtime 会把 `rewriteTranscriptEntries(...)` 注入 maintenance context
  - 这是插件安全改写 transcript 的正式入口

- compaction 路径
  - manual/runtime compaction 会调用 `contextEngine.compact(...)`
  - 成功后跑 `maintain("compaction")`
  - 如果 engine owns compaction，还要由它承担 post-compaction side effects 和 hooks 责任

- recovery asymmetry
  - timeout recovery 与 overflow recovery 并不完全对称
  - overflow 分支可以看到立即 compaction maintenance
  - timeout 分支在可见代码里没有同等的立即维护步骤

- `legacy` 的现实定位
  - 只是兼容包装，不是强状态引擎
  - `assemble()` 基本 pass-through
  - `ingest()` / `afterTurn()` 基本 no-op
  - `compact()` 只是 delegate 到 runtime

## Safe SNC Modification Notes

- 最安全的主插层仍是：
  - 通过 plugin 注册拿下 `context-engine` slot
  - 而不是去改 `attempt.ts`

- v1 最安全职责边界：
  - `assemble()` 做模型可见状态锚
  - `afterTurn()` 做 sidecar state persistence
  - `maintain()` 做窄范围 transcript hygiene
  - `compact()` 做 delegate + guidance，而不是替换 host compaction

- `runtimeContext` 应只把文档化的 `rewriteTranscriptEntries` 当稳定契约使用
  - 不要围绕 undocumented extra fields 设计 SNC

## Unsafe / Internal-Edit-Only Zones

- 不要轻易改：
  - [attempt.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\agents\pi-embedded-runner\run\attempt.ts)
  - [run.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\agents\pi-embedded-runner\run.ts)
  - [compact.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\agents\pi-embedded-runner\compact.ts)

原因：

- 这些文件控制 retry loop
- prompt layering order
- compaction recovery
- hook sequencing
- session mutation order

- 不要过早把 `ownsCompaction` 设成 `true`
  - 一旦这样做，就会把 compaction side effects / hook obligations 推到 engine 身上

- 不要把 `flows/` 或 `tasks/` 当成 SNC 核心主链
  - 它们更像平台/产品基础设施
  - 不是写作连续性内核的主插层

## Classification

- `Hot-pluggable seam`
  - `context-engine` registration
  - slot resolution
  - engine lifecycle contract

- `Host-owned seam`
  - embedded runner retry loop
  - prompt assembly order
  - compaction recovery loop
  - hook dispatch order

- `Wrap preferred`
  - `assemble`
  - `afterTurn`
  - `maintain`
  - delegated `compact`
  - plugin-owned `systemPromptAddition`

- `Internal edit only if proven necessary`
  - [attempt.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\agents\pi-embedded-runner\run\attempt.ts)
  - [run.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\agents\pi-embedded-runner\run.ts)
  - [compact.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\agents\pi-embedded-runner\compact.ts)
  - transcript rewrite runtime internals

- `Out of SNC v1 scope`
  - `flows/` provider/setup flows
  - 大多数 `tasks/` registry / executor surfaces
