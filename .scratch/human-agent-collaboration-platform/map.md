# Phase 1 Issue Dependency Map

All 42 tickets are **resolved** as of v1.0. Blocking edges below reflect the original delivery order.

## Milestone Overview

| Milestone | Tickets | Theme |
|-----------|---------|-------|
| M0 | 01, 02, 16 | Contracts & skeleton |
| M1 | 03–10 | Project / Spec / WorkItem |
| M2 | 17–22 | Mock Executor vertical slice |
| M3 | 23–27 | Pi / exact rewind |
| M4 | 11–15 | Human + Agent membership |
| M5 | 28–33 | Structured collaboration |
| M6 | 34–38 | Change coordination / merge queue |
| M7 | 39–42 | OAuth end-to-end acceptance |

## Dependency Graph

```text
01 (health)
 └─ 02 (transactional project)
     ├─ 03 (git baseline)
     │   ├─ 05 (git-backed spec)
     │   │   └─ 06 (spec lifecycle)
     │   │       ├─ 07 (work item coverage)
     │   │       │   ├─ 08 (work graph consensus)
     │   │       │   ├─ 09 (exploration stale spec)
     │   │       │   ├─ 13 (capability gap)
     │   │       │   └─ 14 (assignment lifecycle)
     │   │       └─ 09
     │   ├─ 18 (isolated workspace) ← 17
     │   └─ 37 (semantic conflict) ← 36
     ├─ 04 (live dashboard)
     │   ├─ 17 (mock execution) ← 07, 14, 15, 16
     │   │   ├─ 18
     │   │   ├─ 20 (human intervention)
     │   │   │   ├─ 21 (failure/timeout)
     │   │   │   └─ 24 (composite checkpoint) ← 23
     │   │   └─ 34 (change intent)
     │   └─ 22 (worker recovery)
     └─ 10 (human membership)
         ├─ 11 (digital employee)
         ├─ 12 (private agent)
         ├─ 13
         └─ 15 (permission requests)

16 (executor contract) ← 01
 └─ 17

19 (diff/verification) ← 18
 ├─ 28 (artifact handoff)
 └─ 27 (compare branches) ← 25, 26 ← 24

23 (pi execution) ← 15, 16, 18
 └─ 24
     ├─ 25 (exact branch)
     └─ 26 (reconstructed branch)

28 → 30 (context package) ← 03, 06, 14, 15, 29
28 → 31 (contract stale) ← 09, 30
31 → 33 (inbox) ← 13, 15, 21, 32
31 → 35 (ownership conflict) ← 18, 28, 34
31 → 41 (oauth contract conflict)

27 → 36 (merge queue) ← 19, 34
36 → 37

29 ← 08
32 ← 04, 22, 28, 29

38 (repair/escalation) ← 21, 33, 35, 37

39 (oauth normal) ← 11, 12, 13, 23, 28, 30, 38
40 (oauth failure) ← 21, 27, 39
41 (oauth conflict) ← 31, 35, 38, 39

42 (phase 1 acceptance) ← 09, 22, 40, 41
```

## Critical Path to OAuth Acceptance

```text
01 → 02 → 03 → 05 → 06 → 07 → 14 → 17 → 18 → 19 → 28 → 30
→ 38 → 39 → 40/41 → 42
```

Parallel tracks that merge into M7:

- **Membership track:** 10 → 11/12/13 → 15 → 23
- **Checkpoint track:** 20 → 24 → 25/26 → 27
- **Coordination track:** 34 → 35 → 36 → 37 → 38

## Exit Gate

Ticket **#42** requires all three OAuth scenarios (normal, agent failure recovery, contract/semantic conflict) to run repeatably from the Web UI with full Timeline traceability.
