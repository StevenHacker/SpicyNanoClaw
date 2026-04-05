# Secretary Truth Layer

## 目的

这一层是我单独向你负责的“秘书账本”。

它不是新的 canonical 研究库，也不抢现有文档 ownership。
它只是把多线程已经产出的事实、结论、工单和证据，压成一套随时可查的共享真相。

原则很硬：

- 不改他们原有文件结构
- 不替换 dispatcher / researcher 的主账本
- 只做投影、汇总、索引、口径统一
- 以落盘工件为准，不以聊天印象为准

## 这层包含什么

- `chronicle.md`
- `claim-board.md`
- `feature-map.md`
- `change-log.md`
- `evidence-matrix.md`

## 口径

这里的内容主要来自四类来源：

- `research/*.md` 的 canonical 研究文档
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/*` 的当前实现
- `data/releases/snc/*` 的交付物
- `data/chronicle/*` 中与你有关、会影响项目走向的长期指令

## 当前角色分工

- 原研究文档：继续由原线程/原工作流演进
- 这层秘书账本：由我维护，专门给你快速调用

## 怎么用

你之后可以直接问我：

- “现在 claim 到哪了”
- “SNC 目前已经做成了什么”
- “最近几轮真实落地了哪些改动”
- “这条结论证据够不够硬”

我默认先查这一层，再下潜原文档。
