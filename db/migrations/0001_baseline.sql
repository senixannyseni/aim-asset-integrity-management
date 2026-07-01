create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  password_hash text not null,
  status text not null default 'active' check (status in ('active', 'inactive', 'locked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  role_code text not null unique,
  role_name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  permission_code text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists user_roles (
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table if not exists role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  asset_tag text not null unique,
  asset_name text not null,
  asset_type text not null default 'aboveground_storage_tank' check (asset_type in ('aboveground_storage_tank')),
  facility text,
  area text,
  service_fluid text,
  status text not null default 'draft' check (status in ('draft', 'active', 'inactive', 'retired', 'approved')),
  design_code text,
  design_code_edition text,
  owner_user_id uuid references users(id),
  approved_by uuid references users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  material_code text not null unique,
  material_name text not null,
  material_specification text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists tank_geometry (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null unique references assets(id) on delete cascade,
  diameter_m numeric(12,4),
  height_m numeric(12,4),
  nominal_capacity_m3 numeric(14,4),
  design_liquid_level_m numeric(12,4),
  bottom_type text,
  roof_type text,
  foundation_type text,
  construction_year integer,
  design_pressure_kpa numeric(12,4),
  design_temperature_c numeric(12,4),
  specific_gravity numeric(8,4),
  source_evidence_id uuid,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shell_courses (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  course_no integer not null check (course_no > 0),
  material_id uuid references materials(id),
  nominal_thickness_mm numeric(10,3),
  minimum_required_thickness_mm numeric(10,3),
  height_mm numeric(12,3),
  joint_efficiency numeric(6,4),
  corrosion_allowance_mm numeric(10,3),
  source_evidence_id uuid,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(asset_id, course_no)
);

create table if not exists inspection_events (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  inspection_code text not null unique,
  inspection_type text not null check (inspection_type in ('external', 'internal', 'on_stream', 'out_of_service', 'settlement_survey', 'bottom_inspection', 'cp_survey', 'lining_inspection')),
  inspection_date date not null,
  inspector_user_id uuid references users(id),
  summary text,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'rejected', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists evidence_files (
  id uuid primary key default gen_random_uuid(),
  evidence_code text not null unique,
  asset_id uuid references assets(id),
  inspection_event_id uuid references inspection_events(id),
  object_storage_uri text not null,
  original_filename text not null,
  file_extension text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes >= 0),
  checksum_sha256 text not null,
  method text,
  component text,
  cml_tml_grid_reference text,
  inspection_date date,
  page_figure_table_reference text,
  uploaded_by uuid references users(id),
  status text not null default 'active' check (status in ('active', 'superseded', 'delete_requested', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(checksum_sha256, object_storage_uri)
);
create table if not exists evidence_links (
  id uuid primary key default gen_random_uuid(),
  evidence_file_id uuid not null references evidence_files(id) on delete restrict,
  linked_entity_type text not null,
  linked_entity_id uuid not null,
  link_reason text not null,
  linked_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique(evidence_file_id, linked_entity_type, linked_entity_id)
);

create table if not exists formula_registry (
  id uuid primary key default gen_random_uuid(),
  formula_code text not null,
  formula_name text not null,
  code_basis text not null,
  clause_reference text,
  edition text,
  inputs_schema jsonb not null default '{}'::jsonb,
  outputs_schema jsonb not null default '{}'::jsonb,
  units_schema jsonb not null default '{}'::jsonb,
  validation_rules jsonb not null default '[]'::jsonb,
  formula_expression_source text not null,
  formula_expression text,
  version text not null,
  status text not null default 'draft' check (status in ('draft', 'under_review', 'approved_active', 'retired', 'rejected')),
  approver_id uuid references users(id),
  approved_at timestamptz,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(formula_code, version)
);

create table if not exists calculation_runs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete restrict,
  inspection_event_id uuid references inspection_events(id),
  formula_registry_id uuid not null references formula_registry(id) on delete restrict,
  run_version integer not null default 1 check (run_version > 0),
  status text not null default 'draft' check (status in ('draft', 'validation_failed', 'ready_for_review', 'reviewed', 'approved', 'rejected', 'locked', 'superseded')),
  input_snapshot_json jsonb not null default '{}'::jsonb,
  unit_normalized_input_json jsonb not null default '{}'::jsonb,
  validation_result_json jsonb not null default '{}'::jsonb,
  warnings_json jsonb not null default '[]'::jsonb,
  reviewer_id uuid references users(id),
  approver_id uuid references users(id),
  reviewed_at timestamptz,
  approved_at timestamptz,
  locked_at timestamptz,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique(asset_id, formula_registry_id, run_version)
);

create table if not exists calculation_inputs (
  id uuid primary key default gen_random_uuid(),
  calculation_run_id uuid not null references calculation_runs(id) on delete cascade,
  input_name text not null,
  raw_value text,
  normalized_value numeric,
  raw_unit text,
  normalized_unit text,
  source_entity_type text,
  source_entity_id uuid,
  evidence_file_id uuid references evidence_files(id),
  validation_status text not null default 'not_validated' check (validation_status in ('not_validated', 'valid', 'warning', 'blocked')),
  created_at timestamptz not null default now()
);

create table if not exists calculation_outputs (
  id uuid primary key default gen_random_uuid(),
  calculation_run_id uuid not null references calculation_runs(id) on delete cascade,
  output_name text not null,
  output_value numeric,
  output_unit text,
  output_json jsonb not null default '{}'::jsonb,
  warning_code text,
  warning_message text,
  created_at timestamptz not null default now()
);

create table if not exists engineering_reviews (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  review_type text not null,
  reviewer_id uuid not null references users(id),
  review_status text not null check (review_status in ('requested', 'reviewed', 'changes_requested', 'rejected')),
  review_comment text,
  reviewed_at timestamptz not null default now()
);

create table if not exists approval_records (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  approval_status text not null check (approval_status in ('requested', 'approved', 'rejected', 'revoked')),
  approver_id uuid not null references users(id),
  approval_comment text,
  approved_at timestamptz not null default now()
);

create table if not exists ffs_cases (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete restrict,
  inspection_event_id uuid references inspection_events(id),
  trigger_source text not null,
  trigger_reason text not null,
  calculation_run_id uuid references calculation_runs(id),
  status text not null default 'open' check (status in ('open', 'under_review', 'assessment_requested', 'closed', 'cancelled')),
  owner_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rbi_cases (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete restrict,
  inspection_event_id uuid references inspection_events(id),
  interface_type text not null default 'screening_interface',
  status text not null default 'draft' check (status in ('draft', 'ready_for_export', 'exported', 'closed')),
  screening_data_json jsonb not null default '{}'::jsonb,
  source_note text not null default 'MVP interface only. Full API RP 581 quantitative RBI requires approved Formula Registry rules.',
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_user_id uuid references users(id),
  actor_role_codes text[] not null default '{}',
  entity_type text,
  entity_id uuid,
  request_id text,
  ip_address inet,
  user_agent text,
  before_json jsonb,
  after_json jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_assets_asset_tag on assets(asset_tag);
create index if not exists idx_shell_courses_asset_id on shell_courses(asset_id);
create index if not exists idx_inspection_events_asset_id on inspection_events(asset_id);
create index if not exists idx_evidence_files_asset_id on evidence_files(asset_id);
create index if not exists idx_evidence_links_entity on evidence_links(linked_entity_type, linked_entity_id);
create index if not exists idx_calculation_runs_asset_id on calculation_runs(asset_id);
create index if not exists idx_audit_logs_entity on audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_event_type on audit_logs(event_type);
