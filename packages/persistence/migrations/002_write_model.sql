-- Core write model: aggregate state, immutable domain events, outbox, jobs.

CREATE TABLE IF NOT EXISTS humans (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES humans(id),
  version INTEGER NOT NULL,
  git_repo_path TEXT,
  base_branch TEXT,
  protected_branch TEXT,
  baseline_commit TEXT,
  verification_profile JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS human_memberships (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  human_id TEXT NOT NULL REFERENCES humans(id),
  role TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ,
  UNIQUE (project_id, human_id)
);

CREATE TABLE IF NOT EXISTS digital_employee_releases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  release_version TEXT NOT NULL,
  provenance TEXT NOT NULL,
  capabilities JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, release_version)
);

CREATE TABLE IF NOT EXISTS private_agent_copies (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  cultivator_id TEXT NOT NULL REFERENCES humans(id),
  name TEXT NOT NULL,
  manifest JSONB NOT NULL,
  config_summary TEXT NOT NULL,
  permission_demand JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_memberships (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  source_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  release_id TEXT,
  copy_id TEXT,
  snapshot_hash TEXT NOT NULL,
  capabilities JSONB NOT NULL,
  declared_permissions JSONB NOT NULL,
  policy_ceiling JSONB NOT NULL,
  approved_permissions JSONB NOT NULL,
  sponsor_id TEXT NOT NULL REFERENCES humans(id),
  cultivator_id TEXT,
  trust_status TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_generated_candidates (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  gap JSONB NOT NULL,
  config JSONB NOT NULL,
  status TEXT NOT NULL,
  membership_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS specifications (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  family_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  git_commit TEXT NOT NULL,
  body TEXT NOT NULL,
  body_hash TEXT NOT NULL,
  requirements JSONB NOT NULL,
  acceptance_criteria JSONB NOT NULL,
  review_result JSONB,
  supersedes TEXT,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  spec_id TEXT,
  kind TEXT NOT NULL,
  goal TEXT NOT NULL,
  acceptance_criteria JSONB NOT NULL,
  risk TEXT NOT NULL,
  affected_scope JSONB NOT NULL,
  required_capabilities JSONB NOT NULL,
  status TEXT NOT NULL,
  coverage JSONB NOT NULL,
  blocked_by JSONB NOT NULL DEFAULT '[]'::jsonb,
  assignment JSONB,
  stale_reason TEXT,
  exploration_bound TEXT,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recorded_consensus (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  result TEXT NOT NULL,
  recorder_id TEXT NOT NULL,
  rationale TEXT NOT NULL,
  disclaimer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permission_requests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  membership_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_scope TEXT NOT NULL,
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  decided_by TEXT,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS executions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  work_item_id TEXT NOT NULL,
  parent_execution_id TEXT,
  checkpoint_id TEXT,
  branch_kind TEXT NOT NULL,
  status TEXT NOT NULL,
  kernel TEXT NOT NULL,
  scenario TEXT,
  workspace_path TEXT,
  git_branch TEXT,
  base_commit TEXT,
  input_snapshot JSONB NOT NULL,
  context_package JSONB NOT NULL,
  last_output JSONB,
  selected BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  workspace_commit TEXT,
  kernel_ref JSONB,
  project_version INTEGER NOT NULL,
  input_version INTEGER NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  failure_evidence JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  work_item_id TEXT NOT NULL,
  producer_execution_id TEXT,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  body JSONB NOT NULL,
  supersedes TEXT,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS artifact_adoptions (
  id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL,
  artifact_version INTEGER NOT NULL,
  consumer_work_item_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  status TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  evidence TEXT,
  impact TEXT NOT NULL,
  proposer_id TEXT NOT NULL,
  result TEXT,
  rationale TEXT,
  recorder_id TEXT,
  supersedes TEXT,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS change_intents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  work_item_id TEXT NOT NULL,
  execution_id TEXT,
  status TEXT NOT NULL,
  files JSONB NOT NULL,
  symbols JSONB NOT NULL,
  contracts JSONB NOT NULL,
  risk TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conflicts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  left_work_item_id TEXT,
  right_work_item_id TEXT,
  details JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS merge_candidates (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  execution_id TEXT NOT NULL,
  status TEXT NOT NULL,
  queue_order INTEGER,
  verification JSONB,
  baseline_commit TEXT,
  shared_commit TEXT,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL,
  lease_owner TEXT,
  lease_until TIMESTAMPTZ,
  heartbeat_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inbox_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  href TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS domain_events (
  event_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  project_sequence BIGINT NOT NULL,
  aggregate_id TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_version INTEGER NOT NULL,
  type TEXT NOT NULL,
  actor JSONB NOT NULL,
  causation_id TEXT,
  correlation_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  payload_version INTEGER NOT NULL,
  payload JSONB NOT NULL,
  layer TEXT NOT NULL,
  UNIQUE (project_id, project_sequence)
);

CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES domain_events(event_id),
  project_id TEXT NOT NULL,
  project_sequence BIGINT NOT NULL,
  published_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS idempotency_records (
  idempotency_key TEXT PRIMARY KEY,
  command_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_sequences (
  project_id TEXT PRIMARY KEY,
  current_value BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS contract_ownership (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  path TEXT NOT NULL,
  kind TEXT NOT NULL,
  owner_membership_id TEXT,
  rules JSONB NOT NULL,
  UNIQUE (project_id, path)
);

CREATE INDEX IF NOT EXISTS domain_events_project_seq
  ON domain_events (project_id, project_sequence);
CREATE INDEX IF NOT EXISTS inbox_open
  ON inbox_items (project_id, status);
CREATE INDEX IF NOT EXISTS jobs_available
  ON jobs (status, lease_until);
