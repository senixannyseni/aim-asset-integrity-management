-- RC4-AA: Calculation formula-library runtime bridge.
-- Scope: seed controlled AIM MVP shell-thickness fixture formulas into the existing
-- formula_registry/formula_versions schema so calculation runs can persist traceable
-- calculation_runs, calculation_inputs, and calculation_outputs.
-- Safety: no API/API-ASME clause text or proprietary standard formula is embedded.
-- Final engineering use remains blocked until human review/approval gates pass.

insert into formula_registry(
  id,
  formula_code,
  formula_id,
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
  formula_expression_source,
  formula_expression,
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
) values
(
  'f6531000-0000-4000-8000-000000000101',
  'corrosion_rate',
  'corrosion_rate',
  'MVP Shell Thickness Corrosion Rate',
  'AIM MVP fixture based on explicit workbook/test-case basis only; API 653 high-level governance context without standard clause reproduction',
  'AIM MVP 1.0.0',
  'AIM MVP 1.0.0',
  'AIM-CALC-MVP-FIXTURE-NO-STANDARD-CLAUSE',
  'shell_course',
  'thickness_loss_screening',
  'universal_deterministic',
  'controlled_placeholder',
  'AIM_ENGINE_BUILTIN:CORROSION_RATE_MVP_V1',
  'AIM_ENGINE_BUILTIN:CORROSION_RATE_MVP_V1',
  null,
  '[{"key":"previous_thickness_mm","unit":"mm","required":true},{"key":"current_thickness_mm","unit":"mm","required":true},{"key":"years_between_inspections","unit":"year","required":true},{"key":"reading_unit","allowed_values":["mm"],"required":true},{"key":"evidence_code","required":true}]'::jsonb,
  '[{"key":"corrosion_rate_mm_y","unit":"mm/year"},{"key":"calculation_status"},{"key":"warning_code"},{"key":"disclaimer"}]'::jsonb,
  '{"thickness":"mm","corrosion_rate":"mm/year","time":"year"}'::jsonb,
  '["years_between_inspections must be greater than zero","unit mismatch blocks final use","missing evidence blocks promotion/final use","negative corrosion rate requires data review"]'::jsonb,
  '["no eval or dynamic formula execution","no API/API-ASME formula text embedded","engineering review required before final use"]'::jsonb,
  'calculation_formula_library_test_cases.csv#TC-001..TC-008',
  'approved',
  '1.0.0',
  current_date,
  now(),
  true
),
(
  'f6531000-0000-4000-8000-000000000102',
  'remaining_life',
  'remaining_life',
  'MVP Shell Thickness Remaining Life',
  'AIM MVP fixture based on explicit workbook/test-case basis only; API 653 high-level governance context without standard clause reproduction',
  'AIM MVP 1.0.0',
  'AIM MVP 1.0.0',
  'AIM-CALC-MVP-FIXTURE-NO-STANDARD-CLAUSE',
  'shell_course',
  'thickness_remaining_life_screening',
  'universal_deterministic',
  'controlled_placeholder',
  'AIM_ENGINE_BUILTIN:REMAINING_LIFE_MVP_V1',
  'AIM_ENGINE_BUILTIN:REMAINING_LIFE_MVP_V1',
  null,
  '[{"key":"current_thickness_mm","unit":"mm","required":true},{"key":"minimum_required_thickness_mm","unit":"mm","required":true},{"key":"corrosion_rate_mm_y","unit":"mm/year","required":true},{"key":"reading_unit","allowed_values":["mm"],"required":true},{"key":"evidence_code","required":true}]'::jsonb,
  '[{"key":"remaining_life_y","unit":"year"},{"key":"calculation_status"},{"key":"warning_code"},{"key":"disclaimer"}]'::jsonb,
  '{"thickness":"mm","corrosion_rate":"mm/year","remaining_life":"year"}'::jsonb,
  '["zero corrosion rate returns controlled N/A","negative corrosion rate requires data review","current thickness below minimum requires engineering review","missing evidence blocks promotion/final use"]'::jsonb,
  '["no eval or dynamic formula execution","no API/API-ASME formula text embedded","engineering review required before final use"]'::jsonb,
  'calculation_formula_library_test_cases.csv#TC-001..TC-008',
  'approved',
  '1.0.0',
  current_date,
  now(),
  true
),
(
  'f6531000-0000-4000-8000-000000000103',
  'status_logic',
  'status_logic',
  'MVP Shell Thickness Status Logic',
  'AIM MVP fixture based on explicit workbook/test-case basis only; API 653 high-level governance context without standard clause reproduction',
  'AIM MVP 1.0.0',
  'AIM MVP 1.0.0',
  'AIM-CALC-MVP-FIXTURE-NO-STANDARD-CLAUSE',
  'shell_course',
  'thickness_status_screening',
  'universal_deterministic',
  'controlled_placeholder',
  'AIM_ENGINE_BUILTIN:STATUS_LOGIC_MVP_V1',
  'AIM_ENGINE_BUILTIN:STATUS_LOGIC_MVP_V1',
  null,
  '[{"key":"previous_thickness_mm","unit":"mm","required":true},{"key":"current_thickness_mm","unit":"mm","required":true},{"key":"minimum_required_thickness_mm","unit":"mm","required":true},{"key":"years_between_inspections","unit":"year","required":true},{"key":"reading_unit","allowed_values":["mm"],"required":true},{"key":"evidence_code","required":true}]'::jsonb,
  '[{"key":"corrosion_rate_mm_y","unit":"mm/year"},{"key":"remaining_life_y","unit":"year"},{"key":"calculation_status"},{"key":"warning_code"},{"key":"disclaimer"}]'::jsonb,
  '{"thickness":"mm","corrosion_rate":"mm/year","remaining_life":"year"}'::jsonb,
  '["missing required input returns INCOMPLETE_INPUT","unit mismatch returns UNIT_REVIEW_REQUIRED","missing evidence returns BLOCKED_MISSING_EVIDENCE","remaining life below MVP threshold returns ACTION_REQUIRED"]'::jsonb,
  '["no eval or dynamic formula execution","no API/API-ASME formula text embedded","engineering review required before final use"]'::jsonb,
  'calculation_formula_library_test_cases.csv#TC-001..TC-008',
  'approved',
  '1.0.0',
  current_date,
  now(),
  true
)
on conflict (formula_id, version) do update set
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
  formula_expression_source = excluded.formula_expression_source,
  input_schema = excluded.input_schema,
  output_schema = excluded.output_schema,
  unit_rules = excluded.unit_rules,
  validation_rules = excluded.validation_rules,
  blocking_rules = excluded.blocking_rules,
  test_case_reference = excluded.test_case_reference,
  status = excluded.status,
  locked_flag = excluded.locked_flag,
  updated_at = now();

insert into formula_versions(
  id,
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
  approved_at
)
select
  case fr.formula_id
    when 'corrosion_rate' then 'f6530000-0000-4000-8000-000000000101'::uuid
    when 'remaining_life' then 'f6530000-0000-4000-8000-000000000102'::uuid
    when 'status_logic' then 'f6530000-0000-4000-8000-000000000103'::uuid
  end,
  fr.id,
  fr.formula_id,
  fr.formula_name,
  fr.version,
  'approved',
  true,
  fr.formula_expression_source,
  fr.input_schema,
  fr.output_schema,
  fr.unit_rules,
  fr.validation_rules,
  now()
from formula_registry fr
where fr.formula_id in ('corrosion_rate','remaining_life','status_logic')
  and fr.version = '1.0.0'
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
  approved_at = coalesce(formula_versions.approved_at, excluded.approved_at),
  updated_at = now();

insert into permissions(permission_code, description) values
  ('calculation.run', 'Run deterministic and controlled calculations'),
  ('calculation.read', 'Read calculation runs'),
  ('calculation.review', 'Review calculation runs'),
  ('calculation.approve', 'Approve calculation runs')
on conflict (permission_code) do update set description = excluded.description;

-- Governance marker strings for tests and implementation review:
-- /api/v1/engineering/calculations/formula-library/run
-- calculation.formula_library_run_requested
-- AIM_ENGINE_BUILTIN:CORROSION_RATE_MVP_V1
-- AIM_ENGINE_BUILTIN:REMAINING_LIFE_MVP_V1
-- AIM_ENGINE_BUILTIN:STATUS_LOGIC_MVP_V1
-- Engineering review required before final use.
-- no eval or dynamic formula execution
