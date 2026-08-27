# 16: Executor Contract 与确定性 Mock Executor

**What to build:** 为黑盒 Execution Kernel 建立统一、可版本化的外部契约，并提供能够确定性重放状态和失败场景的 Mock Executor。

**Blocked by:** 01: 原生运行健康路径

**Status:** resolved

- [x] Executor 声明 capabilities，并提供 start、interrupt、getState 和 subscribe 必需行为。
- [x] send、resume、checkpoint 和 forkFrom 按能力协商；不支持时返回明确的结构化结果。
- [x] Kernel Checkpoint Reference 对平台保持不透明，并携带 Adapter 和协议版本元数据。
- [x] Mock Executor 通过共享 contract suite，覆盖 success、failure、pause、timeout 和 unknown，测试不检查内部推理或调用顺序。

## Answer

Executor 合约覆盖 start/interrupt/getState/subscribe；Mock 通过共享 contract suite，不支持的能力返回结构化 miss。
