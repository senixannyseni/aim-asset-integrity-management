-- AIM Calculation Formula Library Seed Pack
-- Scope: API 653 high-level MVP shell thickness validation fixture.
-- Safety: does not reproduce copyrighted API/ASME clauses or proprietary formulas.
-- Production use: keep approved_status='under_review' until Engineer/Lead Engineer review and Approver sign-off.

BEGIN;

-- Existing logical table from data_dictionary.md:
-- formula_versions(formula_version_id, formula_code, formula_name, version_no, formula_type, expression_ref, approved_status, approved_by, approved_at, effective_from, retired_at)

INSERT INTO formula_versions (
  formula_version_id,
  formula_code,
  formula_name,
  version_no,
  formula_type,
  expression_ref,
  approved_status,
  approved_by,
  approved_at,
  effective_from,
  retired_at
) VALUES
  ('f6530000-0000-4000-8000-000000000101','corrosion_rate','MVP Shell Thickness Corrosion Rate','1.0.0','mvp_fixture','AIM_ENGINE_BUILTIN:CORROSION_RATE_MVP_V1 | source: 07_Calculation/calculation_validation_method.md#5.1','under_review',NULL,NULL,NULL,NULL),
  ('f6530000-0000-4000-8000-000000000102','remaining_life','MVP Shell Thickness Remaining Life','1.0.0','mvp_fixture','AIM_ENGINE_BUILTIN:REMAINING_LIFE_MVP_V1 | source: 07_Calculation/calculation_validation_method.md#5.2','under_review',NULL,NULL,NULL,NULL),
  ('f6530000-0000-4000-8000-000000000103','status_logic','MVP Shell Thickness Status Logic','1.0.0','mvp_fixture','AIM_ENGINE_BUILTIN:STATUS_LOGIC_MVP_V1 | source: 07_Calculation/calculation_validation_method.md#5.3','under_review',NULL,NULL,NULL,NULL)
ON CONFLICT (formula_version_id) DO NOTHING;

-- Recommended supplemental library tables if the current schema does not yet store schema/parameters/test metadata.
-- These are additive and can be adjusted to the final migration style.
CREATE TABLE IF NOT EXISTS calculation_formula_library_metadata (
  metadata_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formula_version_id uuid NOT NULL REFERENCES formula_versions(formula_version_id),
  standard_context text[] NOT NULL DEFAULT '{}',
  source_reference text NOT NULL,
  expression_text_for_engine_fixture text NOT NULL,
  asset_type_allowed text[] NOT NULL DEFAULT '{}',
  component_type_allowed text[] NOT NULL DEFAULT '{}',
  input_schema_json jsonb NOT NULL,
  output_schema_json jsonb NOT NULL,
  validation_rules_json jsonb NOT NULL,
  parameters_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  production_enabled boolean NOT NULL DEFAULT false,
  disclaimer text NOT NULL DEFAULT 'Engineering review required before final use.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS calculation_formula_library_test_cases (
  test_case_id varchar(40) PRIMARY KEY,
  formula_set varchar(120) NOT NULL,
  formula_version_ids uuid[] NOT NULL,
  test_case_name varchar(200) NOT NULL,
  asset_tag varchar(80) NOT NULL,
  component varchar(120) NOT NULL,
  input_json jsonb NOT NULL,
  expected_output_json jsonb NOT NULL,
  expected_status varchar(80) NOT NULL,
  expected_warning_code varchar(120),
  priority varchar(40) NOT NULL,
  review_status varchar(40) NOT NULL DEFAULT 'under_review',
  created_at timestamptz NOT NULL DEFAULT now()
);


INSERT INTO calculation_formula_library_metadata (
  formula_version_id,
  standard_context,
  source_reference,
  expression_text_for_engine_fixture,
  asset_type_allowed,
  component_type_allowed,
  input_schema_json,
  output_schema_json,
  validation_rules_json,
  parameters_json,
  production_enabled,
  disclaimer
) VALUES (
  'f6530000-0000-4000-8000-000000000101',
  ARRAY['API 653 high-level storage tank inspection governance']::text[],
  "07_Calculation/calculation_validation_method.md#5.1 and 07_Calculation/validation_workbook.xlsx!Manual_Calculation",
  "(previous_thickness_mm - current_thickness_mm) / years_between_inspections",
  ARRAY['atmospheric_storage_tank']::text[],
  ARRAY['shell_course']::text[],
  '[{"key": "previous_thickness_mm", "label": "Previous thickness", "type": "number", "unit": "mm", "required": true, "source_table": "thickness_readings", "evidence_required": true, "validation": ["must_be_numeric", "must_be_gt_0"]}, {"key": "current_thickness_mm", "label": "Current thickness", "type": "number", "unit": "mm", "required": true, "source_table": "thickness_readings", "evidence_required": true, "validation": ["must_be_numeric", "must_be_gt_0"]}, {"key": "years_between_inspections", "label": "Years between inspections", "type": "number", "unit": "year", "required": true, "source_table": "thickness_readings", "evidence_required": false, "validation": ["must_be_numeric", "must_be_gt_0"]}, {"key": "reading_unit", "label": "Thickness unit", "type": "string", "unit": null, "required": true, "allowed_values": ["mm"], "validation": ["must_equal_mm_for_mvp"]}, {"key": "evidence_code", "label": "Evidence code", "type": "string", "required": true, "source_table": "evidence_links", "validation": ["must_exist", "must_link_to_input"]}]'::jsonb,
  '[{"key": "corrosion_rate_mm_y", "label": "Corrosion rate", "type": "number_or_null", "unit": "mm/year"}, {"key": "warning_code", "label": "Warning code", "type": "string_or_null"}, {"key": "calculation_status", "label": "Calculation status", "type": "string", "allowed_values": ["OK", "INCOMPLETE_INPUT", "UNIT_REVIEW_REQUIRED", "BLOCKED_MISSING_EVIDENCE", "DATA_REVIEW_REQUIRED", "FAILED"]}, {"key": "formula_version_used", "label": "Formula version used", "type": "string"}, {"key": "disclaimer", "label": "Disclaimer", "type": "string", "fixed_value": "Engineering review required before final use."}]'::jsonb,
  '["Block if missing previous_thickness_mm, current_thickness_mm, or years_between_inspections.", "Block if years_between_inspections <= 0.", "Block official use if evidence_code is missing.", "Block final use if reading_unit is not mm.", "If corrosion_rate_mm_y < 0, return DATA_REVIEW_REQUIRED and require engineer review."]'::jsonb,
  '[]'::jsonb,
  false,
  "Engineering review required before final use."
)
ON CONFLICT DO NOTHING;

INSERT INTO calculation_formula_library_metadata (
  formula_version_id,
  standard_context,
  source_reference,
  expression_text_for_engine_fixture,
  asset_type_allowed,
  component_type_allowed,
  input_schema_json,
  output_schema_json,
  validation_rules_json,
  parameters_json,
  production_enabled,
  disclaimer
) VALUES (
  'f6530000-0000-4000-8000-000000000102',
  ARRAY['API 653 high-level storage tank inspection governance']::text[],
  "07_Calculation/calculation_validation_method.md#5.2 and 07_Calculation/validation_workbook.xlsx!Manual_Calculation",
  "(current_thickness_mm - minimum_required_thickness_mm) / corrosion_rate_mm_y",
  ARRAY['atmospheric_storage_tank']::text[],
  ARRAY['shell_course']::text[],
  '[{"key": "current_thickness_mm", "label": "Current thickness", "type": "number", "unit": "mm", "required": true, "source_table": "thickness_readings", "evidence_required": true, "validation": ["must_be_numeric", "must_be_gt_0"]}, {"key": "minimum_required_thickness_mm", "label": "Minimum required thickness", "type": "number", "unit": "mm", "required": true, "source_table": "thickness_readings", "evidence_required": true, "validation": ["must_be_numeric", "must_be_gt_0", "engineer_approved_source_required"]}, {"key": "corrosion_rate_mm_y", "label": "Corrosion rate", "type": "number", "unit": "mm/year", "required": true, "source_table": "calculation_outputs", "evidence_required": true, "validation": ["must_be_numeric"]}, {"key": "reading_unit", "label": "Thickness unit", "type": "string", "required": true, "allowed_values": ["mm"], "validation": ["must_equal_mm_for_mvp"]}, {"key": "evidence_code", "label": "Evidence code", "type": "string", "required": true, "source_table": "evidence_links", "validation": ["must_exist", "must_link_to_input"]}]'::jsonb,
  '[{"key": "remaining_life_y", "label": "Remaining life", "type": "number_or_na", "unit": "year"}, {"key": "warning_code", "label": "Warning code", "type": "string_or_null"}, {"key": "calculation_status", "label": "Calculation status", "type": "string", "allowed_values": ["OK", "N_A_ZERO_RATE", "N_A_NEGATIVE_RATE", "BELOW_MIN_REVIEW", "INCOMPLETE_INPUT", "UNIT_REVIEW_REQUIRED", "BLOCKED_MISSING_EVIDENCE", "FAILED"]}, {"key": "formula_version_used", "label": "Formula version used", "type": "string"}, {"key": "disclaimer", "label": "Disclaimer", "type": "string", "fixed_value": "Engineering review required before final use."}]'::jsonb,
  '["Calculate only when corrosion_rate_mm_y > 0.", "If corrosion_rate_mm_y = 0, return N/A and OK_ZERO_RATE_REVIEW style warning.", "If corrosion_rate_mm_y < 0, return N/A and DATA_REVIEW_REQUIRED.", "If current_thickness_mm < minimum_required_thickness_mm, flag BELOW_MIN_REVIEW.", "Block official use if evidence_code is missing or unit is not mm."]'::jsonb,
  '[]'::jsonb,
  false,
  "Engineering review required before final use."
)
ON CONFLICT DO NOTHING;

INSERT INTO calculation_formula_library_metadata (
  formula_version_id,
  standard_context,
  source_reference,
  expression_text_for_engine_fixture,
  asset_type_allowed,
  component_type_allowed,
  input_schema_json,
  output_schema_json,
  validation_rules_json,
  parameters_json,
  production_enabled,
  disclaimer
) VALUES (
  'f6530000-0000-4000-8000-000000000103',
  ARRAY['API 653 high-level storage tank inspection governance']::text[],
  "07_Calculation/calculation_validation_method.md#5.3 and 07_Calculation/validation_workbook.xlsx!Manual_Calculation",
  "Rule-based status selection using reviewed inputs, evidence gate, unit gate, minimum thickness gate, corrosion rate gate, and remaining life threshold.",
  ARRAY['atmospheric_storage_tank']::text[],
  ARRAY['shell_course']::text[],
  '[{"key": "required_input_complete", "type": "boolean", "required": true}, {"key": "evidence_code", "type": "string", "required": true, "validation": ["must_exist", "must_link_to_input"]}, {"key": "reading_unit", "type": "string", "required": true, "allowed_values": ["mm"]}, {"key": "current_thickness_mm", "type": "number", "unit": "mm", "required": true}, {"key": "minimum_required_thickness_mm", "type": "number", "unit": "mm", "required": true}, {"key": "corrosion_rate_mm_y", "type": "number_or_null", "unit": "mm/year", "required": false}, {"key": "remaining_life_y", "type": "number_or_na", "unit": "year", "required": false}, {"key": "mvp_remaining_life_action_threshold_y", "type": "number", "unit": "year", "required": true}]'::jsonb,
  '[{"key": "status_result", "label": "Status result", "type": "string", "allowed_values": ["INCOMPLETE_INPUT", "BLOCKED_MISSING_EVIDENCE", "UNIT_REVIEW_REQUIRED", "BELOW_MIN_REVIEW", "DATA_REVIEW_REQUIRED", "OK_ZERO_RATE_REVIEW", "ACTION_REQUIRED", "OK"]}, {"key": "action_required", "type": "boolean"}, {"key": "warning_code", "type": "string_or_null"}, {"key": "formula_version_used", "type": "string"}, {"key": "disclaimer", "type": "string", "fixed_value": "Engineering review required before final use."}]'::jsonb,
  '["Return INCOMPLETE_INPUT when required numeric input is missing.", "Return BLOCKED_MISSING_EVIDENCE when evidence_code is missing.", "Return UNIT_REVIEW_REQUIRED when thickness unit is not mm.", "Return BELOW_MIN_REVIEW when current_thickness_mm < minimum_required_thickness_mm.", "Return DATA_REVIEW_REQUIRED when corrosion_rate_mm_y < 0.", "Return OK_ZERO_RATE_REVIEW when corrosion_rate_mm_y = 0.", "Return ACTION_REQUIRED when remaining_life_y < mvp_remaining_life_action_threshold_y.", "Return OK when all gates pass and no warning condition applies."]'::jsonb,
  '[{"key": "mvp_remaining_life_action_threshold_y", "value": 2.0, "unit": "year", "controlled": true, "requires_approval": true}]'::jsonb,
  false,
  "Engineering review required before final use."
)
ON CONFLICT DO NOTHING;

INSERT INTO calculation_formula_library_test_cases (
  test_case_id,
  formula_set,
  formula_version_ids,
  test_case_name,
  asset_tag,
  component,
  input_json,
  expected_output_json,
  expected_status,
  expected_warning_code,
  priority,
  review_status
) VALUES (
  "TC-001",
  'shell_thickness_mvp_v1',
  ARRAY['f6530000-0000-4000-8000-000000000101'::uuid,'f6530000-0000-4000-8000-000000000102'::uuid,'f6530000-0000-4000-8000-000000000103'::uuid],
  "Normal corrosion rate",
  "TANK-T-02",
  "SHELL_COURSE_1",
  '{"asset_tag": "TANK-T-02", "component": "SHELL_COURSE_1", "previous_thickness_mm": 10.0, "current_thickness_mm": 9.0, "minimum_required_thickness_mm": 6.0, "years_between_inspections": 5.0, "reading_unit": "mm", "evidence_code": "EVD-2026-000001"}'::jsonb,
  '{"expected_corrosion_rate_mm_y": 0.2, "expected_remaining_life_y": 15.0, "expected_status": "OK", "expected_warning_code": null, "disclaimer": "Engineering review required before final use."}'::jsonb,
  "OK",
  NULL,
  "high",
  'under_review'
)
ON CONFLICT (test_case_id) DO NOTHING;

INSERT INTO calculation_formula_library_test_cases (
  test_case_id,
  formula_set,
  formula_version_ids,
  test_case_name,
  asset_tag,
  component,
  input_json,
  expected_output_json,
  expected_status,
  expected_warning_code,
  priority,
  review_status
) VALUES (
  "TC-002",
  'shell_thickness_mvp_v1',
  ARRAY['f6530000-0000-4000-8000-000000000101'::uuid,'f6530000-0000-4000-8000-000000000102'::uuid,'f6530000-0000-4000-8000-000000000103'::uuid],
  "Thickness below minimum",
  "TANK-T-02",
  "SHELL_COURSE_1",
  '{"asset_tag": "TANK-T-02", "component": "SHELL_COURSE_1", "previous_thickness_mm": 10.0, "current_thickness_mm": 5.8, "minimum_required_thickness_mm": 6.0, "years_between_inspections": 5.0, "reading_unit": "mm", "evidence_code": "EVD-2026-000002"}'::jsonb,
  '{"expected_corrosion_rate_mm_y": 0.84, "expected_remaining_life_y": -0.238095, "expected_status": "BELOW_MIN_REVIEW", "expected_warning_code": "CURRENT_BELOW_MINIMUM_REQUIRED_THICKNESS", "disclaimer": "Engineering review required before final use."}'::jsonb,
  "BELOW_MIN_REVIEW",
  "CURRENT_BELOW_MINIMUM_REQUIRED_THICKNESS",
  "critical",
  'under_review'
)
ON CONFLICT (test_case_id) DO NOTHING;

INSERT INTO calculation_formula_library_test_cases (
  test_case_id,
  formula_set,
  formula_version_ids,
  test_case_name,
  asset_tag,
  component,
  input_json,
  expected_output_json,
  expected_status,
  expected_warning_code,
  priority,
  review_status
) VALUES (
  "TC-003",
  'shell_thickness_mvp_v1',
  ARRAY['f6530000-0000-4000-8000-000000000101'::uuid,'f6530000-0000-4000-8000-000000000102'::uuid,'f6530000-0000-4000-8000-000000000103'::uuid],
  "Zero corrosion rate",
  "TANK-T-02",
  "SHELL_COURSE_1",
  '{"asset_tag": "TANK-T-02", "component": "SHELL_COURSE_1", "previous_thickness_mm": 9.0, "current_thickness_mm": 9.0, "minimum_required_thickness_mm": 6.0, "years_between_inspections": 5.0, "reading_unit": "mm", "evidence_code": "EVD-2026-000003"}'::jsonb,
  '{"expected_corrosion_rate_mm_y": 0.0, "expected_remaining_life_y": "N/A", "expected_status": "OK_ZERO_RATE_REVIEW", "expected_warning_code": "ZERO_CORROSION_RATE_REVIEW_REQUIRED", "disclaimer": "Engineering review required before final use."}'::jsonb,
  "OK_ZERO_RATE_REVIEW",
  "ZERO_CORROSION_RATE_REVIEW_REQUIRED",
  "high",
  'under_review'
)
ON CONFLICT (test_case_id) DO NOTHING;

INSERT INTO calculation_formula_library_test_cases (
  test_case_id,
  formula_set,
  formula_version_ids,
  test_case_name,
  asset_tag,
  component,
  input_json,
  expected_output_json,
  expected_status,
  expected_warning_code,
  priority,
  review_status
) VALUES (
  "TC-004",
  'shell_thickness_mvp_v1',
  ARRAY['f6530000-0000-4000-8000-000000000101'::uuid,'f6530000-0000-4000-8000-000000000102'::uuid,'f6530000-0000-4000-8000-000000000103'::uuid],
  "Negative corrosion rate",
  "TANK-T-02",
  "SHELL_COURSE_1",
  '{"asset_tag": "TANK-T-02", "component": "SHELL_COURSE_1", "previous_thickness_mm": 8.5, "current_thickness_mm": 9.0, "minimum_required_thickness_mm": 6.0, "years_between_inspections": 5.0, "reading_unit": "mm", "evidence_code": "EVD-2026-000004"}'::jsonb,
  '{"expected_corrosion_rate_mm_y": -0.1, "expected_remaining_life_y": "N/A", "expected_status": "DATA_REVIEW_REQUIRED", "expected_warning_code": "NEGATIVE_CORROSION_RATE_REVIEW_REQUIRED", "disclaimer": "Engineering review required before final use."}'::jsonb,
  "DATA_REVIEW_REQUIRED",
  "NEGATIVE_CORROSION_RATE_REVIEW_REQUIRED",
  "high",
  'under_review'
)
ON CONFLICT (test_case_id) DO NOTHING;

INSERT INTO calculation_formula_library_test_cases (
  test_case_id,
  formula_set,
  formula_version_ids,
  test_case_name,
  asset_tag,
  component,
  input_json,
  expected_output_json,
  expected_status,
  expected_warning_code,
  priority,
  review_status
) VALUES (
  "TC-005",
  'shell_thickness_mvp_v1',
  ARRAY['f6530000-0000-4000-8000-000000000101'::uuid,'f6530000-0000-4000-8000-000000000102'::uuid,'f6530000-0000-4000-8000-000000000103'::uuid],
  "Missing previous thickness",
  "TANK-T-02",
  "SHELL_COURSE_1",
  '{"asset_tag": "TANK-T-02", "component": "SHELL_COURSE_1", "previous_thickness_mm": null, "current_thickness_mm": 9.0, "minimum_required_thickness_mm": 6.0, "years_between_inspections": 5.0, "reading_unit": "mm", "evidence_code": "EVD-2026-000005"}'::jsonb,
  '{"expected_corrosion_rate_mm_y": null, "expected_remaining_life_y": "N/A", "expected_status": "INCOMPLETE_INPUT", "expected_warning_code": "MISSING_PREVIOUS_THICKNESS", "disclaimer": "Engineering review required before final use."}'::jsonb,
  "INCOMPLETE_INPUT",
  "MISSING_PREVIOUS_THICKNESS",
  "critical",
  'under_review'
)
ON CONFLICT (test_case_id) DO NOTHING;

INSERT INTO calculation_formula_library_test_cases (
  test_case_id,
  formula_set,
  formula_version_ids,
  test_case_name,
  asset_tag,
  component,
  input_json,
  expected_output_json,
  expected_status,
  expected_warning_code,
  priority,
  review_status
) VALUES (
  "TC-006",
  'shell_thickness_mvp_v1',
  ARRAY['f6530000-0000-4000-8000-000000000101'::uuid,'f6530000-0000-4000-8000-000000000102'::uuid,'f6530000-0000-4000-8000-000000000103'::uuid],
  "Missing evidence",
  "TANK-T-02",
  "SHELL_COURSE_1",
  '{"asset_tag": "TANK-T-02", "component": "SHELL_COURSE_1", "previous_thickness_mm": 10.0, "current_thickness_mm": 9.0, "minimum_required_thickness_mm": 6.0, "years_between_inspections": 5.0, "reading_unit": "mm", "evidence_code": null}'::jsonb,
  '{"expected_corrosion_rate_mm_y": 0.2, "expected_remaining_life_y": 15.0, "expected_status": "BLOCKED_MISSING_EVIDENCE", "expected_warning_code": "MISSING_EVIDENCE_REFERENCE", "disclaimer": "Engineering review required before final use."}'::jsonb,
  "BLOCKED_MISSING_EVIDENCE",
  "MISSING_EVIDENCE_REFERENCE",
  "critical",
  'under_review'
)
ON CONFLICT (test_case_id) DO NOTHING;

INSERT INTO calculation_formula_library_test_cases (
  test_case_id,
  formula_set,
  formula_version_ids,
  test_case_name,
  asset_tag,
  component,
  input_json,
  expected_output_json,
  expected_status,
  expected_warning_code,
  priority,
  review_status
) VALUES (
  "TC-007",
  'shell_thickness_mvp_v1',
  ARRAY['f6530000-0000-4000-8000-000000000101'::uuid,'f6530000-0000-4000-8000-000000000102'::uuid,'f6530000-0000-4000-8000-000000000103'::uuid],
  "Remaining life below threshold",
  "TANK-T-02",
  "SHELL_COURSE_1",
  '{"asset_tag": "TANK-T-02", "component": "SHELL_COURSE_1", "previous_thickness_mm": 10.0, "current_thickness_mm": 6.3, "minimum_required_thickness_mm": 6.0, "years_between_inspections": 5.0, "reading_unit": "mm", "evidence_code": "EVD-2026-000007"}'::jsonb,
  '{"expected_corrosion_rate_mm_y": 0.74, "expected_remaining_life_y": 0.405405, "expected_status": "ACTION_REQUIRED", "expected_warning_code": "REMAINING_LIFE_BELOW_MVP_THRESHOLD", "disclaimer": "Engineering review required before final use."}'::jsonb,
  "ACTION_REQUIRED",
  "REMAINING_LIFE_BELOW_MVP_THRESHOLD",
  "critical",
  'under_review'
)
ON CONFLICT (test_case_id) DO NOTHING;

INSERT INTO calculation_formula_library_test_cases (
  test_case_id,
  formula_set,
  formula_version_ids,
  test_case_name,
  asset_tag,
  component,
  input_json,
  expected_output_json,
  expected_status,
  expected_warning_code,
  priority,
  review_status
) VALUES (
  "TC-008",
  'shell_thickness_mvp_v1',
  ARRAY['f6530000-0000-4000-8000-000000000101'::uuid,'f6530000-0000-4000-8000-000000000102'::uuid,'f6530000-0000-4000-8000-000000000103'::uuid],
  "Unit mismatch warning",
  "TANK-T-02",
  "SHELL_COURSE_1",
  '{"asset_tag": "TANK-T-02", "component": "SHELL_COURSE_1", "previous_thickness_mm": null, "current_thickness_mm": null, "minimum_required_thickness_mm": null, "years_between_inspections": 5.0, "reading_unit": "inch", "raw_previous_thickness": 0.394, "raw_current_thickness": 0.354, "raw_minimum_required_thickness": 0.236, "evidence_code": "EVD-2026-000008"}'::jsonb,
  '{"expected_corrosion_rate_mm_y": null, "expected_remaining_life_y": "N/A", "expected_status": "UNIT_REVIEW_REQUIRED", "expected_warning_code": "UNIT_MISMATCH", "disclaimer": "Engineering review required before final use."}'::jsonb,
  "UNIT_REVIEW_REQUIRED",
  "UNIT_MISMATCH",
  "critical",
  'under_review'
)
ON CONFLICT (test_case_id) DO NOTHING;

-- Production approval example after engineering sign-off only:
-- UPDATE formula_versions
-- SET approved_status='approved',
--     approved_by='<APPROVER_USER_UUID>',
--     approved_at=now(),
--     effective_from=current_date
-- WHERE formula_version_id IN (
--   'f6530000-0000-4000-8000-000000000101',
--   'f6530000-0000-4000-8000-000000000102',
--   'f6530000-0000-4000-8000-000000000103'
-- );
--
-- UPDATE calculation_formula_library_metadata
-- SET production_enabled=true, updated_at=now()
-- WHERE formula_version_id IN (
--   'f6530000-0000-4000-8000-000000000101',
--   'f6530000-0000-4000-8000-000000000102',
--   'f6530000-0000-4000-8000-000000000103'
-- );

COMMIT;
