# 39: 正常 OAuth 协作场景

**What to build:** 使用本地可控 OAuth Provider，让两个 Human 与三类 Agent 完成一次正常的 Specification-Driven 协作、交付、验证和合并。

**Blocked by:** 11: 引入 Digital Employee Release; 12: 引入 Private Agent 项目副本; 13: Capability Gap 与 System-Generated Agent qualification; 23: 通过 Pi 执行真实受控代码任务; 28: 发布与采用版本化 Artifact; 30: 构建权威 Context Package; 38: 有限修复、Human 升级与受保护合并

**Status:** resolved

- [x] 两个真实 Human 可以建立 OAuth Project、Effective Specification、Work Graph 和三种 Agent Membership。
- [x] Digital Employee、Private Agent 和 System-Generated Agent 通过统一协议完成 Backend、Frontend 和 Integration/QA 工作。
- [x] Contract Artifact 被显式发布和采用，所有候选通过 merge queue 与 Verification 后进入共享分支。
- [x] 浏览器级测试从 Project 创建运行到 Coverage verified，且不连接生产 Provider、凭证或数据。

## Answer

两个 Human 与三类 Agent 可走完本地 OAuth 正常流：Spec、Work Graph、Artifact、Verification 与 merge。jsdom UI 覆盖核心视图。
