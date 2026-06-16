-- Sprint 4: Engineering Data Dictionary and Validation Engine
-- Validation governance only. No engineering calculation, API/ASME formula execution, AI extraction runtime, or report generation is implemented here.

create table if not exists engineering_data_dictionary (
  id uuid primary key default gen_random_uuid(),
  group_name text not null,
  field_name text not null unique,
  label text not null,
  unit text,
  data_type text not null,
  allowed_range_json jsonb,
  required_status text not null check (required_status in ('required', 'conditional', 'optional', 'future')),
  source_preference text not null default 'engineer_entered',
  validation_severity text not null check (validation_severity in ('info', 'warning', 'blocking')),
  engineering_note text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists validation_runs (
  id uuid primary key default gen_random_uuid(),
  run_code text not null unique,
  validation_scope text not null default 'general',
  asset_id uuid references assets(id) on delete set null,
  request_payload_json jsonb not null,
  result_json jsonb not null,
  blocking_count integer not null default 0,
  warning_count integer not null default 0,
  info_count integer not null default 0,
  run_by uuid references users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_validation_runs_asset_id on validation_runs(asset_id);
create index if not exists idx_validation_runs_scope on validation_runs(validation_scope);
create index if not exists idx_validation_runs_created_at on validation_runs(created_at desc);

alter table materials
  add column if not exists material_allowable_stress_mpa numeric(12,3),
  add column if not exists allowable_stress_basis text;

insert into permissions(permission_code, description) values
  ('validation.read', 'Read engineering data dictionary and validation results'),
  ('validation.run', 'Run deterministic engineering validation checks')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('validation.read','validation.run')
where r.role_code in ('admin','engineer','senior_engineer','qa_qc')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code = 'validation.read'
where r.role_code in ('data_entry','inspector','client_viewer')
on conflict do nothing;

insert into engineering_data_dictionary(
  group_name, field_name, label, unit, data_type, allowed_range_json, required_status, source_preference, validation_severity, engineering_note
) values
  ('asset', 'code_edition', 'Code edition', null, 'text', null, 'required', 'engineer_entered', 'blocking', 'Required API/design/assessment edition basis. AIM must not infer standard editions.'),
  ('asset', 'original_design_code', 'Original design code', null, 'text', null, 'required', 'engineering_basis', 'warning', 'High-level design basis reference only. No standard clauses are reproduced.'),
  ('geometry', 'diameter', 'Tank diameter', 'm', 'number', '{"min":0,"exclusiveMin":true}'::jsonb, 'required', 'engineer_entered', 'blocking', 'Stored internally in meters. Missing diameter blocks calculation readiness.'),
  ('geometry', 'shell_height', 'Shell height', 'm', 'number', '{"min":0,"exclusiveMin":true}'::jsonb, 'required', 'engineer_entered', 'blocking', 'Stored internally in meters. Missing shell height blocks calculation readiness.'),
  ('shell_course', 'joint_efficiency', 'Joint efficiency', null, 'number', '{"min":0,"max":1}'::jsonb, 'required', 'engineer_entered', 'blocking', 'AIM must not infer joint efficiency.'),
  ('shell_course', 'nominal_thickness', 'Nominal thickness', 'mm', 'number', '{"min":0,"exclusiveMin":true}'::jsonb, 'conditional', 'inspection_record', 'warning', 'Stored internally in millimeters.'),
  ('material', 'material_allowable_stress_mpa', 'Material allowable stress', 'MPa', 'number', '{"min":0,"exclusiveMin":true}'::jsonb, 'conditional', 'engineer_approved_basis', 'blocking', 'Required only when a controlled Formula Registry object requests it. Do not invent values.'),
  ('ndt', 'measured_thickness', 'Measured thickness', 'mm', 'number', '{"min":0,"exclusiveMin":true}'::jsonb, 'conditional', 'ndt_record', 'blocking', 'Stored internally in millimeters and must link to evidence for final engineering use.'),
  ('evidence', 'evidence_file_id', 'Evidence link', null, 'uuid', null, 'conditional', 'evidence_repository', 'blocking', 'Critical NDT records and final approval gates require traceable evidence.'),
  ('formula', 'formula_registry', 'Formula Registry entry', null, 'object', null, 'conditional', 'formula_registry', 'blocking', 'Required for requested thickness check or calculation readiness. No API/API-ASME formula may be invented.'),
  ('approval', 'final_approval', 'Final approval gate', null, 'status', null, 'conditional', 'human_approval', 'blocking', 'Final approval cannot proceed while blocking validation issues remain. AI cannot approve.')
on conflict (field_name) do update set
  group_name = excluded.group_name,
  label = excluded.label,
  unit = excluded.unit,
  data_type = excluded.data_type,
  allowed_range_json = excluded.allowed_range_json,
  required_status = excluded.required_status,
  source_preference = excluded.source_preference,
  validation_severity = excluded.validation_severity,
  engineering_note = excluded.engineering_note,
  is_active = true,
  updated_at = now();
