# Phase 2 Issue Dependency Map

Tickets are numbered from `01`. All start as `ready-for-agent` unless claimed.

## Dependency Graph

```text
01 (policy schema)
 └─ 02 (policy evaluator)
     └─ 03 (assignment suggestion UI + override audit)
         └─ 10 (oauth governance scenario)

04 (governance profile schema)
 └─ 05 (advisory veto workflow)
     └─ 09 (governance inbox extensions)
 └─ 06 (hard veto command gate)
     └─ 07 (veto resolution + superseding decision)
         └─ 09
             └─ 10

08 (upgrade proposal lifecycle)
 └─ 10
```

## Critical Path

```text
01 → 02 → 03 → 10
04 → 05 → 09 → 10
04 → 06 → 07 → 09 → 10
08 → 10
```

## Milestone Grouping

| Group | Tickets | Theme |
|-------|---------|-------|
| Assignment Policy | 01–03 | Suggest, override, audit |
| Governance / Veto | 04–07 | Profile, advisory, hard, resolution |
| Upgrade Proposal | 08 | Release upgrade lifecycle |
| Integration | 09–10 | Inbox + OAuth regression |

## Phase 1 Prerequisites (all resolved)

- #14 Assignment lifecycle
- #15 Agent permissions
- #29 Decision / Recorded Consensus
- #11 Digital Employee Release
- #33 Action Inbox
- #38 Protected merge
