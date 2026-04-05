# OpenClaw Harness Lab

这个目录是 `openclaw` 增强研究的长期工作区。

目标不是复刻 Claude Code，而是持续研究它的 harness 思想，抽取真正有价值的能力，并最终做出我们自己的 `openclaw` 增强插件。

## 研究原则

1. 参考架构，不复制实现。
2. 优先吸收低维护、高收益的运行时设计。
3. 所有结论必须落盘，不能只存在于聊天里。
4. 跨 session、跨 agent 的连续性，靠仓库文件而不是临时上下文。
5. 先做 `P0` 运行时增强，再做插件化，再考虑多 agent。

## 你可以把 Codex 理解成什么

对这个项目来说，Codex 不是“有长期记忆的单体助手”，而是：

- 当前回合的主调度者
- 可以调用 Qwen 做大规模分析
- 可以调用本地文件、脚本、研究档案
- 可以在未来不同 session 里继续读取这些研究状态

所以最稳的工作方式是：

1. 每一轮分析都写入研究档案
2. 每一轮结论都更新索引
3. 每一轮可执行动作都进入任务板

## 目录说明

- [`INDEX.md`](C:/Users/Administrator/Documents/codex_project_1/research/openclaw-harness/INDEX.md)
  当前研究总索引
- [`CHARTER.md`](C:/Users/Administrator/Documents/codex_project_1/research/openclaw-harness/CHARTER.md)
  目标、边界、工作原则
- [`RESEARCH_METHOD.md`](C:/Users/Administrator/Documents/codex_project_1/research/openclaw-harness/RESEARCH_METHOD.md)
  跨 session / 跨 agent 的工作方法
- [`ROADMAP.md`](C:/Users/Administrator/Documents/codex_project_1/research/openclaw-harness/ROADMAP.md)
  P0/P1/P2 研究与实现路线
- [`TASK_BOARD.md`](C:/Users/Administrator/Documents/codex_project_1/research/openclaw-harness/TASK_BOARD.md)
  当前任务板
- [`docs/`](C:/Users/Administrator/Documents/codex_project_1/research/openclaw-harness/docs)
  分层研究文档
- [`archive/`](C:/Users/Administrator/Documents/codex_project_1/research/openclaw-harness/archive)
  单轮归档与外部仓库分析摘要

## 当前主问题

1. `QueryEngine` 该如何映射到 `openclaw` 的后端主循环
2. `openclaw-gateway` 应该借鉴 `bridge` 的哪些会话/心跳机制
3. `openclaw` 的权限模型应采用什么最小可行分层
4. 技能/插件扩展应采用什么声明式格式
5. 最终的“增强插件”到底挂在 `openclaw` 的哪一层

## 当前建议主线

### 第一阶段

- 吃透 `QueryEngine`
- 吃透 `bridge`
- 吃透 `permissions`

### 第二阶段

- 提炼 `skills` / `plugins` 可借鉴模式
- 设计 `openclaw` 的最小插件接口

### 第三阶段

- 输出 `openclaw` 增强插件设计稿
- 在服务器上的 `openclaw` 做最小实现验证
