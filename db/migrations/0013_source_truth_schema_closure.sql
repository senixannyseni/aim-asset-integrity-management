-- Phase 1 Governance Closure: source-of-truth schema readiness.
-- Scope-limited to missing database foundations required by AIM+n8n governance.
-- No API 579/API 581 quantitative implementation, CMMS integration, 3D processing,
-- AI extraction business workflow, or API/API-ASME formula expression is implemented here.

-- Source-of-truth formula version table. Existing formula_registry remains supported;
-- this table provides explicit version traceability for deterministic, auditable calculations.
create table if not exists formula_versions (
  id uuid primary key default gen_random_uuid(),
  formula_registry_id uuid references formula_registry(id) on delete restrict,
  formula_code text not null,
  formula_name text not null,
  version text not null,
  formula_status text not null default 'draft' check (formula_status in ('draft','under_review','approved','retired','rejected','locked')),
  deterministic_flag boolean not null default true,
  formula_expression_source text not null default 'approved_formula_registry_or_fixture_only',
  input_schema jsonb not null default '{}'::jsonb,
  output_schema jsonb not null default '{}'::jsonb,
  unit_rules jsonb not null default '{}'::jsonb,
  validation_rules jsonb not null default '{}'::jsonb,
  approved_by uuid references users(id),
  approved_at timestamptz,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(formula_code, version)
);

create index if not exists idx_formula_versions_registry_id on formula_versions(formula_registry_id);
create index if not exists idx_formula_versions_status on formula_versions(formula_status);
create index if not exists idx_formula_versions_code_version on formula_versions(formula_code, version);

alter table calculation_runs add column if not exists formula_version_id uuid references formula_versions(id) on delete restrict;
create index if not exists idx_calculation_runs_formula_version_id on calculation_runs(formula_version_id);

-- Backfill formula_versions from existing formula_registry metadata without introducing new formulas.
insert into formula_versions(
  formula_registry_id,
  formula_code,
  formula_name,
  version,
  formula_status,
  deterministic_flag,
  formula_expression_source,
  input_schema,
  output_schema,
  unit_rules,
  validation_rules,
  approved_by,
  approved_at,
  created_by
)
select
  fr.id,
  coalesce(fr.formula_id, fr.formula_code, 'UNSPECIFIED-FORMULA'),
  fr.formula_name,
  coalesce(fr.version, '0.1.0'),
  case
    when fr.status in ('approved','approved_active','locked') then 'approved'
    when fr.status in ('deprecated','retired') then 'retired'
    when fr.status = 'rejected' then 'rejected'
    when fr.status = 'under_review' then 'under_review'
    else 'draft'
  end,
  true,
  coalesce(fr.formula_expression_source, 'approved_formula_registry_or_fixture_only'),
  coalesce(fr.input_schema, fr.inputs_schema, '{}'::jsonb),
  coalesce(fr.output_schema, fr.outputs_schema, '{}'::jsonb),
  coalesce(fr.unit_rules, fr.units_schema, '{}'::jsonb),
  coalesce(fr.validation_rules, '{}'::jsonb),
  coalesce(fr.approved_by, fr.approver_id),
  coalesce(fr.approval_date, fr.approved_at),
  fr.created_by
from formula_registry fr
where coalesce(fr.formula_id, fr.formula_code) is not null
on conflict (formula_code, version) do update set
  formula_registry_id = excluded.formula_registry_id,
  formula_name = excluded.formula_name,
  formula_status = excluded.formula_status,
  deterministic_flag = excluded.deterministic_flag,
  formula_expression_source = excluded.formula_expression_source,
  input_schema = excluded.input_schema,
  output_schema = excluded.output_schema,
  unit_rules = excluded.unit_rules,
  validation_rules = excluded.validation_rules,
  approved_by = excluded.approved_by,
  approved_at = excluded.approved_at,
  updated_at = now();

update calculation_runs cr
set formula_version_id = fv.id
from formula_registry fr
join formula_versions fv
  on fv.formula_registry_id = fr.id
where cr.formula_registry_id = fr.id
  and cr.formula_version_id is null;

create table if not exists calculation_validation_cases (
  id uuid primary key default gen_random_uuid(),
  test_case_id text not null unique,
  formula_version_id uuid references formula_versions(id) on delete restrict,
  source_fixture text not null default 'validation_workbook',
  case_type text not null default 'mvp_calculation' check (case_type in ('mvp_calculation','negative_test','evidence_gate','unit_gate','review_gate')),
  input_json jsonb not null default '{}'::jsonb,
  expected_output_json jsonb not null default '{}'::jsonb,
  expected_status text not null default 'pending' check (expected_status in ('pending','ok','warning','blocked','failed')),
  evidence_requirement_status text not null default 'required' check (evidence_requirement_status in ('required','complete','missing','not_applicable')),
  review_status text not null default 'pending_review' check (review_status in ('pending_review','approved','rejected','superseded')),
  created_by uuid references users(id),
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_calculation_validation_cases_formula_version on calculation_validation_cases(formula_version_id);
create index if not exists idx_calculation_validation_cases_expected_status on calculation_validation_cases(expected_status);

-- AI extraction schema readiness. AI output is constrained to extraction/staging tables only;
-- promotion requires human review in later API workflow implementation.
create table if not exists extraction_jobs (
  id uuid primary key default gen_random_uuid(),
  extraction_job_code text not null unique,
  asset_id uuid references assets(id) on delete restrict,
  inspection_event_id uuid references inspection_events(id) on delete restrict,
  source_evidence_file_id uuid references evidence_files(id) on delete restrict,
  schema_name text not null,
  schema_version text not null default '1.0.0',
  prompt_version text,
  extraction_purpose text,
  status text not null default 'queued' check (status in ('queued','running','completed','failed','requires_manual_review','cancelled')),
  staging_only_flag boolean not null default true check (staging_only_flag = true),
  started_at timestamptz,
  completed_at timestamptz,
  failure_code text,
  failure_message text,
  created_by uuid references users(id),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_extraction_jobs_asset_id on extraction_jobs(asset_id);
create index if not exists idx_extraction_jobs_inspection_event_id on extraction_jobs(inspection_event_id);
create index if not exists idx_extraction_jobs_source_evidence_file_id on extraction_jobs(source_evidence_file_id);
create index if not exists idx_extraction_jobs_status on extraction_jobs(status);
create index if not exists idx_extraction_jobs_schema_name on extraction_jobs(schema_name);

create table if not exists extraction_fields (
  id uuid primary key default gen_random_uuid(),
  extraction_job_id uuid not null references extraction_jobs(id) on delete cascade,
  field_path text not null,
  field_name text not null,
  extracted_value text,
  normalized_value text,
  unit text,
  source_reference_json jsonb not null default '{}'::jsonb,
  confidence_score numeric(5,4) check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)),
  field_status text not null default 'needs_review' check (field_status in ('ai_extracted','needs_review','invalid','rejected_by_validation','approved_by_engineer','corrected_by_engineer','rejected_by_engineer')),
  review_required boolean not null default true,
  validation_flags text[] not null default '{}',
  reviewer_id uuid references users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(extraction_job_id, field_path)
);

create index if not exists idx_extraction_fields_job_id on extraction_fields(extraction_job_id);
create index if not exists idx_extraction_fields_status on extraction_fields(field_status);
create index if not exists idx_extraction_fields_review_required on extraction_fields(review_required);

create table if not exists staging_records (
  id uuid primary key default gen_random_uuid(),
  extraction_job_id uuid references extraction_jobs(id) on delete cascade,
  extraction_field_id uuid references extraction_fields(id) on delete set null,
  target_entity_type text,
  target_entity_id uuid,
  target_table text,
  target_column text,
  proposed_value text,
  normalized_value text,
  unit text,
  review_status text not null default 'pending_review' check (review_status in ('pending_review','approved_for_promotion','rejected','corrected','promoted','returned_for_evidence')),
  promotion_status text not null default 'not_promoted' check (promotion_status in ('not_promoted','blocked','promoted')),
  reviewer_id uuid references users(id),
  reviewed_at timestamptz,
  promoted_by uuid references users(id),
  promoted_at timestamptz,
  manual_entry_flag boolean not null default false,
  created_by uuid references users(id),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_staging_records_extraction_job_id on staging_records(extraction_job_id);
create index if not exists idx_staging_records_field_id on staging_records(extraction_field_id);
create index if not exists idx_staging_records_target on staging_records(target_entity_type, target_entity_id);
create index if not exists idx_staging_records_review_status on staging_records(review_status);
create index if not exists idx_staging_records_promotion_status on staging_records(promotion_status);

create table if not exists manual_overrides (
  id uuid primary key default gen_random_uuid(),
  staging_record_id uuid references staging_records(id) on delete cascade,
  extraction_field_id uuid references extraction_fields(id) on delete set null,
  original_value text,
  corrected_value text not null,
  corrected_unit text,
  correction_reason text not null,
  reviewer_id uuid not null references users(id),
  evidence_file_id uuid references evidence_files(id) on delete restrict,
  evidence_reference_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (staging_record_id is not null or extraction_field_id is not null)
);

create index if not exists idx_manual_overrides_staging_record_id on manual_overrides(staging_record_id);
create index if not exists idx_manual_overrides_extraction_field_id on manual_overrides(extraction_field_id);
create index if not exists idx_manual_overrides_reviewer_id on manual_overrides(reviewer_id);
create index if not exists idx_manual_overrides_evidence_file_id on manual_overrides(evidence_file_id);

create table if not exists data_quality_checks (
  id uuid primary key default gen_random_uuid(),
  extraction_job_id uuid references extraction_jobs(id) on delete cascade,
  extraction_field_id uuid references extraction_fields(id) on delete cascade,
  staging_record_id uuid references staging_records(id) on delete cascade,
  check_code text not null,
  severity text not null default 'warning' check (severity in ('info','warning','high','critical','blocking')),
  check_status text not null default 'failed' check (check_status in ('passed','failed','warning','blocked','resolved')),
  message text not null,
  is_blocking boolean not null default false,
  resolved_by uuid references users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_data_quality_checks_job_id on data_quality_checks(extraction_job_id);
create index if not exists idx_data_quality_checks_field_id on data_quality_checks(extraction_field_id);
create index if not exists idx_data_quality_checks_staging_record_id on data_quality_checks(staging_record_id);
create index if not exists idx_data_quality_checks_severity_status on data_quality_checks(severity, check_status);

create table if not exists integrity_decisions (
  id uuid primary key default gen_random_uuid(),
  decision_code text not null unique,
  asset_id uuid not null references assets(id) on delete restrict,
  inspection_event_id uuid references inspection_events(id) on delete restrict,
  calculation_run_id uuid references calculation_runs(id) on delete restrict,
  decision_type text not null default 'tank_integrity',
  integrity_status text not null default 'draft' check (integrity_status in ('draft','acceptable','watch','action_required','blocked','insufficient_data')),
  decision_status text not null default 'draft' check (decision_status in ('draft','pending_review','approved','rejected','superseded','blocked')),
  decision_summary text not null default '',
  required_action text,
  operating_limitation text,
  due_date date,
  created_by uuid references users(id),
  reviewed_by uuid references users(id),
  approved_by uuid references users(id),
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_integrity_decisions_asset_id on integrity_decisions(asset_id);
create index if not exists idx_integrity_decisions_inspection_event_id on integrity_decisions(inspection_event_id);
create index if not exists idx_integrity_decisions_calculation_run_id on integrity_decisions(calculation_run_id);
create index if not exists idx_integrity_decisions_status on integrity_decisions(integrity_status, decision_status);

create table if not exists review_gates (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  gate_domain text not null check (gate_domain in ('data_quality','evidence','calculation','integrity_decision','report_issue','approval','staging_promotion','work_order')),
  gate_type text not null,
  gate_status text not null default 'pending' check (gate_status in ('pending','pass','warning','fail','blocked','waived')),
  blocking boolean not null default true,
  evidence_link_required boolean not null default false,
  checked_by uuid references users(id),
  checked_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entity_type, entity_id, gate_domain, gate_type)
);

create index if not exists idx_review_gates_entity on review_gates(entity_type, entity_id);
create index if not exists idx_review_gates_domain_status on review_gates(gate_domain, gate_status);
create index if not exists idx_review_gates_blocking on review_gates(blocking) where blocking = true;

create table if not exists internal_work_orders (
  id uuid primary key default gen_random_uuid(),
  work_order_code text not null unique,
  asset_id uuid not null references assets(id) on delete restrict,
  source_entity_type text,
  source_entity_id uuid,
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','assigned','in_progress','blocked','completed','closed','cancelled')),
  recommended_action text,
  assigned_to uuid references users(id),
  due_date date,
  created_by uuid references users(id),
  closed_by uuid references users(id),
  closed_at timestamptz,
  closure_summary text,
  external_cmms_reference text,
  external_cmms_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_internal_work_orders_asset_id on internal_work_orders(asset_id);
create index if not exists idx_internal_work_orders_source on internal_work_orders(source_entity_type, source_entity_id);
create index if not exists idx_internal_work_orders_status_priority on internal_work_orders(status, priority);
create index if not exists idx_internal_work_orders_due_date on internal_work_orders(due_date);

create table if not exists report_versions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  report_version integer not null check (report_version > 0),
  version_status text not null default 'draft' check (version_status in ('draft','pending_review','approved','issued','superseded','rejected')),
  content_hash text,
  docx_object_path text,
  pdf_object_path text,
  generated_by uuid references users(id),
  approved_by uuid references users(id),
  issued_by uuid references users(id),
  generated_at timestamptz not null default now(),
  approved_at timestamptz,
  issued_at timestamptz,
  locked_flag boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(report_id, report_version)
);

create index if not exists idx_report_versions_report_id on report_versions(report_id);
create index if not exists idx_report_versions_status on report_versions(version_status);
create index if not exists idx_report_versions_locked on report_versions(locked_flag) where locked_flag = true;

create table if not exists report_exports (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  report_version_id uuid references report_versions(id) on delete cascade,
  export_format text not null check (export_format in ('pdf','docx','html','json')),
  export_status text not null default 'requested' check (export_status in ('requested','generated','failed','downloaded','superseded')),
  object_storage_uri text,
  checksum_sha256 text,
  exported_by uuid references users(id),
  exported_at timestamptz,
  downloaded_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_report_exports_report_id on report_exports(report_id);
create index if not exists idx_report_exports_version_id on report_exports(report_version_id);
create index if not exists idx_report_exports_format_status on report_exports(export_format, export_status);

create table if not exists workflow_tasks (
  id uuid primary key default gen_random_uuid(),
  workflow_event_id uuid references workflow_events(id) on delete set null,
  related_entity_type text,
  related_entity_id uuid,
  task_type text not null,
  owner_role text,
  assigned_to uuid references users(id),
  status text not null default 'open' check (status in ('queued','open','in_progress','escalated','completed','cancelled','failed')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  due_at timestamptz,
  completed_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workflow_tasks_workflow_event_id on workflow_tasks(workflow_event_id);
create index if not exists idx_workflow_tasks_related_entity on workflow_tasks(related_entity_type, related_entity_id);
create index if not exists idx_workflow_tasks_status_priority on workflow_tasks(status, priority);
create index if not exists idx_workflow_tasks_due_at on workflow_tasks(due_at);

create table if not exists notification_logs (
  id uuid primary key default gen_random_uuid(),
  workflow_task_id uuid references workflow_tasks(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  channel text not null check (channel in ('email','in_app','sms','webhook','teams','slack')),
  recipient text not null,
  subject text,
  message text not null,
  status text not null default 'queued' check (status in ('queued','sent','failed','suppressed')),
  provider_message_id text,
  sent_at timestamptz,
  failure_message text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_logs_workflow_task_id on notification_logs(workflow_task_id);
create index if not exists idx_notification_logs_user_id on notification_logs(user_id);
create index if not exists idx_notification_logs_status on notification_logs(status);
create index if not exists idx_notification_logs_created_at on notification_logs(created_at desc);

create table if not exists system_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null,
  setting_type text not null default 'json' check (setting_type in ('string','number','boolean','json')),
  description text,
  effective_from timestamptz not null default now(),
  requires_approval boolean not null default false,
  updated_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_system_settings_key on system_settings(setting_key);
create index if not exists idx_system_settings_requires_approval on system_settings(requires_approval);

insert into permissions(permission_code, description) values
  ('staging.review', 'Review AI extraction staging records'),
  ('staging.promote', 'Promote engineer-reviewed staging records into final AIM engineering tables'),
  ('manual_override.create', 'Create manual override records with reason and evidence reference'),
  ('data_quality_check.read', 'Read AI extraction and staging data quality checks'),
  ('integrity_decision.read', 'Read integrity decisions'),
  ('review_gate.read', 'Read review gate status'),
  ('review_gate.update', 'Update review gate status'),
  ('work_order.read', 'Read internal work orders'),
  ('workflow_task.read', 'Read workflow tasks'),
  ('workflow_task.update', 'Update workflow tasks'),
  ('notification_log.read', 'Read notification logs'),
  ('report.export', 'Export controlled report artifacts'),
  ('formula_version.read', 'Read formula versions'),
  ('formula_version.approve', 'Approve formula versions')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'ai_extraction.read','ai_extraction.review','ai_extraction.correct','staging.review','staging.promote','manual_override.create','data_quality_check.read',
  'integrity_decision.read','review_gate.read','work_order.read','workflow_task.read','notification_log.read','formula_version.read'
)
where r.role_code in ('engineer','senior_engineer','lead_engineer')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'integrity_decision.read','integrity_decision.approve','review_gate.read','review_gate.update','work_order.read','work_order.update','work_order.close',
  'report.export','formula_version.read','formula_version.approve'
)
where r.role_code in ('senior_engineer','lead_engineer','approver')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'system_settings.read','system_settings.update','workflow_task.read','workflow_task.update','notification_log.read','review_gate.read','audit.read'
)
where r.role_code in ('admin','it_admin')
on conflict do nothing;

-- n8n remains orchestration-only: it may create workflow events, tasks, notifications, and error logs through AIM APIs,
-- but receives no direct engineering approval, staging promotion, calculation approval, report issue, or final data-write authority.
-- AI extraction output remains non-final and schema-routed only into extraction_jobs, extraction_fields, and staging_records.
-- Evidence linkage for engineering records remains normalized through evidence_links.
