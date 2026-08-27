# 13: Capability Gap 与 System-Generated Agent qualification

**What to build:** 让平台根据 Work Item 能力要求显示团队缺口，并由 Human 决定是否生成和准入一个项目级 System-Generated Agent。

**Blocked by:** 07: 从 Effective Specification 建立 Work Item 与 Coverage; 10: Human Project Membership 与 Team View

**Status:** resolved

- [x] 平台比较 required capabilities 与可验证 Capability Evidence，并显示未覆盖的 Capability Gap。
- [x] 平台不自动排名或选择 Digital Employee/Private Agent，只提供缺口事实和手动补员入口。
- [x] Human 可以批准生成 System-Generated Agent Candidate，并查看其配置、权限需求和来源。
- [x] Candidate 只有通过 qualification 或获批受限试用后才能成为 Agent Membership，失败结果保持可追溯。

## Answer

平台只展示 Capability Gap，不自动排名人选；System-Generated Agent 需 qualification 或受限试用后才能成为 Membership。
