-- Sprint 8: RBI Interface and Trigger Workflow
-- API RP 580/581 governance-aligned interface only.
-- This migration does not implement proprietary quantitative API 581 rules.

alter table rbi_cases
  add column if not exists case_id text,
  add column if not exists calculation_run_id uuid references calculation_runs(id),
  add column if not exists system text,
  add column if not exists component text,
  add column if not exists damage_mechanism text,
  add column if not exists probability_driver text,
  add column if not exists consequence_driver text,
  add column if not exists risk_category text,
  add column if not exists recommended_interval text,
  add column if not exists inspection_plan_reference text,
  add column if not exists evidence_links jsonb not null default '[]'::jsonb,
  add column if not exists input_placeholders jsonb not null default '{}'::jsonb,
  add column if not exists trigger_source text not null default 'engineering_review',
  add column if not exists trigger_reason text,
  add column if not exists trigger_rule_id text,
  add column if not exists calculation_basis text not null default 'qualitative_placeholder_only_no_api_581_quantitative_rules',
  add column if not exists calculation_basis_note text not null default 'RBI interface only. Quantitative API RP 581 logic is not implemented unless approved Formula Registry rules are provided.',
  add column if not exists reviewer uuid references users(id),
  add column if not exists approver uuid references users(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists created_by uuid references users(id),
  add column if not exists updated_by uuid references users(id);

update rbi_cases
set
  case_id = coalesce(case_id, 'RBI-' || id::text),
  system = coalesce(system, 'tank_integrity'),
  component = coalesce(component, 'unknown_component'),
  damage_mechanism = coalesce(damage_mechanism, screening_data_json->>'damage_mechanism', 'engineering_review_required'),
  probability_driver = coalesce(probability_driver, screening_data_json->>'probability_driver', 'qualitative_placeholder'),
  consequence_driver = coalesce(consequence_driver, screening_data_json->>'consequence_driver', 'qualitative_placeholder'),
  risk_category = coalesce(risk_category, screening_data_json->>'risk_category', 'screening_required'),
  recommended_interval = coalesce(recommended_interval, screening_data_json->>'recommended_interval', 'engineer_review_required'),
  inspection_plan_reference = coalesce(inspection_plan_reference, screening_data_json->>'inspection_plan_reference', 'not_assigned'),
  evidence_links = coalesce(evidence_links, '[]'::jsonb),
  input_placeholders = coalesce(input_placeholders, screening_data_json, '{}'::jsonb),
  trigger_reason = coalesce(trigger_reason, source_note, 'RBI interface record migrated from baseline placeholder.'),
  trigger_rule_id = coalesce(trigger_rule_id, 'RBI-TRIG-ENGINEERING-REVIEW')
where case_id is null
   or component is null
   or risk_category is null
   or input_placeholders = '{}'::jsonb;

alter table rbi_cases
  alter column case_id set not null,
  alter column system set not null,
  alter column component set not null,
  alter column damage_mechanism set not null,
  alter column probability_driver set not null,
  alter column consequence_driver set not null,
  alter column risk_category set not null,
  alter column recommended_interval set not null,
  alter column inspection_plan_reference set not null,
  alter column trigger_reason set not null,
  alter column trigger_rule_id set not null;

create unique index if not exists ux_rbi_cases_case_id on rbi_cases(case_id);
create index if not exists idx_rbi_cases_asset_status on rbi_cases(asset_id, status);
create index if not exists idx_rbi_cases_calculation_run on rbi_cases(calculation_run_id);
create index if not exists idx_rbi_cases_risk_category on rbi_cases(risk_category);
create index if not exists idx_rbi_cases_damage_mechanism on rbi_cases(damage_mechanism);

update rbi_cases
set status = case
  when status = 'draft' then 'open'
  when status = 'ready_for_export' then 'ready_for_review'
  else status
end
where status in ('draft', 'ready_for_export');

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'rbi_cases'
      and constraint_name = 'rbi_cases_status_check'
  ) then
    alter table rbi_cases drop constraint rbi_cases_status_check;
  end if;
end $$;

alter table rbi_cases
  add constraint rbi_cases_status_check check (status in (
    'open',
    'under_review',
    'data_required',
    'assessment_in_progress',
    'ready_for_review',
    'approved',
    'exported',
    'closed'
  ));

create table if not exists rbi_trigger_rules (
  id uuid primary key default gen_random_uuid(),
  rule_id text not null unique,
  rule_name text not null,
  trigger_source_type text not null,
  warning_codes text[] not null default '{}',
  probability_driver text not null,
  consequence_driver text not null,
  default_risk_category text not null,
  recommended_interval text not null,
  inspection_plan_reference text not null,
  governance_note text not null default 'RBI trigger interface only. Does not implement quantitative API RP 581 calculations.',
  active_flag boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into rbi_trigger_rules(
  rule_id,
  rule_name,
  trigger_source_type,
  warning_codes,
  probability_driver,
  consequence_driver,
  default_risk_category,
  recommended_interval,
  inspection_plan_reference
) values
  ('RBI-TRIG-HIGH-CORROSION-RATE', 'High corrosion rate RBI trigger candidate', 'calculation_warning', array['HIGH_CORROSION_RATE','RBI_TRIGGER_CANDIDATE'], 'corrosion_rate_screening', 'consequence_placeholder_required', 'medium_high', 'engineer_review_required', 'update_inspection_plan_after_rbi_review'),
  ('RBI-TRIG-SHORT-REMAINING-LIFE', 'Short remaining life RBI trigger candidate', 'calculation_warning', array['LOW_REMAINING_LIFE','RBI_TRIGGER_CANDIDATE'], 'remaining_life_screening', 'consequence_placeholder_required', 'high', 'short_interval_review_required', 'review_or_escalate_inspection_plan'),
  ('RBI-TRIG-REPEATED-ANOMALY', 'Repeated anomaly RBI trigger candidate', 'engineering_review', array['REPEATED_ANOMALY'], 'repeated_anomaly_screening', 'consequence_placeholder_required', 'medium', 'engineer_review_required', 'review_damage_mechanism_and_history'),
  ('RBI-TRIG-ENGINEERING-REVIEW', 'Engineering review RBI trigger candidate', 'engineering_review', array['ENGINEERING_REVIEW'], 'engineering_review_placeholder', 'consequence_placeholder_required', 'screening_required', 'engineer_review_required', 'create_or_update_rbi_screening_record')
on conflict (rule_id) do update set
  rule_name = excluded.rule_name,
  trigger_source_type = excluded.trigger_source_type,
  warning_codes = excluded.warning_codes,
  probability_driver = excluded.probability_driver,
  consequence_driver = excluded.consequence_driver,
  default_risk_category = excluded.default_risk_category,
  recommended_interval = excluded.recommended_interval,
  inspection_plan_reference = excluded.inspection_plan_reference,
  active_flag = true,
  updated_at = now();

insert into permissions(permission_code, description) values
  ('rbi.interface.read', 'Read RBI interface cases'),
  ('rbi.interface.create', 'Create RBI interface cases and trigger records'),
  ('rbi.interface.update', 'Update RBI interface workflow status and review data'),
  ('rbi.interface.review', 'Review RBI interface records'),
  ('rbi.interface.approve', 'Approve RBI interface summary for export or inspection planning'),
  ('rbi.interface.export', 'Export RBI interface records')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('rbi.interface.read','rbi.interface.create','rbi.interface.update','rbi.interface.review','rbi.interface.approve','rbi.interface.export')
where r.role_code = 'admin'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('rbi.interface.read','rbi.interface.create','rbi.interface.update','rbi.interface.review')
where r.role_code = 'engineer'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('rbi.interface.read','rbi.interface.create','rbi.interface.update','rbi.interface.review','rbi.interface.approve','rbi.interface.export')
where r.role_code = 'senior_engineer'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('rbi.interface.read','rbi.interface.review')
where r.role_code = 'qa_qc'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code = 'rbi.interface.read'
where r.role_code = 'client_viewer'
on conflict do nothing;
