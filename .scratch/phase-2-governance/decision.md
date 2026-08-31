# Phase 2 Direction Decision

**Status:** decided  
**Date:** 2026-08-31  
**Chosen route:** B — Collaboration & Governance

## Context

Phase 1 (v1.0) delivered the full Project-Centric collaboration loop with manual Human assignment, Recorded Consensus, and fixed Agent Membership permissions. Phase 2 must answer the next research question without expanding into infrastructure or large-scale experiments.

## Options considered

| Route | Summary | Why not first |
|-------|---------|---------------|
| A — Hardening | Doc closeout, Pi coverage, non-OAuth paths | Necessary prep work, not a product direction (partially done in this effort) |
| **B — Governance** | Assignment Policy, Veto, Upgrade Proposal | **Selected** — natural extension of Phase 1 manual flows |
| C — Infrastructure | Multi-kernel, remote hosts, SSO/RBAC | Out of Phase 1 scope; high cost; no research hypothesis yet |
| D — Research platform | Team YAML, experiment orchestration | Depends on governance primitives from Route B |

## Phase 2 MVP scope

Deliver three vertical slices in order:

1. **Assignment Policy** — configurable rules that suggest Work Item assignees while preserving Human override and audit trail.
2. **Governance / Veto** — project-level governance profile with advisory and hard veto on high-risk actions.
3. **Digital Employee Upgrade Proposal** — formal upgrade path when a newer Release is available, without silently mutating existing Memberships.

## Explicitly deferred to later phases

- Agent marketplace / cross-org registry
- Dynamic team topology configuration
- Cross-project learning policy
- Large-scale experiment orchestration (Phase 3)
- Enterprise SSO / full RBAC
- Remote execution hosts

## Success criteria

- OAuth fixture gains a fourth governance scenario exercising policy suggestion, veto, and upgrade proposal.
- All governance actions are Traceable Operations visible on Timeline.
- Phase 1 manual assignment and Recorded Consensus remain available as fallback modes.
