-- Sprint 5: Formula Registry Module
-- Controlled formula metadata/versioning only. No engineering calculation or API/ASME formula expression is implemented here.

create table if not exists formula_registry (
  id uuid primary key default gen_random_uuid(),
  formula_code text,
  formula_id text,
  formula_name text not null,
  code_basis text not null,
  code_edition text,
  edition text,
  clause_reference text not null,
  component text,
  damage_mechanism text,
  formula_type text not null default 'universal_deterministic',
  expression_type text not null default 'controlled_guardrail',
  expression_body text,
  input_schema jsonb not null default '{}'::jsonb,
  output_schema jsonb not null default '{}'::jsonb,
  inputs_schema jsonb,
  outputs_schema jsonb,
  unit_rules jsonb not null default '{}'::jsonb,
  units_schema jsonb,
  validation_rules jsonb not null default '{}'::jsonb,
  blocking_rules jsonb not null default '[]'::jsonb,
  test_case_reference text,
  formula_expression_source text,
  formula_expression text,
  status text not null default 'draft',
  version text not null default '0.1.0',
  effective_date date,
  approved_by uuid references users(id),
  approval_date timestamptz,
  locked_flag boolean not null default false,
  previous_formula_record_id uuid references formula_registry(id),
  created_by uuid references users(id),
  updated_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table formula_registry
  add column if not exists formula_code text,
  add column if not exists formula_id text,
  add column if not exists code_edition text,
  add column if not exists edition text,
  add column if not exists component text,
  add column if not exists damage_mechanism text,
  add column if not exists formula_type text not null default 'universal_deterministic',
  add column if not exists expression_type text not null default 'controlled_guardrail',
  add column if not exists expression_body text,
  add column if not exists input_schema jsonb not null default '{}'::jsonb,
  add column if not exists output_schema jsonb not null default '{}'::jsonb,
  add column if not exists inputs_schema jsonb,
  add column if not exists outputs_schema jsonb,
  add column if not exists unit_rules jsonb not null default '{}'::jsonb,
  add column if not exists units_schema jsonb,
  add column if not exists blocking_rules jsonb not null default '[]'::jsonb,
  add column if not exists test_case_reference text,
  add column if not exists formula_expression_source text,
  add column if not exists formula_expression text,
  add column if not exists effective_date date,
  add column if not exists approved_by uuid references users(id),
  add column if not exists approval_date timestamptz,
  add column if not exists locked_flag boolean not null default false,
  add column if not exists previous_formula_record_id uuid references formula_registry(id),
  add column if not exists created_by uuid references users(id),
  add column if not exists updated_by uuid references users(id),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table formula_registry drop constraint if exists formula_registry_status_check;
alter table formula_registry add constraint formula_registry_status_check
  check (status in ('draft', 'under_review', 'approved', 'deprecated', 'locked'));

alter table formula_registry drop constraint if exists formula_registry_formula_type_check;
alter table formula_registry add constraint formula_registry_formula_type_check
  check (formula_type in ('universal_deterministic', 'api_controlled', 'rbi_rule', 'ffs_trigger', 'report_phrase_rule'));

alter table formula_registry drop constraint if exists formula_registry_expression_type_check;
alter table formula_registry add constraint formula_registry_expression_type_check
  check (expression_type in ('none', 'controlled_guardrail', 'engineer_entered', 'json_logic', 'text_rule'));

update formula_registry
set
  formula_id = coalesce(formula_id, formula_code),
  formula_code = coalesce(formula_code, formula_id),
  code_edition = coalesce(code_edition, edition),
  edition = coalesce(edition, code_edition),
  input_schema = coalesce(nullif(input_schema, '{}'::jsonb), inputs_schema, '{}'::jsonb),
  output_schema = coalesce(nullif(output_schema, '{}'::jsonb), outputs_schema, '{}'::jsonb),
  unit_rules = coalesce(nullif(unit_rules, '{}'::jsonb), units_schema, '{}'::jsonb),
  expression_body = coalesce(expression_body, formula_expression),
  formula_expression_source = coalesce(formula_expression_source, 'licensed_engineer_entry_required'),
  expression_type = coalesce(expression_type, 'controlled_guardrail'),
  formula_type = coalesce(formula_type, 'universal_deterministic'),
  blocking_rules = coalesce(blocking_rules, '[]'::jsonb),
  locked_flag = coalesce(locked_flag, false),
  updated_at = now()
where formula_id is null
   or formula_code is null
   or code_edition is null
   or edition is null
   or input_schema = '{}'::jsonb
   or output_schema = '{}'::jsonb
   or unit_rules = '{}'::jsonb
   or formula_expression_source is null
   or expression_type is null
   or formula_type is null
   or blocking_rules is null;

alter table formula_registry alter column formula_expression_source set default 'licensed_engineer_entry_required';
alter table formula_registry alter column formula_expression_source set not null;

create unique index if not exists ux_formula_registry_formula_id_version on formula_registry(formula_id, version);
create index if not exists idx_formula_registry_status on formula_registry(status);
create index if not exists idx_formula_registry_formula_id on formula_registry(formula_id);
create index if not exists idx_formula_registry_type on formula_registry(formula_type);

create table if not exists formula_test_runs (
  id uuid primary key default gen_random_uuid(),
  formula_record_id uuid not null references formula_registry(id) on delete cascade,
  run_code text not null unique,
  test_case_reference text,
  input_snapshot_json jsonb not null default '{}'::jsonb,
  output_snapshot_json jsonb not null default '{}'::jsonb,
  result_status text not null default 'not_executed' check (result_status in ('not_executed', 'passed', 'failed', 'blocked')),
  message text not null,
  run_by uuid references users(id),
  created_at timestamptz not null default now()
);

insert into permissions(permission_code, description) values
  ('formula.test', 'Run Formula Registry guardrail test case checks')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('formula.read','formula.create','formula.update','formula.approve','formula.retire','formula.test')
where r.role_code in ('admin','senior_engineer')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code = 'formula.read'
where r.role_code in ('engineer','qa_qc','client_viewer')
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
  locked_flag
) values (
  'licensed_engineer_entry_required',
  'AIM-FORMULA-LICENSED-ENTRY-REQUIRED',
  'AIM-FORMULA-LICENSED-ENTRY-REQUIRED',
  'Licensed Engineer Formula Entry Required - Not Executable',
  'Engineering Basis / Licensed Standard / Engineer-approved workbook',
  'User-supplied licensed edition required',
  'User-supplied licensed edition required',
  'Manual entry required by authorized engineer',
  'shell',
  'general_thickness_governance',
  'api_controlled',
  'controlled_guardrail',
  'LICENSED_ENGINEER_ENTRY_REQUIRED',
  '{"inputs":"defined by authorized engineer"}'::jsonb,
  '{"outputs":"defined by authorized engineer"}'::jsonb,
  '{"rule":"units must be explicitly normalized before calculation"}'::jsonb,
  '{"rule":"guardrail entry cannot be executed"}'::jsonb,
  '["Do not use without approved status and licensed engineer-entered expression/source."]'::jsonb,
  'validation_workbook_or_engineer_fixture_required',
  'draft',
  '0.1.0',
  current_date,
  false
)
on conflict (formula_id, version) do update set
  formula_expression_source = excluded.formula_expression_source,
  formula_code = excluded.formula_code,
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
