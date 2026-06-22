-- Phase 2.1 Controlled UAT Sample Seed
-- UAT/sample only
-- Synthetic data only
-- Not for production
-- No real client data
-- No credentials
-- No production object storage URI
-- No real evidence files
-- This seed provides local/UAT test fixtures only and does not implement full API 579, full API 581, SAP/Maximo/CMMS integration, 3D processing, frontend UI, or invented API/ASME formulas.
-- Any mention of SAP/Maximo/CMMS, API 579, API 581, or 3D processing in this file is out-of-scope boundary language only.

begin;

-- Synthetic UAT users and role assignments. Password hashes are non-login placeholder hashes only.
insert into users(id, email, full_name, password_hash, status, password_hash_algorithm)
values
  ('21000000-0000-4000-8000-000000000001', 'uat.admin@example.test', 'UAT Admin Sample', 'uat_sample_hash_not_for_login', 'active', 'uat_placeholder'),
  ('21000000-0000-4000-8000-000000000002', 'uat.inspector@example.test', 'UAT Inspector Sample', 'uat_sample_hash_not_for_login', 'active', 'uat_placeholder'),
  ('21000000-0000-4000-8000-000000000003', 'uat.engineer@example.test', 'UAT Engineer Sample', 'uat_sample_hash_not_for_login', 'active', 'uat_placeholder'),
  ('21000000-0000-4000-8000-000000000004', 'uat.lead.engineer@example.test', 'UAT Lead Engineer Sample', 'uat_sample_hash_not_for_login', 'active', 'uat_placeholder'),
  ('21000000-0000-4000-8000-000000000005', 'uat.approver@example.test', 'UAT Approver Sample', 'uat_sample_hash_not_for_login', 'active', 'uat_placeholder'),
  ('21000000-0000-4000-8000-000000000006', 'uat.it.admin@example.test', 'UAT IT Admin Sample', 'uat_sample_hash_not_for_login', 'active', 'uat_placeholder'),
  ('21000000-0000-4000-8000-000000000007', 'uat.management@example.test', 'UAT Management Sample', 'uat_sample_hash_not_for_login', 'active', 'uat_placeholder'),
  ('21000000-0000-4000-8000-000000000008', 'uat.ai.agent@example.test', 'UAT AI Agent Service Sample', 'uat_sample_hash_not_for_login', 'active', 'uat_placeholder'),
  ('21000000-0000-4000-8000-000000000009', 'uat.n8n.service@example.test', 'UAT n8n Service Sample', 'uat_sample_hash_not_for_login', 'active', 'uat_placeholder')
on conflict (email) do update set
  full_name = excluded.full_name,
  status = excluded.status,
  password_hash_algorithm = excluded.password_hash_algorithm;

insert into user_roles(user_id, role_id)
select u.id, r.id
from (values
  ('uat.admin@example.test', 'admin'),
  ('uat.inspector@example.test', 'inspector'),
  ('uat.engineer@example.test', 'engineer'),
  ('uat.lead.engineer@example.test', 'lead_engineer'),
  ('uat.approver@example.test', 'approver'),
  ('uat.it.admin@example.test', 'it_admin'),
  ('uat.management@example.test', 'management'),
  ('uat.ai.agent@example.test', 'ai_agent'),
  ('uat.n8n.service@example.test', 'it_admin')
) as map(email, role_code)
join users u on u.email = map.email
join roles r on r.role_code = map.role_code
on conflict do nothing;

-- One atmospheric storage tank asset and one inspection event.
insert into assets(id, asset_tag, asset_name, asset_type, facility, area, service_fluid, status, design_code, design_code_edition, owner_user_id, approved_by, approved_at)
values (
  '22000000-0000-4000-8000-000000000001',
  'AIM-UAT-T-001',
  'Synthetic UAT Atmospheric Storage Tank 001',
  'aboveground_storage_tank',
  'Synthetic UAT Tank Farm',
  'UAT Area A',
  'Synthetic clean water service',
  'approved',
  'API 650 reference only - no clause text',
  'reference-only',
  '21000000-0000-4000-8000-000000000003',
  '21000000-0000-4000-8000-000000000004',
  now()
)
on conflict (asset_tag) do update set
  asset_name = excluded.asset_name,
  facility = excluded.facility,
  area = excluded.area,
  service_fluid = excluded.service_fluid,
  status = excluded.status,
  updated_at = now();

insert into inspection_events(id, asset_id, inspection_code, inspection_type, inspection_date, inspector_user_id, summary, status)
values (
  '23000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000001',
  'AIM-UAT-INS-001',
  'external',
  current_date,
  '21000000-0000-4000-8000-000000000002',
  'Synthetic UAT inspection workspace for end-to-end governance testing.',
  'approved'
)
on conflict (inspection_code) do update set
  summary = excluded.summary,
  status = excluded.status,
  updated_at = now();

-- Evidence metadata placeholders only. Object paths are non-production local/UAT placeholders and do not represent real evidence files.
insert into evidence_files(
  id, evidence_code, asset_id, inspection_event_id, object_storage_uri, original_filename, file_extension, mime_type,
  file_size_bytes, checksum_sha256, method, component, inspection_date, page_figure_table_reference, uploaded_by,
  status, malware_scan_status, access_status
)
values
  ('24000000-0000-4000-8000-000000000001', 'EVD-2026-900001', '22000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'uat-placeholder://evidence/AIM-UAT-T-001/AIM-UAT-INS-001/EVD-2026-900001/inspection-report-placeholder.pdf', 'AIM-UAT-T-001_inspection_report_placeholder.pdf', '.pdf', 'application/pdf', 1024, 'uatsha256-inspection-report-placeholder-000000000000000000000000000001', 'EXTERNAL_VISUAL', 'SHELL', current_date, 'Page 1 Table UAT-1', '21000000-0000-4000-8000-000000000002', 'active', 'clean', 'not_issued'),
  ('24000000-0000-4000-8000-000000000002', 'EVD-2026-900002', '22000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'uat-placeholder://evidence/AIM-UAT-T-001/AIM-UAT-INS-001/EVD-2026-900002/ut-grid-placeholder.csv', 'AIM-UAT-T-001_ut_grid_placeholder.csv', '.csv', 'text/csv', 2048, 'uatsha256-ut-grid-placeholder-0000000000000000000000000000000002', 'UT_THICKNESS', 'SHELL_COURSE_1', current_date, 'CSV row 2 column current_thickness_mm', '21000000-0000-4000-8000-000000000002', 'active', 'clean', 'not_issued'),
  ('24000000-0000-4000-8000-000000000003', 'EVD-2026-900003', '22000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'uat-placeholder://evidence/AIM-UAT-T-001/AIM-UAT-INS-001/EVD-2026-900003/photo-placeholder.png', 'AIM-UAT-T-001_photo_placeholder.png', '.png', 'image/png', 3072, 'uatsha256-photo-placeholder-000000000000000000000000000000000003', 'PHOTO', 'SHELL', current_date, 'Photo UAT-1', '21000000-0000-4000-8000-000000000002', 'active', 'clean', 'not_issued')
on conflict (evidence_code) do update set
  object_storage_uri = excluded.object_storage_uri,
  original_filename = excluded.original_filename,
  file_size_bytes = excluded.file_size_bytes,
  checksum_sha256 = excluded.checksum_sha256,
  malware_scan_status = excluded.malware_scan_status,
  access_status = excluded.access_status,
  updated_at = now();

-- Extraction job and staged AI fields. AI fields are not final engineering data.
insert into extraction_jobs(
  id, extraction_job_code, asset_id, inspection_event_id, source_evidence_file_id, schema_name, schema_version,
  prompt_version, extraction_purpose, status, staging_only_flag, started_at, completed_at, created_by, metadata_json
)
values (
  '25000000-0000-4000-8000-000000000001',
  'EXJ-UAT-000001',
  '22000000-0000-4000-8000-000000000001',
  '23000000-0000-4000-8000-000000000001',
  '24000000-0000-4000-8000-000000000001',
  'tank_api653_extraction_schema',
  '1.0.0',
  'prompt-uat-fixture-1.0',
  'UAT staging-only extraction fixture',
  'requires_manual_review',
  true,
  now() - interval '10 minutes',
  now() - interval '5 minutes',
  '21000000-0000-4000-8000-000000000008',
  '{"uat_seed":true,"ai_output_final":false,"source":"synthetic"}'::jsonb
)
on conflict (extraction_job_code) do update set
  status = excluded.status,
  staging_only_flag = true,
  metadata_json = excluded.metadata_json,
  updated_at = now();

insert into extraction_fields(
  id, extraction_job_id, field_path, field_name, extracted_value, normalized_value, unit,
  source_reference_json, confidence_score, field_status, review_required, validation_flags,
  reviewer_id, reviewed_at
)
values
  ('25000000-0000-4000-8000-000000000101', '25000000-0000-4000-8000-000000000001', '$.asset.asset_tag', 'asset_tag', 'AIM-UAT-T-001', 'AIM-UAT-T-001', null, '{"evidence_code":"EVD-2026-900001","page":"1","table":"UAT-1"}'::jsonb, 0.9500, 'approved_by_engineer', true, '{}', '21000000-0000-4000-8000-000000000003', now()),
  ('25000000-0000-4000-8000-000000000102', '25000000-0000-4000-8000-000000000001', '$.thickness.current_mm', 'current_thickness_mm', '7.200', '7.200', 'mm', '{"evidence_code":"EVD-2026-900002","row":"2","column":"current_thickness_mm"}'::jsonb, 0.8200, 'needs_review', true, '{LOW_CONFIDENCE}', null, null),
  ('25000000-0000-4000-8000-000000000103', '25000000-0000-4000-8000-000000000001', '$.thickness.previous_mm', 'previous_thickness_mm', '7.800', '7.800', 'mm', '{}'::jsonb, 0.7000, 'invalid', true, '{MISSING_EVIDENCE_REFERENCE}', null, null),
  ('25000000-0000-4000-8000-000000000104', '25000000-0000-4000-8000-000000000001', '$.thickness.unit_mismatch', 'thickness_unit', '0.283', '0.283', 'inch', '{"evidence_code":"EVD-2026-900002","row":"3","column":"thickness"}'::jsonb, 0.7800, 'needs_review', true, '{UNIT_MISMATCH}', null, null),
  ('25000000-0000-4000-8000-000000000105', '25000000-0000-4000-8000-000000000001', '$.metadata.report_no', 'report_number', 'RPT-WRONG-UAT', 'RPT-AIM-UAT-001', null, '{"evidence_code":"EVD-2026-900001","page":"cover"}'::jsonb, 0.8800, 'corrected_by_engineer', true, '{}', '21000000-0000-4000-8000-000000000003', now())
on conflict (extraction_job_id, field_path) do update set
  extracted_value = excluded.extracted_value,
  normalized_value = excluded.normalized_value,
  unit = excluded.unit,
  source_reference_json = excluded.source_reference_json,
  confidence_score = excluded.confidence_score,
  field_status = excluded.field_status,
  review_required = excluded.review_required,
  validation_flags = excluded.validation_flags,
  reviewer_id = excluded.reviewer_id,
  reviewed_at = excluded.reviewed_at,
  updated_at = now();

insert into staging_records(
  id, extraction_job_id, extraction_field_id, target_entity_type, target_entity_id, target_table,
  target_column, proposed_value, normalized_value, unit, review_status, promotion_status,
  reviewer_id, reviewed_at, manual_entry_flag, created_by, metadata_json
)
values (
  '26000000-0000-4000-8000-000000000001',
  '25000000-0000-4000-8000-000000000001',
  '25000000-0000-4000-8000-000000000105',
  'inspection_event',
  '23000000-0000-4000-8000-000000000001',
  'inspection_events',
  'summary',
  'RPT-WRONG-UAT',
  'RPT-AIM-UAT-001',
  null,
  'corrected',
  'not_promoted',
  '21000000-0000-4000-8000-000000000003',
  now(),
  false,
  '21000000-0000-4000-8000-000000000008',
  '{"uat_seed":true,"promotion_requires_human_review":true,"evidence_link_required":true}'::jsonb
)
on conflict (id) do update set
  review_status = excluded.review_status,
  promotion_status = excluded.promotion_status,
  metadata_json = excluded.metadata_json,
  updated_at = now();

insert into manual_overrides(
  id, staging_record_id, extraction_field_id, original_value, corrected_value, corrected_unit,
  correction_reason, reviewer_id, evidence_file_id, evidence_reference_json
)
values (
  '27000000-0000-4000-8000-000000000001',
  '26000000-0000-4000-8000-000000000001',
  '25000000-0000-4000-8000-000000000105',
  'RPT-WRONG-UAT',
  'RPT-AIM-UAT-001',
  null,
  'Synthetic UAT correction: report number corrected after evidence-side review.',
  '21000000-0000-4000-8000-000000000003',
  '24000000-0000-4000-8000-000000000001',
  '{"evidence_code":"EVD-2026-900001","page":"cover","reason":"manual_overrides UAT correction"}'::jsonb
)
on conflict (id) do update set
  corrected_value = excluded.corrected_value,
  correction_reason = excluded.correction_reason,
  evidence_reference_json = excluded.evidence_reference_json;

insert into data_quality_checks(
  id, extraction_job_id, extraction_field_id, staging_record_id, check_code, severity, check_status,
  message, is_blocking
)
values
  ('28000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-000000000103', null, 'MISSING_EVIDENCE_REFERENCE', 'critical', 'failed', 'Synthetic UAT check: missing evidence reference blocks promotion.', true),
  ('28000000-0000-4000-8000-000000000002', '25000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-000000000104', null, 'UNIT_MISMATCH', 'high', 'blocked', 'Synthetic UAT check: unit mismatch blocks calculation input until review.', true)
on conflict (id) do update set
  check_status = excluded.check_status,
  message = excluded.message,
  is_blocking = excluded.is_blocking;

-- Reviewed NDT sample linked to evidence. This is a reviewed UAT fixture, not AI-finalized data.
insert into ndt_measurements(
  id, measurement_code, asset_id, inspection_event_id, component, shell_course_no, cml_tml_id,
  grid_ref, measured_thickness_mm, reading_date, method, confidence, evidence_file_id,
  extraction_source, reviewer_status, validation_status, validation_message, is_critical,
  created_by, reviewed_by, approved_by, reviewed_at, approved_at
)
values (
  '29000000-0000-4000-8000-000000000001',
  'NDT-UAT-UT-000001',
  '22000000-0000-4000-8000-000000000001',
  '23000000-0000-4000-8000-000000000001',
  'SHELL_COURSE_1',
  1,
  'CML-UAT-SH-001',
  'GRID-UAT-001',
  7.200,
  current_date,
  'UT_THICKNESS',
  1.0000,
  '24000000-0000-4000-8000-000000000002',
  'manual',
  'approved',
  'valid',
  'Synthetic UAT reviewed UT reading linked to evidence.',
  true,
  '21000000-0000-4000-8000-000000000002',
  '21000000-0000-4000-8000-000000000003',
  '21000000-0000-4000-8000-000000000004',
  now(),
  now()
)
on conflict (measurement_code) do update set
  measured_thickness_mm = excluded.measured_thickness_mm,
  reviewer_status = excluded.reviewer_status,
  validation_status = excluded.validation_status,
  updated_at = now();

-- Formula fixture using only AIM-approved test fixture metadata; no API/ASME formula text is introduced.
insert into formula_registry(
  id, formula_expression_source, formula_id, formula_code, formula_name, code_basis, code_edition, edition,
  clause_reference, component, damage_mechanism, formula_type, expression_type, expression_body,
  input_schema, output_schema, unit_rules, validation_rules, blocking_rules, test_case_reference,
  status, version, effective_date, approved_by, approval_date, locked_flag, created_by, updated_by
)
values (
  '30000000-0000-4000-8000-000000000001',
  'approved_uat_fixture_only_no_api_asme_formula',
  'AIM-UAT-CORROSION-GOVERNANCE-FIXTURE',
  'AIM-UAT-CORROSION-GOVERNANCE-FIXTURE',
  'AIM UAT Corrosion Governance Fixture',
  'AIM Engineering Basis and validation workbook fixture only',
  'UAT fixture',
  'UAT fixture',
  'No API/API-ASME clause expression embedded',
  'shell',
  'general_thickness_governance',
  'universal_deterministic',
  'controlled_fixture',
  'NO_STANDARD_FORMULA_TEXT_UAT_FIXTURE_ONLY',
  '{"inputs":["previous_thickness_mm","current_thickness_mm","years_between_inspections","minimum_required_thickness_mm"]}'::jsonb,
  '{"outputs":["corrosion_rate_mm_y","remaining_life_years","status","warnings"]}'::jsonb,
  '{"thickness":"mm","corrosion_rate":"mm/year"}'::jsonb,
  '{"requires_evidence":true,"requires_engineering_review":true}'::jsonb,
  '["missing_evidence_blocks_final_use","unit_mismatch_blocks_final_use"]'::jsonb,
  'validation_workbook_uat_cases',
  'approved',
  'uat-1.0.0',
  current_date,
  '21000000-0000-4000-8000-000000000004',
  now(),
  true,
  '21000000-0000-4000-8000-000000000004',
  '21000000-0000-4000-8000-000000000004'
)
on conflict (formula_code, version) do update set
  formula_name = excluded.formula_name,
  status = excluded.status,
  locked_flag = excluded.locked_flag,
  updated_at = now();

insert into formula_versions(
  id, formula_registry_id, formula_code, formula_name, version, formula_status, deterministic_flag,
  formula_expression_source, input_schema, output_schema, unit_rules, validation_rules,
  approved_by, approved_at, created_by
)
values (
  '31000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'AIM-UAT-CORROSION-GOVERNANCE-FIXTURE',
  'AIM UAT Corrosion Governance Fixture',
  'uat-1.0.0',
  'approved',
  true,
  'approved_uat_fixture_only_no_api_asme_formula',
  '{"inputs":["previous_thickness_mm","current_thickness_mm","years_between_inspections","minimum_required_thickness_mm"]}'::jsonb,
  '{"outputs":["corrosion_rate_mm_y","remaining_life_years","status","warnings"]}'::jsonb,
  '{"thickness":"mm","corrosion_rate":"mm/year"}'::jsonb,
  '{"requires_evidence":true,"requires_engineering_review":true}'::jsonb,
  '21000000-0000-4000-8000-000000000004',
  now(),
  '21000000-0000-4000-8000-000000000004'
)
on conflict (formula_code, version) do update set
  formula_status = excluded.formula_status,
  approved_by = excluded.approved_by,
  approved_at = excluded.approved_at,
  updated_at = now();

insert into calculation_validation_cases(
  id, formula_version_id, test_case_id, case_name, case_type, input_json, expected_output_json,
  expected_status, evidence_requirement_status, review_status, created_by, reviewed_by, reviewed_at
)
values
  ('32000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 'UAT-CALC-NORMAL-001', 'Normal corrosion rate UAT fixture', 'normal', '{"previous_thickness_mm":7.8,"current_thickness_mm":7.2,"years_between_inspections":3,"minimum_required_thickness_mm":6.0}'::jsonb, '{"expected_warning":"none","disclaimer":"Engineering review required before final use."}'::jsonb, 'ok', 'complete', 'approved', '21000000-0000-4000-8000-000000000004', '21000000-0000-4000-8000-000000000004', now()),
  ('32000000-0000-4000-8000-000000000002', '31000000-0000-4000-8000-000000000001', 'UAT-CALC-MISSING-EVIDENCE-001', 'Missing evidence blocks final use UAT fixture', 'evidence_gate', '{"evidence_link":"missing"}'::jsonb, '{"expected_blocker":"MISSING_EVIDENCE"}'::jsonb, 'blocked', 'missing', 'pending_review', '21000000-0000-4000-8000-000000000004', null, null)
on conflict (test_case_id) do update set
  expected_status = excluded.expected_status,
  evidence_requirement_status = excluded.evidence_requirement_status,
  updated_at = now();

insert into calculation_runs(
  id, asset_id, inspection_event_id, formula_registry_id, formula_version_id, run_version, status,
  input_snapshot_json, unit_normalized_input_json, validation_result_json, warnings_json,
  reviewer_id, approver_id, reviewed_at, approved_at, created_by,
  run_id, run_status, formula_set_version, input_snapshot_hash, validation_status, output_summary,
  review_status, approval_status, initiated_by, locked_flag,
  formula_version_snapshot_json, output_snapshot_json, final_use_status, final_use_disclaimer,
  final_use_blockers_json, output_snapshot_hash
)
values (
  '33000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000001',
  '23000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000001',
  1,
  'approved',
  '{"previous_thickness_mm":7.8,"current_thickness_mm":7.2,"years_between_inspections":3,"minimum_required_thickness_mm":6.0,"evidence_links":["EVD-2026-900002"]}'::jsonb,
  '{"unit":"mm","corrosion_rate_unit":"mm/year"}'::jsonb,
  '{"status":"valid","evidence_gate":"complete"}'::jsonb,
  '[]'::jsonb,
  '21000000-0000-4000-8000-000000000003',
  '21000000-0000-4000-8000-000000000004',
  now(),
  now(),
  '21000000-0000-4000-8000-000000000003',
  'CALC-UAT-000001',
  'approved',
  'AIM-UAT-CORROSION-GOVERNANCE-FIXTURE:uat-1.0.0',
  'uat-input-hash-000001',
  'valid',
  '{"status":"watch","disclaimer":"Engineering review required before final use."}'::jsonb,
  'reviewed',
  'approved',
  '21000000-0000-4000-8000-000000000003',
  false,
  '{"formula_version_id":"31000000-0000-4000-8000-000000000001","formula_code":"AIM-UAT-CORROSION-GOVERNANCE-FIXTURE","version":"uat-1.0.0","formula_status":"approved"}'::jsonb,
  '{"corrosion_rate_mm_y":0.2,"remaining_life_years":6,"final_use_disclaimer":"Engineering review required before final use."}'::jsonb,
  'approved_for_final_use',
  'Engineering review required before final use.',
  '[]'::jsonb,
  'uat-output-hash-000001'
)
on conflict (asset_id, formula_registry_id, run_version) do update set
  formula_version_id = excluded.formula_version_id,
  run_id = excluded.run_id,
  run_status = excluded.run_status,
  validation_status = excluded.validation_status,
  output_summary = excluded.output_summary,
  review_status = excluded.review_status,
  approval_status = excluded.approval_status,
  final_use_status = excluded.final_use_status,
  final_use_disclaimer = excluded.final_use_disclaimer,
  output_snapshot_json = excluded.output_snapshot_json;

insert into calculation_inputs(
  id, calculation_run_id, input_name, raw_value, normalized_value, raw_unit, normalized_unit,
  source_entity_type, source_entity_id, evidence_file_id, validation_status
)
values
  ('34000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000001', 'current_thickness_mm', '7.200', 7.200, 'mm', 'mm', 'ndt_measurement', '29000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000002', 'valid'),
  ('34000000-0000-4000-8000-000000000002', '33000000-0000-4000-8000-000000000001', 'minimum_required_thickness_mm', '6.000', 6.000, 'mm', 'mm', 'manual_reviewed_fixture', '23000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', 'valid')
on conflict (id) do update set
  raw_value = excluded.raw_value,
  normalized_value = excluded.normalized_value,
  validation_status = excluded.validation_status;

insert into calculation_outputs(
  id, calculation_run_id, output_name, output_value, output_unit, output_json, warning_code, warning_message, final_use_disclaimer
)
values
  ('35000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000001', 'corrosion_rate_mm_y', 0.200, 'mm/year', '{"source":"UAT fixture","final_use_disclaimer":"Engineering review required before final use."}'::jsonb, null, null, 'Engineering review required before final use.'),
  ('35000000-0000-4000-8000-000000000002', '33000000-0000-4000-8000-000000000001', 'remaining_life_years', 6.000, 'years', '{"source":"UAT fixture","final_use_disclaimer":"Engineering review required before final use."}'::jsonb, null, null, 'Engineering review required before final use.')
on conflict (id) do update set
  output_value = excluded.output_value,
  output_json = excluded.output_json,
  final_use_disclaimer = excluded.final_use_disclaimer;

insert into integrity_decisions(
  id, decision_code, asset_id, inspection_event_id, calculation_run_id, decision_type,
  integrity_status, decision_status, decision_summary, required_action, due_date,
  created_by, reviewed_by, approved_by, reviewed_at, approved_at
)
values (
  '36000000-0000-4000-8000-000000000001',
  'DEC-UAT-000001',
  '22000000-0000-4000-8000-000000000001',
  '23000000-0000-4000-8000-000000000001',
  '33000000-0000-4000-8000-000000000001',
  'tank_integrity',
  'action_required',
  'approved',
  'Synthetic UAT decision requiring internal follow-up action after reviewed calculation.',
  'Create internal AIM work order for monitored repair planning.',
  current_date + interval '30 days',
  '21000000-0000-4000-8000-000000000003',
  '21000000-0000-4000-8000-000000000004',
  '21000000-0000-4000-8000-000000000005',
  now(),
  now()
)
on conflict (decision_code) do update set
  integrity_status = excluded.integrity_status,
  decision_status = excluded.decision_status,
  decision_summary = excluded.decision_summary,
  required_action = excluded.required_action,
  updated_at = now();

insert into report_templates(id, template_code, template_name, template_version, output_formats, sections_json, status, created_by)
values (
  '37000000-0000-4000-8000-000000000001',
  'TANK-INTEGRITY-UAT',
  'Synthetic UAT Tank Integrity Report Template',
  'uat-1.0.0',
  '["docx","pdf"]'::jsonb,
  '[{"section":"Executive Summary"},{"section":"Evidence Register"},{"section":"Calculation Disclaimer"}]'::jsonb,
  'active',
  '21000000-0000-4000-8000-000000000003'
)
on conflict (template_code) do update set
  template_name = excluded.template_name,
  sections_json = excluded.sections_json,
  updated_at = now();

insert into reports(
  id, report_code, report_title, report_type, report_status, report_version, asset_id,
  calculation_run_id, template_id, template_code, format_requested, plain_text_content,
  input_snapshot_hash, content_hash, traceability_json, sections_json, evidence_register_json,
  validation_warnings_json, limitations_json, generated_by, reviewed_by, approved_by,
  generated_at, reviewed_at, approved_at, locked_flag, issue_gate_status, issue_gate_checklist_json
)
values (
  '38000000-0000-4000-8000-000000000001',
  'RPT-UAT-000001',
  'Synthetic UAT Tank Integrity Report',
  'tank_integrity',
  'approved',
  1,
  '22000000-0000-4000-8000-000000000001',
  '33000000-0000-4000-8000-000000000001',
  '37000000-0000-4000-8000-000000000001',
  'TANK-INTEGRITY-UAT',
  '["docx","pdf"]'::jsonb,
  'Synthetic UAT report content only. Engineering review required before final use.',
  'uat-input-hash-000001',
  'uat-report-content-hash-000001',
  '{"asset_tag":"AIM-UAT-T-001","calculation_run":"CALC-UAT-000001","evidence":["EVD-2026-900001","EVD-2026-900002"]}'::jsonb,
  '[{"section":"Executive Summary","status":"approved"}]'::jsonb,
  '[{"evidence_code":"EVD-2026-900001"},{"evidence_code":"EVD-2026-900002"}]'::jsonb,
  '[]'::jsonb,
  '["UAT synthetic report; not issued; no API/ASME formula text included."]'::jsonb,
  '21000000-0000-4000-8000-000000000003',
  '21000000-0000-4000-8000-000000000004',
  '21000000-0000-4000-8000-000000000005',
  now(),
  now(),
  now(),
  false,
  'pending',
  '[{"gate":"evidence_linked","status":"pending_uat_verification"},{"gate":"approver_comment_present","status":"pending_uat_verification"}]'::jsonb
)
on conflict (report_code) do update set
  report_status = excluded.report_status,
  plain_text_content = excluded.plain_text_content,
  traceability_json = excluded.traceability_json,
  evidence_register_json = excluded.evidence_register_json,
  issue_gate_status = excluded.issue_gate_status,
  issue_gate_checklist_json = excluded.issue_gate_checklist_json,
  updated_at = now();

insert into report_versions(id, report_id, report_version, version_status, content_hash, generated_by, approved_by, generated_at, approved_at, locked_flag)
values (
  '39000000-0000-4000-8000-000000000001',
  '38000000-0000-4000-8000-000000000001',
  1,
  'approved',
  'uat-report-content-hash-000001',
  '21000000-0000-4000-8000-000000000003',
  '21000000-0000-4000-8000-000000000005',
  now(),
  now(),
  false
)
on conflict (report_id, report_version) do update set
  version_status = excluded.version_status,
  content_hash = excluded.content_hash,
  updated_at = now();

-- Evidence links after target entities exist. These links support extraction, calculation input, decision, report, and work order closure UAT cases.
insert into evidence_links(id, evidence_file_id, linked_entity_type, linked_entity_id, link_reason, linked_by)
values
  ('40000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', 'extraction_job', '25000000-0000-4000-8000-000000000001', 'extraction_source', '21000000-0000-4000-8000-000000000003'),
  ('40000000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000002', 'calculation_input', '33000000-0000-4000-8000-000000000001', 'calculation_input', '21000000-0000-4000-8000-000000000003'),
  ('40000000-0000-4000-8000-000000000003', '24000000-0000-4000-8000-000000000001', 'integrity_decision', '36000000-0000-4000-8000-000000000001', 'decision_support', '21000000-0000-4000-8000-000000000004'),
  ('40000000-0000-4000-8000-000000000004', '24000000-0000-4000-8000-000000000001', 'report', '38000000-0000-4000-8000-000000000001', 'report_attachment', '21000000-0000-4000-8000-000000000005'),
  ('40000000-0000-4000-8000-000000000005', '24000000-0000-4000-8000-000000000003', 'internal_work_order', '41000000-0000-4000-8000-000000000001', 'work_order_closure_support_placeholder', '21000000-0000-4000-8000-000000000004')
on conflict (evidence_file_id, linked_entity_type, linked_entity_id) do update set
  link_reason = excluded.link_reason,
  linked_by = excluded.linked_by;

insert into internal_work_orders(
  id, work_order_code, asset_id, source_entity_type, source_entity_id, title, description,
  priority, status, recommended_action, assigned_to, due_date, created_by,
  inspection_event_id, integrity_decision_id, report_id, action_source, assigned_role,
  preliminary_internal_flag, gate_status, gate_checklist_json, closure_evidence_required,
  closure_evidence_link_id, action_source_note, external_cmms_reference, external_cmms_status
)
values (
  '41000000-0000-4000-8000-000000000001',
  'WO-UAT-000001',
  '22000000-0000-4000-8000-000000000001',
  'integrity_decision',
  '36000000-0000-4000-8000-000000000001',
  'Synthetic UAT internal follow-up action',
  'Internal AIM fallback work order. External CMMS reference remains null.',
  'high',
  'open',
  'Plan repair/monitoring action from approved UAT integrity decision.',
  '21000000-0000-4000-8000-000000000004',
  current_date + interval '30 days',
  '21000000-0000-4000-8000-000000000004',
  '23000000-0000-4000-8000-000000000001',
  '36000000-0000-4000-8000-000000000001',
  '38000000-0000-4000-8000-000000000001',
  'approved_integrity_decision',
  'lead_engineer',
  false,
  'passed',
  '[{"gate":"approved_integrity_decision","status":"passed"},{"gate":"evidence_linkage","status":"passed"}]'::jsonb,
  true,
  '40000000-0000-4000-8000-000000000005',
  'UAT internal fallback only; no SAP, Maximo, or external CMMS integration.',
  null,
  null
)
on conflict (work_order_code) do update set
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  gate_status = excluded.gate_status,
  gate_checklist_json = excluded.gate_checklist_json,
  closure_evidence_required = excluded.closure_evidence_required,
  closure_evidence_link_id = excluded.closure_evidence_link_id,
  external_cmms_reference = null,
  external_cmms_status = null,
  updated_at = now();

insert into workflow_events(id, workflow_event_code, workflow_id, workflow_name, event_type, event_status, source_system, related_entity_type, related_entity_id, payload_json, created_by)
values (
  '42000000-0000-4000-8000-000000000001',
  'WF-UAT-000001',
  'WF-002',
  'AI Extraction Trigger',
  'workflow.ai_extraction_trigger.succeeded',
  'processed',
  'n8n',
  'extraction_job',
  '25000000-0000-4000-8000-000000000001',
  '{"uat_seed":true,"n8n_direct_db_write":false,"aim_api_only":true}'::jsonb,
  '21000000-0000-4000-8000-000000000009'
)
on conflict (workflow_event_code) do update set
  event_status = excluded.event_status,
  payload_json = excluded.payload_json;

insert into error_logs(id, error_code, error_message, severity, source_module, source_system, related_entity_type, related_entity_id, workflow_event_id, request_id, payload_json, status, created_by)
values (
  '43000000-0000-4000-8000-000000000001',
  'UAT_MISSING_EVIDENCE_REFERENCE',
  'Synthetic UAT error log for missing evidence reference recovery test.',
  'high',
  'ai_extraction',
  'aim',
  'extraction_field',
  '25000000-0000-4000-8000-000000000103',
  '42000000-0000-4000-8000-000000000001',
  'req-uat-000001',
  '{"uat_seed":true,"requires_human_action":true}'::jsonb,
  'open',
  '21000000-0000-4000-8000-000000000006'
)
on conflict (id) do update set
  error_message = excluded.error_message,
  status = excluded.status,
  payload_json = excluded.payload_json;

insert into audit_logs(id, event_type, actor_user_id, actor_role_codes, entity_type, entity_id, request_id, before_json, after_json, metadata_json)
values
  ('44000000-0000-4000-8000-000000000001', 'uat_seed.applied', '21000000-0000-4000-8000-000000000006', '{it_admin}', 'uat_seed', '22000000-0000-4000-8000-000000000001', 'req-uat-seed-000001', null, '{"seed":"0002_uat_sample_data.sql"}'::jsonb, '{"uat_sample_only":true,"synthetic_only":true,"not_for_production":true}'::jsonb),
  ('44000000-0000-4000-8000-000000000002', 'manual_override.created', '21000000-0000-4000-8000-000000000003', '{engineer}', 'manual_override', '27000000-0000-4000-8000-000000000001', 'req-uat-review-000001', '{"value":"RPT-WRONG-UAT"}'::jsonb, '{"value":"RPT-AIM-UAT-001"}'::jsonb, '{"evidence_code":"EVD-2026-900001","governance":"manual correction requires reason"}'::jsonb),
  ('44000000-0000-4000-8000-000000000003', 'REPORT_ISSUE_BLOCKED', '21000000-0000-4000-8000-000000000005', '{approver}', 'report', '38000000-0000-4000-8000-000000000001', 'req-uat-report-gate-000001', '{"issue_gate_status":"pending"}'::jsonb, '{"issue_gate_status":"blocked"}'::jsonb, '{"REPORT_GATES_NOT_SATISFIED":true,"REPORT_ISSUE_COMMENT_REQUIRED":true,"uat_expected_block":true}'::jsonb)
on conflict (id) do update set
  event_type = excluded.event_type,
  metadata_json = excluded.metadata_json;

commit;
