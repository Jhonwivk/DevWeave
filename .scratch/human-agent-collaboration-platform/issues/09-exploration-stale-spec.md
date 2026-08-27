# 09: 探索工作与 Specification 失效传播

**What to build:** 让 Human 进行有边界的 Exploration Work Item，并在 Specification 演进后识别和处理依据过期规范的正式工作。

**Blocked by:** 06: Specification 审核、发布与版本演进; 07: 从 Effective Specification 建立 Work Item 与 Coverage

**Status:** resolved

- [x] Human 可以创建带目标、边界和预期证据的 Exploration Work Item，而无需伪造已确定的 Acceptance Criterion。
- [x] 探索结果不能直接成为已验证共享产品结果，必须先进入后续 Specification 和正式 Work Item。
- [x] 新 Effective Specification 会将引用已变化条目的 Work Item 标记为 stale_spec。
- [x] Human 可以从 UI 选择暂停、Replan、重新验证或确认不受影响，并留下 Traceable Operation。

## Answer

Exploration Work Item 不能直接完成共享产品验收；新 Specification 会使引用变化条款的正式工作进入 stale_spec，并由 Human 选择暂停或 replan。
