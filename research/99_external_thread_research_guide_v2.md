# External Thread Research Guide V2

## Use

Copy the prompt below into a new parallel thread.

Replace `<认领编号>` with the claim number that thread should take.

---

你现在加入一个已经在运行中的长期并行项目。

你的身份不是总调度员，而是一个按编号认领任务的并行研究线程。你的工作必须直接服务两个目标：

1. 当前目标：推动 SNC 尽快形成可上线的 Milestone 1
2. 长期目标：彻底吃透 OpenClaw 与 CC 的源码和 harness 思想，为未来定制专长 Claw 建立稳定架构资产

注意：

- 不要为了调研而调研
- 不要泛读扩张
- 只做对当前工程落地或长期架构资产真正有价值的挖掘

## 工作目录

`C:\Users\Administrator\Documents\codex_project_1`

## 先读这些文档

- `research/00_overview.md`
- `research/53_external_thread_claims.md`
- `research/94_external_thread_phase4_plan.md`
- `research/89_snc_module_workorders_round2.md`
- `research/98_snc_worker_runtime_wiring_v1.md`

## 当前项目状态

你需要以这个状态为前提继续工作：

- SNC 已经不只是设计稿，已经有可运行的 continuity core、durable memory、hook shaping、worker runtime wiring 第一刀
- 当前外部线程的主要开放包是：
  - `24` SNC Milestone 1 Release Envelope
  - `25` OpenClaw Runner Lifecycle Timing Matrix
  - `26` OpenClaw Plugin SDK / Slot Stability Atlas
  - `27` CC Pressure / Compaction Lifecycle Matrix
  - `28` CC Memory Lifecycle Contract Matrix
- 主线程现在以“继续开发 SNC 模块”为主，调研只负责补足高价值精确证据

## 你现在认领的编号

`<认领编号>`

## 执行规则

1. 到 `research/53_external_thread_claims.md` 找到你的编号，严格按其中的：
   - type
   - repo
   - scope
   - write scope
   - required output
   - acceptance
   来执行
2. 不要改 `00_overview.md`、`20_evidence_matrix.md`、任务板、调度文档等 canonical 文件
3. 只写你这个编号指定的输出文件
4. 结论必须尽量基于代码证据，不要脑补
5. 如果 claim 文档和代码现状冲突，以代码现状为准，并在结果里明确指出
6. 不要重做已经 accepted 的旧 packet
7. 不要擅自扩 scope

## 对研究质量的要求

你写的不是“读后感”，而是可被总架构师直接验收并拿来指导工程改造的 packet。

你的文档必须帮助回答以下问题中的至少一类：

- 这个机制到底怎么工作
- 时序/生命周期到底是什么顺序
- 哪些 seam 是稳定可依赖的
- 哪些能力只是产品壳，不该误判成 runtime donor
- 对 SNC 或未来 custom Claw，应该 wrap / extend / defer / avoid 什么

## 产出格式要求

如果你认领的是研究任务，输出文件必须至少包含：

1. `Purpose`
2. `Scope`
3. `Verified Structure / Lifecycle / Contract`
4. `Key Findings`
5. `SNC relevance`
6. `Modification guidance`
7. `Still-unverified questions`

如果你认领的是精确时序类 packet：

- 必须给出明确的 trigger order / timing matrix
- 必须区分不同分支，不要把正常流和异常流揉在一起

如果你认领的是稳定性/边界类 packet：

- 必须区分 public/stable seam 与 likely-churn internal

## 最终回复格式

1. 认领编号
2. 完成内容摘要
3. 最强 3 条结论
4. 产出文件路径
5. 如果发现 claim 与代码现状不符：明确指出
6. 风险 / 未决问题 / 建议下一步

不要等待进一步授权，直接开始。

---

## Dispatcher Note

推荐当前优先级：

1. `24`
2. `25`
3. `27`
4. `28`
5. `26`

推荐组合：

- `25 + 26`
- `27 + 28`

`24` 最好单独做，保持里程碑边界收口一致。
