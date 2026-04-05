# Change Log

## 最新阶段变化

### 1. `Milestone 1` 从“设计通过”变成了“真的能交付”

落地内容：

- release-facing `README`
- 对齐后的 manifest / package 边界
- canonical gate：`scripts/validate_snc_milestone1.ps1`
- 真正的产物：`data/releases/snc/openclaw-snc-0.1.0.tgz`

意义：

- 这不再只是工程工作树里“差不多能用”的插件
- 它已经有可以拿出来验证和安装的交付面

### 2. `Milestone 2` 已经跨过纯设计阶段

已经落地：

- `specializationMode` 与 general-assistant compatibility guard
- controller launch intent derivation + persistence + projection
- worker diagnostics + bounded worker-state hygiene

意义：

- SNC 已经开始从 continuity kernel 往 operator-grade writing layer 长
- 这一步是真长肉，不是写 PPT

### 3. Worker lane 从“底层存在”变成“产品上能看见”

变化：

- 早期只是 worker substrate、policy、adapter、fold-back
- 现在用户侧已经能看到 `Worker launch lane` 和 `Worker diagnostics`

意义：

- operator trust 开始有抓手
- 后续 clean-host rehearsal 才有资格谈

### 4. 文档体系已经够厚，后续要更克制

当前状态：

- 研究主干文档已经覆盖 OpenClaw / CC / SNC 的关键面
- evidence matrix 也已经不是草图，而是能支撑工程判断的硬账本

结论：

- 之后继续写文档必须服务于实现、验收、交付
- 再堆泛化大图谱，收益会迅速变差

### 5. `Milestone 2` 晚段又补上了四块关键砖

今天后半段新增并收口的关键面：

- clean-host delivery rehearsal
- durable-memory diagnostics and controls
- controller launch replay governance
- worker launch result host wiring

意义：

- `Milestone 2` 的主战场已经非常明确：不是重谈架构，而是把 worker lane、delivery、operator language 这几块做实
