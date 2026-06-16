-- Sprint 7: FFS Trigger Workflow
-- API 579-1/ASME FFS-1 governance alignment only.
-- This migration does not implement FFS calculations or declare fitness for service.

alter table ffs_cases
  add column if not exists case_id text,
  add column if not exists component text,
  add column if not exists damage_mechanism text,
  add column if not exists trigger_rule_id text,
  add column if not exists severity text not null default 'warning',
  add column if not exists evidence_links jsonb not null default '[]'::jsonb,
  add column if not exists assigned_engineer uuid references users(id),
  add column if not exists due_date date,
  add column if not exists final_disposition text,
  add column if not exists approval_record_id uuid references approval_records(id),
  add column if not exists trigger_measurements_json jsonb not null default '[]'::jsonb,
  add column if not exists required_next_action text not null default 'Engineer review required. FFS trigger does not declare fitness for service.',
  add column if not exists created_by uuid references users(id),
  add column if not exists updated_by uuid references users(id);

update ffs_cases
set
  case_id = coalesce(case_id, 'FFS-' || id::text),
  component = coalesce(component, 'unknown_component'),
  damage_mechanism = coalesce(damage_mechanism, 'engineering_review_required'),
  trigger_rule_id = coalesce(trigger_rule_id, 'legacy_trigger_review'),
  evidence_links = coalesce(evidence_links, '[]'::jsonb),
  trigger_measurements_json = coalesce(trigger_measurements_json, '[]'::jsonb),
  required_next_action = coalesce(required_next_action, 'Engineer review required. FFS trigger does not declare fitness for service.')
where case_id is null
   or component is null
   or damage_mechanism is null
   or trigger_rule_id is null;

alter table ffs_cases
  alter column case_id set not null,
  alter column component set not null,
  alter column damage_mechanism set not null,
  alter column trigger_rule_id set not null;

create unique index if not exists ux_ffs_cases_case_id on ffs_cases(case_id);
create index if not exists idx_ffs_cases_asset_status on ffs_cases(asset_id, status);
create index if not exists idx_ffs_cases_calculation_run on ffs_cases(calculation_run_id);
create index if not exists idx_ffs_cases_trigger_rule on ffs_cases(trigger_rule_id);

update ffs_cases
set status = case
  when status = 'assessment_requested' then 'assessment_in_progress'
  when status = 'cancelled' then 'closed'
  else status
end
where status in ('assessment_requested', 'cancelled');

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'ffs_cases'
      and constraint_name = 'ffs_cases_status_check'
  ) then
    alter table ffs_cases drop constraint ffs_cases_status_check;
  end if;
end $$;

alter table ffs_cases
  add constraint ffs_cases_status_check check (status in (
    'open',
    'under_review',
    'data_required',
    'assessment_in_progress',
    'accepted',
    'repair_required',
    'monitor',
    'closed'
  ));

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'ffs_cases'
      and constraint_name = 'ffs_cases_severity_check'
  ) then
    alter table ffs_cases add constraint ffs_cases_severity_check check (severity in ('info', 'warning', 'blocking', 'critical'));
  end if;
end $$;

create table if not exists ffs_trigger_rules (
  id uuid primary key default gen_random_uuid(),
  rule_id text not null unique,
  rule_name text not null,
  damage_mechanism text not null,
  trigger_source_type text not null,
  warning_codes text[] not null default '{}',
  default_severity text not null default 'warning' check (default_severity in ('info', 'warning', 'blocking', 'critical')),
  required_next_action text not null,
  active_flag boolean not null default true,
  governance_note text not null default 'Trigger only. Does not declare fitness for service. Requires engineer review under approved FFS workflow.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into ffs_trigger_rules(rule_id, rule_name, damage_mechanism, trigger_source_type, warning_codes, default_severity, required_next_action) values
  ('FFS-TRIG-LOCAL-THIN-AREA', 'Local thin area trigger candidate', 'local_thin_area', 'calculation_warning', array['BELOW_REQUIRED_THICKNESS','LOW_REMAINING_LIFE','FFS_TRIGGER_CANDIDATE'], 'blocking', 'Open FFS case for engineer review. Do not declare fitness automatically.'),
  ('FFS-TRIG-CRACK-LIKE', 'Crack-like indication trigger candidate', 'crack_like_indication', 'manual_finding', array['CRACK_LIKE_INDICATION'], 'critical', 'Assign senior engineer review and obtain qualified assessment basis.'),
  ('FFS-TRIG-DENT-GOUGE', 'Dent/gouge trigger candidate', 'dent_gouge', 'manual_finding', array['DENT_GOUGE'], 'warning', 'Review geometry/evidence and determine FFS assessment need.'),
  ('FFS-TRIG-SEVERE-CORROSION', 'Severe corrosion trigger candidate', 'severe_corrosion', 'calculation_warning', array['HIGH_CORROSION_RATE','BELOW_REQUIRED_THICKNESS'], 'warning', 'Review corrosion mechanism, evidence, and inspection scope.'),
  ('FFS-TRIG-SETTLEMENT', 'Settlement concern trigger candidate', 'settlement_concern', 'manual_finding', array['SETTLEMENT_CONCERN'], 'warning', 'Route to settlement/FFS review. No automatic acceptance.'),
  ('FFS-TRIG-OUT-OF-ROUNDNESS', 'Out-of-roundness trigger candidate', 'out_of_roundness', 'manual_finding', array['OUT_OF_ROUNDNESS'], 'warning', 'Review dimensional survey and determine assessment path.'),
  ('FFS-TRIG-BRITTLE-FRACTURE', 'Brittle fracture concern trigger candidate', 'brittle_fracture_concern', 'manual_finding', array['BRITTLE_FRACTURE_CONCERN'], 'critical', 'Escalate to senior engineer. Confirm material, temperature, and service basis.'),
  ('FFS-TRIG-THICKNESS-BELOW-SCREENING', 'Thickness below screening criteria trigger candidate', 'thickness_below_screening', 'calculation_warning', array['BELOW_REQUIRED_THICKNESS'], 'blocking', 'Open FFS case and block final disposition until reviewed.')
on conflict (rule_id) do update set
  rule_name = excluded.rule_name,
  damage_mechanism = excluded.damage_mechanism,
  trigger_source_type = excluded.trigger_source_type,
  warning_codes = excluded.warning_codes,
  default_severity = excluded.default_severity,
  required_next_action = excluded.required_next_action,
  active_flag = true,
  updated_at = now();

insert into permissions(permission_code, description) values
  ('ffs.read', 'Read FFS trigger cases'),
  ('ffs.create', 'Manually create FFS trigger cases'),
  ('ffs.update', 'Update FFS case workflow status and assignment'),
  ('ffs.close', 'Close FFS case after approved final disposition'),
  ('ffs.approve', 'Approve final FFS disposition')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('ffs.read','ffs.create','ffs.update','ffs.trigger','ffs.review','ffs.request_assessment','ffs.approve','ffs.close')
where r.role_code in ('admin')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('ffs.read','ffs.create','ffs.update','ffs.trigger','ffs.review')
where r.role_code in ('engineer')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('ffs.read','ffs.create','ffs.update','ffs.trigger','ffs.review','ffs.request_assessment','ffs.approve','ffs.close')
where r.role_code in ('senior_engineer')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('ffs.read','ffs.review')
where r.role_code in ('qa_qc')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code = 'ffs.read'
where r.role_code in ('client_viewer')
on conflict do nothing;
