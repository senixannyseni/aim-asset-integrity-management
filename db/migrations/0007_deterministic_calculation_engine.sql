-- Sprint 6: Deterministic Calculation Engine
-- Universal deterministic calculations only. No API/API-ASME clause formula is embedded here.

alter table calculation_runs
  add column if not exists run_id text,
  add column if not exists run_status text not null default 'draft',
  add column if not exists formula_set_version text,
  add column if not exists input_snapshot_hash text,
  add column if not exists validation_status text not null default 'not_validated',
  add column if not exists output_summary jsonb not null default '{}'::jsonb,
  add column if not exists review_status text not null default 'not_reviewed',
  add column if not exists approval_status text not null default 'not_requested',
  add column if not exists initiated_by uuid references users(id),
  add column if not exists locked_flag boolean not null default false;

update calculation_runs
set
  run_id = coalesce(run_id, 'CALC-' || id::text),
  run_status = coalesce(run_status, status, 'draft'),
  formula_set_version = coalesce(formula_set_version, formula_registry_id::text || ':baseline'),
  input_snapshot_hash = coalesce(input_snapshot_hash, encode(digest(input_snapshot_json::text, 'sha256'), 'hex')),
  validation_status = coalesce(validation_status, case when status = 'validation_failed' then 'blocked' else 'not_validated' end),
  output_summary = coalesce(output_summary, '{}'::jsonb),
  review_status = coalesce(review_status, case when reviewer_id is not null then 'reviewed' else 'not_reviewed' end),
  approval_status = coalesce(approval_status, case when approver_id is not null then 'approved' else 'not_requested' end),
  initiated_by = coalesce(initiated_by, created_by),
  locked_flag = coalesce(locked_flag, locked_at is not null or status = 'locked')
where run_id is null
   or formula_set_version is null
   or input_snapshot_hash is null;

create unique index if not exists ux_calculation_runs_run_id on calculation_runs(run_id);
create index if not exists idx_calculation_runs_run_status on calculation_runs(run_status);
create index if not exists idx_calculation_runs_input_hash on calculation_runs(input_snapshot_hash);

create or replace function prevent_locked_calculation_run_change()
returns trigger as $$
begin
  if (old.locked_flag = true or old.status = 'locked' or old.run_status = 'locked') then
    raise exception 'Locked calculation_run records cannot be modified or deleted.';
  end if;
  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_locked_calculation_run_update on calculation_runs;
create trigger trg_prevent_locked_calculation_run_update
before update on calculation_runs
for each row execute function prevent_locked_calculation_run_change();

drop trigger if exists trg_prevent_locked_calculation_run_delete on calculation_runs;
create trigger trg_prevent_locked_calculation_run_delete
before delete on calculation_runs
for each row execute function prevent_locked_calculation_run_change();

insert into permissions(permission_code, description) values
  ('calculation.run', 'Run deterministic and controlled calculations'),
  ('calculation.read', 'Read calculation runs'),
  ('calculation.review', 'Review calculation runs'),
  ('calculation.approve', 'Approve calculation runs'),
  ('calculation.revise', 'Revise calculation runs')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('calculation.run','calculation.read','calculation.review','calculation.revise')
where r.role_code in ('engineer','senior_engineer')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('calculation.read','calculation.review')
where r.role_code in ('qa_qc')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code = 'calculation.read'
where r.role_code in ('client_viewer')
on conflict do nothing;

insert into formula_registry(
  formula_expression_source,
  formula_id,
  formula_code,
  formula_name,
  code_basis,
  code_edition,
  edition,
  clause_reference,
  component,
  damage_mechanism,
  formula_type,
  expression_type,
  expression_body,
  input_schema,
  output_schema,
  unit_rules,
  validation_rules,
  blocking_rules,
  test_case_reference,
  status,
  version,
  effective_date,
  approval_date,
  locked_flag
) values (
  'aim_internal_deterministic_engine_source',
  'AIM-UNIVERSAL-THICKNESS-CORROSION-ENGINE',
  'AIM-UNIVERSAL-THICKNESS-CORROSION-ENGINE',
  'AIM Universal Thickness Corrosion Deterministic Engine',
  'AIM Engineering Basis - universal deterministic calculations only',
  'AIM internal deterministic engine v1',
  'AIM internal deterministic engine v1',
  'AIM-DET-CALC-001 - no API/API-ASME clause expression embedded',
  'shell',
  'general_thickness_governance',
  'universal_deterministic',
  'json_logic',
  'AIM_INTERNAL_DETERMINISTIC_ENGINE_SOURCE_CODE_NO_API_FORMULA',
  '{"inputs":["ndt_measurements","retirement_thickness_mm","thresholds"]}'::jsonb,
  '{"outputs":["corrosion_rate_mm_per_year","remaining_life_years","pass_fail_status","warnings","trigger_candidates"]}'::jsonb,
  '{"thickness":"mm","corrosion_rate":"mm/year","remaining_life":"years"}'::jsonb,
  '{"requires_validation_result":"no blocking severity","requires_evidence_traceability":true}'::jsonb,
  '["do not execute API/API-ASME formula expressions outside Formula Registry","block when validation severity is blocking"]'::jsonb,
  'golden_dataset_universal_thickness_corrosion_v1',
  'approved',
  '1.0.0',
  current_date,
  now(),
  true
)
on conflict (formula_id, version) do update set
  formula_expression_source = excluded.formula_expression_source,
  formula_name = excluded.formula_name,
  code_basis = excluded.code_basis,
  code_edition = excluded.code_edition,
  edition = excluded.edition,
  clause_reference = excluded.clause_reference,
  component = excluded.component,
  damage_mechanism = excluded.damage_mechanism,
  formula_type = excluded.formula_type,
  expression_type = excluded.expression_type,
  expression_body = excluded.expression_body,
  input_schema = excluded.input_schema,
  output_schema = excluded.output_schema,
  unit_rules = excluded.unit_rules,
  validation_rules = excluded.validation_rules,
  blocking_rules = excluded.blocking_rules,
  test_case_reference = excluded.test_case_reference,
  status = excluded.status,
  locked_flag = excluded.locked_flag,
  updated_at = now();
