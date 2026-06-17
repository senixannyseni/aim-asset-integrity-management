-- Sprint 10: Tank Integrity Report Generation Engine
-- Report generation only. No API/API-ASME formula expression, AI extraction runtime, RBI quantitative calculation, CMMS integration, or work-order integration is implemented here.
-- Generated reports cite Formula Registry metadata and calculation traceability; draft reports remain draft until approved.

insert into permissions(permission_code, description) values
  ('report.read', 'Read generated tank integrity reports'),
  ('report.generate', 'Generate draft tank integrity reports'),
  ('report.review', 'Review draft tank integrity reports'),
  ('report.approve', 'Approve generated tank integrity reports'),
  ('report.issue', 'Issue approved tank integrity reports')
on conflict (permission_code) do update set description = excluded.description;

create table if not exists report_templates (
  id uuid primary key default gen_random_uuid(),
  template_code text not null unique,
  template_name text not null,
  template_version text not null default '1.0.0',
  output_formats jsonb not null default '["docx","pdf"]'::jsonb,
  sections_json jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('draft','active','retired')),
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  report_code text not null unique,
  report_title text not null,
  report_type text not null default 'tank_integrity',
  report_status text not null default 'draft' check (report_status in ('draft','generated','under_review','approved','issued','superseded','rejected')),
  report_version integer not null default 1 check (report_version > 0),
  asset_id uuid not null references assets(id) on delete restrict,
  calculation_run_id uuid not null references calculation_runs(id) on delete restrict,
  template_id uuid references report_templates(id),
  template_code text,
  format_requested jsonb not null default '["docx","pdf"]'::jsonb,
  docx_object_path text,
  pdf_object_path text,
  docx_content_base64 text,
  pdf_content_base64 text,
  plain_text_content text,
  input_snapshot_hash text,
  content_hash text not null,
  traceability_json jsonb not null default '{}'::jsonb,
  sections_json jsonb not null default '[]'::jsonb,
  evidence_register_json jsonb not null default '[]'::jsonb,
  validation_warnings_json jsonb not null default '[]'::jsonb,
  limitations_json jsonb not null default '[]'::jsonb,
  generated_by uuid references users(id),
  reviewed_by uuid references users(id),
  approved_by uuid references users(id),
  issued_by uuid references users(id),
  generated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  approved_at timestamptz,
  issued_at timestamptz,
  locked_flag boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(calculation_run_id, report_version)
);

create index if not exists idx_reports_asset_id on reports(asset_id);
create index if not exists idx_reports_calculation_run on reports(calculation_run_id);
create index if not exists idx_reports_status on reports(report_status);
create index if not exists idx_reports_input_snapshot_hash on reports(input_snapshot_hash);

create or replace function prevent_locked_report_change()
returns trigger as $$
begin
  if (old.locked_flag = true or old.report_status = 'issued') then
    raise exception 'Locked or issued report records cannot be modified or deleted. Create a new report version.';
  end if;
  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_locked_report_update on reports;
create trigger trg_prevent_locked_report_update
before update on reports
for each row execute function prevent_locked_report_change();

drop trigger if exists trg_prevent_locked_report_delete on reports;
create trigger trg_prevent_locked_report_delete
before delete on reports
for each row execute function prevent_locked_report_change();

insert into report_templates(template_code, template_name, template_version, output_formats, sections_json, status) values (
  'TANK-INTEGRITY-CONSULTANT-REPORT',
  'Tank Integrity Professional Consultant Report',
  '1.0.0',
  '["docx","pdf"]'::jsonb,
  '[
    "Engineering Basis Summary",
    "Asset Data Summary",
    "Inspection Data Summary",
    "NDT Thickness Summary",
    "Calculation Result",
    "Corrosion Rate and Remaining Life",
    "Minimum Thickness Check",
    "FFS/RBI Trigger Summary",
    "Engineering Interpretation",
    "Recommendations",
    "Evidence Register",
    "Review and Approval Record",
    "Validation Warnings and Limitations"
  ]'::jsonb,
  'active'
)
on conflict (template_code) do update set
  template_name = excluded.template_name,
  template_version = excluded.template_version,
  output_formats = excluded.output_formats,
  sections_json = excluded.sections_json,
  status = excluded.status,
  updated_at = now();

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('report.read','report.generate','report.review')
where r.role_code in ('engineer','senior_engineer','qa_qc')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('report.approve','report.issue')
where r.role_code in ('admin','senior_engineer')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('report.read')
where r.role_code = 'client_viewer'
on conflict do nothing;

-- ai_agent intentionally receives no report generation, approval, issue, or finalization permissions.
-- Report output is generated from locked or review-ready calculation runs only and remains DRAFT until approved.
-- No API/API-ASME formula expression is embedded or invented in report templates or generated report content.
