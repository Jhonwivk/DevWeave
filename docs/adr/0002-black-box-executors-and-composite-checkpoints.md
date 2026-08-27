---
status: accepted
---

# Treat execution kernels as black boxes and align checkpoints by reference

Pi, Codex, Claude Code, and future coding agents remain black-box Execution Kernels behind a versioned Executor Adapter; the platform does not normalize their internal reasoning or session format. Exact rewind is implemented by atomically pairing a platform-managed Workspace Checkpoint with an opaque Kernel Checkpoint Reference from the same stable boundary, which preserves kernel independence while allowing the Agent and code workspace to branch from the same historical node.

## Consequences

Adapters must declare checkpoint and fork capabilities, retain durable version metadata, and never expose reconstructed branches as exact rewind. If either side of a composite checkpoint cannot be restored, the platform preserves the original Execution and reports a restore failure instead of continuing with mismatched Agent and Workspace state.
