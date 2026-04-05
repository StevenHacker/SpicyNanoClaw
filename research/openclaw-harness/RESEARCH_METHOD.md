# Research Method

## 为什么要这样做

你提到希望“跨不同 session 或 agent，分层研究”，这件事不能只靠聊天上下文完成。

在 Codex 里，更稳的机制是：
- 把研究状态落在仓库文件里
- 每一轮读取已有状态
- 每一轮只推进一个清晰层面

## 工作模式

### 模式 A：主调度模式

由 Codex 主模型负责：
- 规划研究顺序
- 判断哪些结论可信
- 决定什么值得进入 `openclaw`

### 模式 B：批量分析模式

由 Qwen 负责：
- 吃大文件
- 做大块结构归纳
- 输出候选结论

### 模式 C：归档模式

每轮结束时必须做：
- 写结论文件
- 更新索引
- 更新任务板

## 分层研究顺序

1. 核心运行时
2. bridge / remote
3. 权限系统
4. 技能 / 插件
5. 记忆 / 状态
6. 多 agent / team / workflow

## 每轮研究输出模板

每轮至少产出：

1. 研究对象
2. 主要文件
3. 它解决的问题
4. 对 `openclaw` 的借鉴点
5. 不应照搬的点
6. 下一轮问题

## 如何跨 session 继续

以后不管在哪个 session，只要从下面几个文件开始读，就能恢复上下文：

1. [`INDEX.md`](C:/Users/Administrator/Documents/codex_project_1/research/openclaw-harness/INDEX.md)
2. [`TASK_BOARD.md`](C:/Users/Administrator/Documents/codex_project_1/research/openclaw-harness/TASK_BOARD.md)
3. 最近一次 `docs/` 深挖文档
4. 最近一次 `archive/` 归档
