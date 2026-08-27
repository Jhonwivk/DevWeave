---
status: accepted
---

# Use a transactional write model with immutable domain events

The first platform version will keep authoritative domain state in PostgreSQL and write each state transition, immutable Domain Event, and Outbox record in one transaction. We rejected both full event sourcing and best-effort audit logging: the application needs straightforward queries and evolution during early development, while collaboration research and traceability require events that cannot drift from committed project state.

## Consequences

Project state is queried from normal write/read models, projections can be rebuilt from committed facts where designed, and every mutating Command must pass through a shared transaction boundary. Event payloads are versioned and history is corrected by appending new events rather than editing old ones.
