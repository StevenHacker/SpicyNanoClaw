# OC-05 Config / Security / Ops

## Subsystem Purpose

- `src/config` 是配置主链。
  - 负责读取、include 解析、环境变量替换、校验、运行时 materialization、写回与 refresh 安全
  - 核心入口在 [config.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\config.ts)、[io.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\io.ts)、[validation.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\validation.ts)

- `src/security` 是宿主策略层。
  - 负责危险配置、工具策略、DM/group allowlist、不可信外部输入

- `src/infra` 提供运行时/进程级硬化边界。

- `src/bootstrap` 负责 Node 启动环境准备，尤其是 TLS/CA 行为。

- `src/daemon` 是跨平台 service / gateway 打包层。
  - 覆盖 `launchd`、`systemd`、Windows Scheduled Task

## Entry Files

- 配置主链
  - [config.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\config.ts)
  - [io.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\io.ts)
  - [validation.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\validation.ts)
  - [types.plugins.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\types.plugins.ts)

- 插件/配置启用面
  - [plugin-auto-enable.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\plugin-auto-enable.ts)
  - [plugins-allowlist.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\plugins-allowlist.ts)
  - [runtime-group-policy.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\runtime-group-policy.ts)

- 安全策略
  - [dangerous-config-flags.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\security\dangerous-config-flags.ts)
  - [external-content.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\security\external-content.ts)
  - [audit-channel.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\security\audit-channel.ts)
  - [dm-policy-shared.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\security\dm-policy-shared.ts)

- Infra / bootstrap
  - [host-env-security.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\infra\host-env-security.ts)
  - [runtime-guard.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\infra\runtime-guard.ts)
  - [node-startup-env.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\bootstrap\node-startup-env.ts)

- Daemon / service
  - [service.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\daemon\service.ts)
  - [service-audit.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\daemon\service-audit.ts)
  - [service-env.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\daemon\service-env.ts)

## Verified Config / Policy / Ops Notes

- 插件配置不是裸 JSON。
  - 会经过 manifest registry 和每插件 schema 校验
  - plugin id、slot 引用、schema 缺失都会被显式处理
  - 证据在 [validation.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\validation.ts)

- 配置读取是强约束的运维链。
  - include resolution 有 guard
  - shell env fallback 只对预期 key 生效
  - 配置写回有 backup
  - runtime refresh 失败会抛专门错误
  - 证据在 [io.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\io.ts)

- include 文件被限制在 config 目录内，且 symlink 解析后仍会重检。
  - 这是 SNC 做配置间接引用时必须尊重的真实边界
  - 证据在 [includes.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\includes.ts)

- plugin auto-enable 是正式机制，不是 ad hoc 行为。
  - 会 consult manifest registry / catalog
  - 明确 allowlist 才会自动启用
  - 证据在 [plugin-auto-enable.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\plugin-auto-enable.ts)

- group policy 默认是 fail-closed。
  - provider 缺失时 fallback 为 `allowlist`
  - 证据在 [runtime-group-policy.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\runtime-group-policy.ts)

- validation 直接承载了一部分安全约束。
  - 不支持的 mutable `secretref` surface 会被拒绝
  - `identity.avatar` 必须留在 agent workspace 内
  - 证据在 [validation.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\validation.ts) 和 [unsupported-surface-policy.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\secrets\unsupported-surface-policy.ts)

- host exec env 是显式净化过的。
  - 危险 key/prefix 会被剔除
  - PATH override 被拦
  - 只有窄集合 shell-wrapper override 被允许
  - 证据在 [host-env-security.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\infra\host-env-security.ts)

- runtime/ops floor 是显式的。
  - Node 必须 `>=22.14.0`
  - TLS 启动环境通过 bootstrap 归一化
  - 证据在 [runtime-guard.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\infra\runtime-guard.ts) 和 [node-startup-env.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\bootstrap\node-startup-env.ts)

- gateway/service 打包是跨平台且带审计的。
  - daemon 会在 `launchd` / `systemd` / Scheduled Task 之间选后端
  - 并审计 embedded token、Node runtime、service unit 质量
  - 证据在 [service.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\daemon\service.ts)、[service-audit.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\daemon\service-audit.ts)、[service-env.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\daemon\service-env.ts)

- security 层已经把危险 flag 和外部内容视为一等风险源。
  - 证据在 [dangerous-config-flags.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\security\dangerous-config-flags.ts) 和 [external-content.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\security\external-content.ts)

## Safe SNC Modification Notes

- SNC packaging 应继续留在既有 plugin config surface 内：
  - `plugins.entries.snc.config`
  - `plugins.slots.contextEngine`
  - 可选 `plugins.load.paths`
  - 这条链已经 manifest-aware 且已受校验保护

- SNC 的默认值、产品化行为优先通过 config-compatible wrapper 做，不绕开 [io.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\io.ts) / [validation.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\validation.ts)

- 如果 SNC 以后进入 gateway/service 形态，应复用现有 service env / audit 层，而不是自建 launcher 路线。

- 如果 SNC 以后暴露 remote/gateway surface，DM/group policy 和 dangerous-flag reporting 应当被视为硬约束输入，而不是可选优化。

## Unsafe / Internal-Edit-Only Zones

- [io.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\io.ts)
  - 混合了 include、env fallback、validation、backup、runtime snapshot refresh
  - 属于宿主核心配置 I/O

- [validation.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\validation.ts)
  - 是 plugin ids、schemas、secretref surfaces、workspace path 限制的中心安全闸门

- [host-env-security.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\infra\host-env-security.ts)
  - 是硬安全边界，不该为 SNC 降低限制

- [service.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\daemon\service.ts)
  - 属于产品包装基础设施，不是 SNC 核心

- [dm-policy-shared.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\security\dm-policy-shared.ts)
  - 属于宿主产品策略，不应变成 SNC 自定义策略层

## Classification

- `Hot-pluggable seam`
  - `plugins.entries.*.config`、`plugins.load.paths`、`plugins.slots.*`
  - 证据在 [types.plugins.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\types.plugins.ts) 和 [validation.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\validation.ts)

- `Host-owned seam`
  - [io.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\io.ts)
  - [validation.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\validation.ts)
  - [host-env-security.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\infra\host-env-security.ts)
  - [service.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\daemon\service.ts)

- `Wrap preferred`
  - [plugin-auto-enable.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\plugin-auto-enable.ts)
  - [service-audit.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\daemon\service-audit.ts)

- `Internal edit only if proven necessary`
  - [io.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\io.ts)
  - [validation.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\config\validation.ts)
  - [host-env-security.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\infra\host-env-security.ts)
  - [service.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\daemon\service.ts)

- `Out of SNC v1 scope`
  - [launchd.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\daemon\launchd.ts)
  - [systemd.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\daemon\systemd.ts)
  - [schtasks.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\daemon\schtasks.ts)
  - [node-startup-env.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\bootstrap\node-startup-env.ts)
  - [audit-channel.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\security\audit-channel.ts)
  - [dm-policy-shared.ts](C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1\src\security\dm-policy-shared.ts)
