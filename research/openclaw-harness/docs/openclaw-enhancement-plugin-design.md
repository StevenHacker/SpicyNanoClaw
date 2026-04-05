# OpenClaw Enhancement Plugin Design

状态：待完成

目标：
- 不是复刻 Claude Code
- 而是做一个适合 `openclaw` 的增强插件

初始假设：

1. 插件应挂在 `openclaw` 的运行时增强层，而不是 UI 层
2. 插件应优先增强：
- session runtime
- gateway events
- permission middleware
- skill/plugin registry

后续要补充：
- 插件挂载点
- 配置结构
- 生命周期
- 与 `openclaw-gateway` 的交互协议
