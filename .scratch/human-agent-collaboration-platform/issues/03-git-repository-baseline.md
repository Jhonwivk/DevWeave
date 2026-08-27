# 03: 导入 Git 仓库与设置工程基线

**What to build:** 让 Project Owner 将现有 Git 仓库接入 Project，选择工作基线和受保护共享分支，并保存初始 Verification Profile。

**Blocked by:** 02: 事务化创建 Project

**Status:** ready-for-agent

- [ ] Owner 可以选择有效的本地 Git 仓库，平台只在校验成功后将其关联到 Project。
- [ ] Owner 可以选择存在的 base branch 和共享分支，平台保存对应 commit 作为工程基线。
- [ ] Owner 可以配置初始 Verification Profile，非法命令或不可用仓库不会留下部分 Project 配置。
- [ ] Git fixture 集成测试证明导入过程不会意外修改用户现有 working tree 或共享分支。

