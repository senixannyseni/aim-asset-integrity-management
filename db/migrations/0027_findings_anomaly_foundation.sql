-- RC4-H Findings / Anomaly Foundation
-- Findings are traceable engineering records only. This migration introduces no API/ASME formulas,
-- no FFS/RBI case creation logic, and no final integrity decision automation.

create table if not exists findings (
  id uuid primary key default gen_random_uuid(),
  finding_code text not null unique,
  asset_id uuid not null references assets(id) on delete restrict,
  inspection_event_id uuid references inspection_events(id) on delete set null,
  title text not null,
  description text,
  finding_type text not null check (finding_type in (
    'corrosion','wall_loss','pitting','crack','deformation','settlement','coating_defect','weld_defect',
    'nozzle_issue','roof_issue','floor_issue','documentation_gap','data_quality_issue','other'
  )),
  component text,
  shell_course_no integer check (shell_course_no is null or shell_course_no > 0),
  cml_tml_id text,
  grid_ref text,
  elevation text,
  orientation text,
  severity text not null check (severity in ('info','low','medium','high','critical')),
  status text not null default 'open' check (status in (
    'open','under_review','disposition_required','linked_to_ffs_candidate','linked_to_rbi_candidate',
    'resolved','closed','rejected_duplicate'
  )),
  source_type text not null default 'manual' check (source_type in (
    'manual','evidence_review','ndt_measurement','calculation_warning','validation_warning','inspection_report'
  )),
  source_entity_id uuid,
  evidence_file_id uuid references evidence_files(id) on delete set null,
  ndt_measurement_id uuid references ndt_measurements(id) on delete set null,
  calculation_run_id uuid references calculation_runs(id) on delete set null,
  validation_run_id uuid references validation_runs(id) on delete set null,
  identified_by uuid references users(id),
  identified_at timestamptz not null default now(),
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  closed_by uuid references users(id),
  closed_at timestamptz,
  closure_reason text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_findings_asset_id on findings(asset_id);
create index if not exists idx_findings_inspection_event_id on findings(inspection_event_id);
create index if not exists idx_findings_evidence_file_id on findings(evidence_file_id);
create index if not exists idx_findings_ndt_measurement_id on findings(ndt_measurement_id);
create index if not exists idx_findings_calculation_run_id on findings(calculation_run_id);
create index if not exists idx_findings_status_severity on findings(status, severity);
create index if not exists idx_findings_source on findings(source_type, source_entity_id);

insert into permissions(permission_code, description) values
  ('finding.read', 'Read findings and anomaly records'),
  ('finding.create', 'Create findings and anomaly records'),
  ('finding.update', 'Update findings and safe linkages'),
  ('finding.close', 'Close findings with human-governed closure reason')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('finding.read','finding.create','finding.update','finding.close')
where r.role_code in ('admin','senior_engineer','lead_engineer')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('finding.read','finding.create','finding.update')
where r.role_code in ('engineer','inspector','qa_qc')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code = 'finding.read'
where r.role_code in ('approver','management','client_viewer')
on conflict do nothing;
