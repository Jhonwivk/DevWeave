# 34: Change Intent 与软 Reservation

**What to build:** 让 Agent 在开工前声明预计修改范围，并用可回溯的软 Reservation 提前暴露并行工作重叠。

**Blocked by:** 07: 从 Effective Specification 建立 Work Item 与 Coverage; 17: 启动并观察 Mock Execution

**Status:** resolved

- [x] Human 或 Agent 可以为 Work Item 登记 files、symbols、contracts 和风险范围组成的 Change Intent。
- [x] Execution 启动时激活 Reservation，结束、取消或改派后正确释放或 supersede。
- [x] 范围重叠默认产生 warning 而不是永久文件锁，相关成员可看到双方目标和重叠位置。
- [x] Change Intent 生命周期与 Work Item/Execution 分离，预测错误可以版本化修正而不改写历史。

## Answer

Change Intent 独立登记 files/symbols/contracts；重叠产生 warning 而非文件锁，Execution 结束会释放 Reservation。
