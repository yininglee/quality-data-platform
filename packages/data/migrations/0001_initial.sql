CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('platform', 'merchant')),
  merchant_type TEXT CHECK (merchant_type IN ('supplier', 'factory') OR merchant_type IS NULL),
  unified_credit_code TEXT UNIQUE,
  audit_status TEXT NOT NULL CHECK (audit_status IN ('pending', 'approved', 'rejected')),
  usage_status TEXT NOT NULL CHECK (usage_status IN ('enabled', 'disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((type = 'platform' AND merchant_type IS NULL) OR (type = 'merchant' AND merchant_type IS NOT NULL))
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  mobile TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('enabled', 'disabled')),
  default_organization_id TEXT NOT NULL REFERENCES organizations(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  built_in INTEGER NOT NULL DEFAULT 0 CHECK (built_in IN (0, 1)),
  created_at TEXT NOT NULL,
  UNIQUE (organization_id, code)
);

CREATE TABLE permissions (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE user_organizations (
  user_id TEXT NOT NULL REFERENCES users(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  PRIMARY KEY (user_id, organization_id)
);

CREATE TABLE user_roles (
  user_id TEXT NOT NULL REFERENCES users(id),
  role_id TEXT NOT NULL REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id),
  permission_code TEXT NOT NULL REFERENCES permissions(code),
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE business_types (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL UNIQUE,
  built_in INTEGER NOT NULL DEFAULT 1 CHECK (built_in IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE form_template_versions (
  id TEXT PRIMARY KEY,
  business_type_code TEXT NOT NULL REFERENCES business_types(code),
  version INTEGER NOT NULL CHECK (version > 0),
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'retired')),
  field_schema_json TEXT NOT NULL,
  layout_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  published_at TEXT,
  UNIQUE (business_type_code, version)
);

CREATE TABLE workflow_versions (
  id TEXT PRIMARY KEY,
  business_type_code TEXT NOT NULL REFERENCES business_types(code),
  version INTEGER NOT NULL CHECK (version > 0),
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'retired')),
  definition_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  published_at TEXT,
  UNIQUE (business_type_code, version)
);

CREATE TABLE business_records (
  id TEXT PRIMARY KEY,
  business_no TEXT NOT NULL UNIQUE,
  business_type_code TEXT NOT NULL REFERENCES business_types(code),
  submitter_organization_id TEXT NOT NULL REFERENCES organizations(id),
  current_handler_organization_id TEXT REFERENCES organizations(id),
  form_template_version_id TEXT NOT NULL REFERENCES form_template_versions(id),
  workflow_version_id TEXT NOT NULL REFERENCES workflow_versions(id),
  source_record_id TEXT REFERENCES business_records(id),
  state TEXT NOT NULL,
  form_data_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  submitted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE workflow_events (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL REFERENCES business_records(id),
  from_state TEXT,
  to_state TEXT NOT NULL,
  command TEXT NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  actor_organization_id TEXT NOT NULL REFERENCES organizations(id),
  workflow_version_id TEXT NOT NULL REFERENCES workflow_versions(id),
  occurred_at TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE TABLE todo_tasks (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL REFERENCES business_records(id),
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  handler_type TEXT NOT NULL CHECK (handler_type IN ('platform', 'merchant')),
  handler_organization_id TEXT REFERENCES organizations(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL REFERENCES business_records(id),
  field_code TEXT NOT NULL DEFAULT 'FIELD_009',
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0 AND size_bytes <= 10485760),
  storage_key TEXT NOT NULL UNIQUE,
  uploader_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  detail_json TEXT NOT NULL
);

CREATE TABLE seed_scenarios (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  seed TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  organization_ids_json TEXT NOT NULL,
  anomaly_label TEXT NOT NULL,
  root_cause_code TEXT NOT NULL,
  expected_truth_json TEXT NOT NULL
);

CREATE TABLE seed_runs (
  id TEXT PRIMARY KEY,
  seed TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  timezone TEXT NOT NULL,
  manifest_json TEXT NOT NULL
);

CREATE INDEX idx_records_type_state ON business_records (business_type_code, state);
CREATE INDEX idx_records_submitter ON business_records (submitter_organization_id, submitted_at);
CREATE INDEX idx_records_handler ON business_records (current_handler_organization_id, state);
CREATE INDEX idx_tasks_handler_status ON todo_tasks (handler_organization_id, status);
CREATE INDEX idx_events_record_time ON workflow_events (record_id, occurred_at);
CREATE INDEX idx_audit_entity ON audit_events (entity_type, entity_id, occurred_at);
