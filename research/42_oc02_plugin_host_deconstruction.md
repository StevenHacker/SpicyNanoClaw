# OC-02 Plugin / Hook / Manifest Host

## Subsystem Purpose

OpenClaw 的 Plugin / Hook / Manifest Host 本质上是两层宿主面：

- 类型化运行时插件宿主
  - 负责发现插件、读取 manifest、校验配置、加载模块、注入 API、注册 slot / hook / tool / memory / context-engine，并在运行时统一执行这些能力
- 文件系统 hook 包宿主
  - 负责从插件 manifest 暴露的 hook 目录中发现和解析 `HOOK.md` 风格资源

这两层不是同一套系统。

主链文件：

- [loader.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\loader.ts)
- [discovery.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\discovery.ts)
- [registry.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\registry.ts)
- [hooks.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\hooks.ts)
- [plugin-hooks.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\hooks\plugin-hooks.ts)

## Entry Files

核心入口：

- [manifest.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\manifest.ts)
- [discovery.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\discovery.ts)
- [manifest-registry.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\manifest-registry.ts)
- [loader.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\loader.ts)
- [api-builder.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\api-builder.ts)
- [registry.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\registry.ts)
- [slots.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\slots.ts)
- [types.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\types.ts)
- [hooks.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\hooks.ts)
- [hook-runner-global.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\hook-runner-global.ts)
- [plugin-hooks.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\hooks\plugin-hooks.ts)
- [types.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\hooks\types.ts)

代表性插件：

- [memory-core/index.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\extensions\memory-core\index.ts)
- [memory-lancedb/index.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\extensions\memory-lancedb\index.ts)
- [index.ts](C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1\extensions\snc\index.ts)
- [openclaw.plugin.json](C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1\extensions\snc\openclaw.plugin.json)

## Verified Lifecycle / Slot / Hook Notes

- 插件加载主链已验证为：
  - `discovery -> manifest registry -> config/schema validation -> safe module load -> buildPluginApi -> plugin.register(api) -> active registry -> global hook runner init`
  - 入口在 [loader.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\loader.ts)

- manifest 和包入口是正式契约，不是松散约定。
  - `openclaw.plugin.json`、`extensions[]`、`setupEntry`、默认 `index.*` 候选都在 [manifest.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\manifest.ts) 和 [discovery.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\discovery.ts)

- slot 是显式且排他的。
  - `PluginKind` 当前核心是 `memory` / `context-engine`
  - 对应 slot key `memory` / `contextEngine`
  - 默认实现分别是 `memory-core` / `legacy`
  - 证据在 [types.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\types.ts) 和 [slots.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\slots.ts)

- `registerContextEngine(...)` 是正式 API，并受 registry / slot 约束。
  - context-engine 会进入宿主 slot 选择链，而不只是 prompt prepend
  - 证据在 [api-builder.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\api-builder.ts) 和 [registry.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\registry.ts)

- 类型化 runtime hook 已验证是成熟宿主面。
  - 有优先级排序
  - modifying hooks 顺序合并
  - void hooks 可并行
  - `before_prompt_build` 有专门 merge 策略
  - `tool_result_persist`、`before_message_write` 是同步 hot path
  - `after_compaction` 已存在
  - 证据在 [hooks.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\hooks.ts)

- 文件系统 hook 与 runtime hook 是两套系统。
  - manifest 可暴露 `hooks` 目录
  - 但这是给 [plugin-hooks.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\hooks\plugin-hooks.ts) 解析的
  - 不等于 `registerHook(...)`

- bundled 例子已证明“占 slot 的插件仍可附带多种能力”。
  - `memory-core`、`memory-lancedb` 不只注册 memory，还注册 tools、prompt/context prepend 等

- 当前 SNC 走的路径是对的。
  - manifest + `definePluginEntry(...)` + `kind: "context-engine"` + `api.registerContextEngine("snc", ...)`
  - 证据在 [index.ts](C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1\extensions\snc\index.ts)

## Safe SNC Modification Notes

- SNC 继续走“独立插件包 + manifest + `definePluginEntry` + `registerContextEngine`”是安全路径。
- SNC 的附加能力优先走类型化 runtime hooks，而不是先碰宿主内部。
  - 优先关注：
  - `before_prompt_build`
  - `before_message_write`
  - `tool_result_persist`
  - `after_compaction`
- SNC 配置继续放在 [openclaw.plugin.json](C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1\extensions\snc\openclaw.plugin.json) 的 `configSchema` / `uiHints`
- 如果 SNC 要做“单核心插件 + 辅助行为”，宿主能力允许这样做
- sidecar、state persistence、写作约束整形都应优先在 SNC 插件内 wrap 宿主 seam

## Unsafe / Internal-Edit-Only Zones

- [loader.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\loader.ts)
  - discovery precedence、模块加载、边界保护、active registry 初始化都属于宿主内脏

- [slots.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\slots.ts)
  - slot exclusivity、默认 slot id、slot selection 语义是宿主级规则

- [registry.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\registry.ts)
  - capability registration / normalization 属于 host-owned state

- [hooks.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\hooks.ts)
  - 全局 merge policy、并发策略、hook 执行模型属于全宿主行为

- [plugin-hooks.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\hooks\plugin-hooks.ts)
  - 文件系统 hook 包层当前不该作为 SNC v1 主战场

## Classification

- `Hot-pluggable seam`
  - [index.ts](C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1\extensions\snc\index.ts)
  - [api-builder.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\api-builder.ts)
  - [types.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\types.ts)
  - [hooks.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\hooks.ts)

- `Host-owned seam`
  - [loader.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\loader.ts)
  - [discovery.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\discovery.ts)
  - [registry.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\registry.ts)
  - [hook-runner-global.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\hook-runner-global.ts)

- `Wrap preferred`
  - [hooks.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\hooks.ts)
  - [manifest.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\manifest.ts)
  - [memory-core/index.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\extensions\memory-core\index.ts)
  - [memory-lancedb/index.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\extensions\memory-lancedb\index.ts)

- `Internal edit only if proven necessary`
  - [slots.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\slots.ts)
  - [registry.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\registry.ts)
  - [loader.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\plugins\loader.ts)

- `Out of SNC v1 scope`
  - [plugin-hooks.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\hooks\plugin-hooks.ts)
  - [types.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\hooks\types.ts)
