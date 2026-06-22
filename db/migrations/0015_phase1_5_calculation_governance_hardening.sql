-- Phase 1.5 Calculation Engine Governance Hardening.
-- Scope-limited to deterministic, versioned, auditable MVP formula governance.
-- No API 579/API 581 quantitative implementation, CMMS integration, 3D processing,
-- or invented API/API-ASME formula expression is implemented here.

alter table calculation_runs
  add column if not exists formula_version_snapshot_json jsonb not null default '{}'::jsonb,
  add column if not exists output_snapshot_json jsonb not null default '{}'::jsonb,
  add column if not exists final_use_status text not null default 'requires_engineering_review',
  add column if not exists final_use_disclaimer text not null default 'Engineering review required before final use.',
  add column if not exists final_use_blockers_json jsonb not null default '[]'::jsonb,
  add column if not exists output_snapshot_hash text;

alter table calculation_runs drop constraint if exists calculation_runs_final_use_status_check;
alter table calculation_runs add constraint calculation_runs_final_use_status_check
  check (final_use_status in ('blocked','requires_engineering_review','approved_for_final_use'));

update calculation_runs cr
set formula_version_snapshot_json = case
      when cr.formula_version_snapshot_json = '{}'::jsonb and fv.id is not null then jsonb_build_object(
        'formula_version_id', fv.id,
        'formula_registry_id', fv.formula_registry_id,
        'formula_code', fv.formula_code,
        'formula_name', fv.formula_name,
        'version', fv.version,
        'formula_status', fv.formula_status,
        'deterministic_flag', fv.deterministic_flag,
        'formula_expression_source', fv.formula_expression_source,
        'approved_at', fv.approved_at
      )
      else cr.formula_version_snapshot_json
    end,
    output_snapshot_json = case
      when cr.output_snapshot_json = '{}'::jsonb then jsonb_build_object(
        'output_summary', cr.output_summary,
        'warnings', cr.warnings_json,
        'final_use_disclaimer', 'Engineering review required before final use.'
      )
      else cr.output_snapshot_json
    end,
    final_use_status = case
      when cr.validation_status = 'blocked' then 'blocked'
      when cr.approval_status = 'approved' then 'approved_for_final_use'
      else 'requires_engineering_review'
    end,
    final_use_disclaimer = 'Engineering review required before final use.',
    final_use_blockers_json = case
      when cr.validation_status = 'blocked' then '["VALIDATION_BLOCKED"]'::jsonb
      else cr.final_use_blockers_json
    end,
    output_snapshot_hash = coalesce(cr.output_snapshot_hash, encode(digest(coalesce(cr.output_summary::text, '{}'), 'sha256'), 'hex'))
from formula_versions fv
where cr.formula_version_id = fv.id;

create index if not exists idx_calculation_runs_final_use_status on calculation_runs(final_use_status);
create index if not exists idx_calculation_runs_output_snapshot_hash on calculation_runs(output_snapshot_hash);

alter table calculation_outputs
  add column if not exists final_use_disclaimer text not null default 'Engineering review required before final use.';

update calculation_outputs
set output_json = output_json || jsonb_build_object('final_use_disclaimer', 'Engineering review required before final use.'),
    final_use_disclaimer = 'Engineering review required before final use.'
where output_json ? 'final_use_disclaimer' = false;

insert into permissions(permission_code, description) values
  ('calculation.reject', 'Reject calculation outputs with reason and audit trail'),
  ('calculation.final_use_block', 'Record calculation final-use block events')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('calculation.run','calculation.read','calculation.review','calculation.approve','calculation.reject')
where r.role_code in ('engineer','senior_engineer','lead_engineer','approver','admin')
on conflict do nothing;

-- Governance marker strings used by contract tests and implementation review:
-- explicit approved formula version required
-- no silent formula default
-- formula_version_snapshot_json preserves formula version ID/code/name/version/status/source
-- input_snapshot_json and output_snapshot_json are immutable run evidence for deterministic repeatability
-- Engineering review required before final use.
-- calculation.run_requested calculation.completed calculation.failed calculation.warning_raised calculation.reviewed calculation.approved calculation.rejected calculation.final_use_blocked
-- missing evidence blocks approval/final use
-- unit mismatch blocks final use until Engineer review confirms deterministic conversion basis
