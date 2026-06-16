insert into roles(role_code, role_name, description) values
  ('admin', 'Administrator', 'Full system administration role.'),
  ('data_entry', 'Data Entry', 'Can input asset, inspection, evidence, and staging data.'),
  ('inspector', 'Inspector', 'Performs inspection and NDT data entry.'),
  ('engineer', 'Engineer', 'Reviews engineering data and runs draft calculations.'),
  ('senior_engineer', 'Senior Engineer', 'Approves engineering calculations and decisions.'),
  ('qa_qc', 'QA/QC', 'Quality review and formula governance role.'),
  ('client_viewer', 'Client Viewer', 'Read-only client-facing access.'),
  ('ai_agent', 'AI Agent', 'System role for AI extraction/staging only.')
on conflict (role_code) do update set
  role_name = excluded.role_name,
  description = excluded.description;

insert into permissions(permission_code, description) values
  ('asset.read', 'Read assets'),
  ('asset.create', 'Create assets'),
  ('asset.update', 'Update assets'),
  ('asset.delete', 'Soft delete tank assets'),
  ('asset.approve', 'Approve assets'),
  ('inspection.read', 'Read inspections'),
  ('inspection.create', 'Create inspections'),
  ('inspection.update', 'Update inspections'),
  ('inspection.review', 'Review inspections'),
  ('inspection.approve', 'Approve inspections'),
  ('evidence.read', 'Read evidence metadata'),
  ('evidence.upload', 'Upload evidence metadata'),
  ('evidence.link', 'Link evidence'),
  ('evidence.update_metadata', 'Update evidence metadata'),
  ('evidence.delete_request', 'Request evidence deletion'),
  ('evidence.delete_approve', 'Approve evidence deletion'),
  ('ai_extraction.create', 'Create AI extraction jobs'),
  ('ai_extraction.read', 'Read AI extraction output'),
  ('ai_extraction.review', 'Review extracted fields'),
  ('ai_extraction.correct', 'Correct extracted fields'),
  ('ai_extraction.promote', 'Promote reviewed staging records'),
  ('ndt.read', 'Read NDT data'),
  ('ndt.create', 'Create NDT data'),
  ('ndt.update', 'Update NDT data'),
  ('ndt.review', 'Review NDT data'),
  ('ndt.approve', 'Approve NDT data'),
  ('formula.read', 'Read formula registry'),
  ('formula.create', 'Create formula registry entries'),
  ('formula.update', 'Update formula registry entries'),
  ('formula.approve', 'Approve formula registry versions'),
  ('formula.retire', 'Retire formula registry versions'),
  ('calculation.run', 'Run controlled calculations'),
  ('calculation.read', 'Read calculation runs'),
  ('calculation.review', 'Review calculation runs'),
  ('calculation.approve', 'Approve calculation runs'),
  ('calculation.revise', 'Revise calculation runs'),
  ('ffs.trigger', 'Create FFS triggers'),
  ('ffs.review', 'Review FFS triggers'),
  ('ffs.request_assessment', 'Request FFS assessment'),
  ('rbi.interface.read', 'Read RBI interface records'),
  ('rbi.interface.create', 'Create RBI interface records'),
  ('rbi.interface.export', 'Export RBI interface records'),
  ('integrity_decision.create', 'Create integrity decisions'),
  ('integrity_decision.review', 'Review integrity decisions'),
  ('integrity_decision.approve', 'Approve integrity decisions'),
  ('report.generate', 'Generate reports'),
  ('report.review', 'Review reports'),
  ('report.approve', 'Approve reports'),
  ('report.issue', 'Issue reports'),
  ('work_order.create', 'Create internal work orders'),
  ('work_order.update', 'Update internal work orders'),
  ('work_order.close', 'Close internal work orders'),
  ('workflow_event.create', 'Create workflow events'),
  ('audit.read', 'Read audit logs'),
  ('admin.manage', 'Manage users, roles, and settings')
on conflict (permission_code) do update set description = excluded.description;

insert into users(email, full_name, password_hash, status) values
  ('admin@aim.local', 'AIM Admin', '$2a$12$placeholderplaceholderplaceholderplaceholderplaceholder12', 'active'),
  ('inspector@aim.local', 'Demo Inspector', '$2a$12$placeholderplaceholderplaceholderplaceholderplaceholder12', 'active'),
  ('engineer@aim.local', 'Demo Engineer', '$2a$12$placeholderplaceholderplaceholderplaceholderplaceholder12', 'active'),
  ('senior.engineer@aim.local', 'Demo Senior Engineer', '$2a$12$placeholderplaceholderplaceholderplaceholderplaceholder12', 'active'),
  ('qa@aim.local', 'Demo QA QC', '$2a$12$placeholderplaceholderplaceholderplaceholderplaceholder12', 'active'),
  ('client@aim.local', 'Demo Client Viewer', '$2a$12$placeholderplaceholderplaceholderplaceholderplaceholder12', 'active'),
  ('ai.agent@aim.local', 'AIM AI Agent', '$2a$12$placeholderplaceholderplaceholderplaceholderplaceholder12', 'active')
on conflict (email) do update set
  full_name = excluded.full_name,
  status = excluded.status;

insert into user_roles(user_id, role_id)
select u.id, r.id
from (values
  ('admin@aim.local', 'admin'),
  ('inspector@aim.local', 'inspector'),
  ('engineer@aim.local', 'engineer'),
  ('senior.engineer@aim.local', 'senior_engineer'),
  ('qa@aim.local', 'qa_qc'),
  ('client@aim.local', 'client_viewer'),
  ('ai.agent@aim.local', 'ai_agent')
) as map(email, role_code)
join users u on u.email = map.email
join roles r on r.role_code = map.role_code
on conflict do nothing;

-- Permission assignment is intentionally broad for admin and selective for other roles.
insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
cross join permissions p
where r.role_code = 'admin'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'asset.read','inspection.read','evidence.read','ndt.read','formula.read','calculation.read','rbi.interface.read'
)
where r.role_code = 'client_viewer'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'asset.read','inspection.read','evidence.read','ai_extraction.create','ai_extraction.read','workflow_event.create'
)
where r.role_code = 'ai_agent'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'asset.read','asset.create','asset.update','inspection.read','inspection.create','evidence.read','evidence.upload','evidence.link','ai_extraction.read','ndt.read','ndt.create'
)
where r.role_code = 'data_entry'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'asset.read','inspection.read','inspection.create','inspection.update','evidence.read','evidence.upload','evidence.link','ndt.read','ndt.create','ndt.update','work_order.create','work_order.update'
)
where r.role_code = 'inspector'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'asset.read','asset.update','inspection.read','inspection.update','inspection.review','evidence.read','evidence.link','evidence.update_metadata',
  'ai_extraction.read','ai_extraction.review','ai_extraction.correct','ai_extraction.promote','ndt.read','ndt.review','formula.read',
  'calculation.run','calculation.read','calculation.review','calculation.revise','ffs.trigger','ffs.review','rbi.interface.read','rbi.interface.create',
  'integrity_decision.create','integrity_decision.review','report.generate','report.review','work_order.create','work_order.update'
)
where r.role_code = 'engineer'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'asset.read','asset.update','asset.delete','asset.approve','inspection.read','inspection.review','inspection.approve','evidence.read','evidence.link','evidence.update_metadata','evidence.delete_request',
  'ai_extraction.read','ai_extraction.review','ai_extraction.correct','ai_extraction.promote','ndt.read','ndt.review','ndt.approve','formula.read','formula.create','formula.update',
  'calculation.run','calculation.read','calculation.review','calculation.approve','calculation.revise','ffs.trigger','ffs.review','ffs.request_assessment',
  'rbi.interface.read','rbi.interface.create','rbi.interface.export','integrity_decision.create','integrity_decision.review','integrity_decision.approve',
  'report.generate','report.review','report.approve','work_order.create','work_order.update','work_order.close','audit.read'
)
where r.role_code = 'senior_engineer'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'asset.read','inspection.read','evidence.read','ai_extraction.read','ndt.read','formula.read',
  'calculation.read','calculation.review','ffs.review','rbi.interface.read','integrity_decision.review','report.review','report.approve','audit.read'
)
where r.role_code = 'qa_qc'
on conflict do nothing;

insert into materials(material_code, material_name, material_specification, notes) values
  ('AIM-DEMO-CS-001', 'Demo Carbon Steel', 'Demo material specification - not for engineering use', 'Seed material for local development only.')
on conflict (material_code) do update set
  material_name = excluded.material_name,
  material_specification = excluded.material_specification,
  notes = excluded.notes;

insert into assets(
  asset_tag,
  asset_name,
  asset_type,
  facility,
  area,
  location,
  service_fluid,
  status,
  tank_type,
  construction_year,
  design_code,
  design_code_edition,
  original_design_code,
  current_assessment_code,
  code_edition,
  owner,
  operating_status,
  inspection_due_date
)
values (
  'TK-001',
  'Demo Aboveground Storage Tank',
  'aboveground_storage_tank',
  'Demo Facility',
  'Tank Farm A',
  'Tank Farm A - East Bund',
  'Water - demo only',
  'draft',
  'aboveground_storage_tank',
  2010,
  'API 650',
  'User-supplied basis required',
  'API 650',
  'API 653',
  'User-supplied edition required',
  'Demo Owner',
  'in_service',
  current_date + interval '180 days'
)
on conflict (asset_tag) do update set
  asset_name = excluded.asset_name,
  facility = excluded.facility,
  area = excluded.area,
  location = excluded.location,
  service_fluid = excluded.service_fluid,
  tank_type = excluded.tank_type,
  construction_year = excluded.construction_year,
  design_code = excluded.design_code,
  design_code_edition = excluded.design_code_edition,
  original_design_code = excluded.original_design_code,
  current_assessment_code = excluded.current_assessment_code,
  code_edition = excluded.code_edition,
  owner = excluded.owner,
  operating_status = excluded.operating_status,
  inspection_due_date = excluded.inspection_due_date;

insert into tank_geometry(
  asset_id,
  diameter_m,
  height_m,
  shell_height_m,
  number_of_courses,
  nominal_capacity_m3,
  design_liquid_level_m,
  bottom_type,
  roof_type,
  foundation_type,
  construction_year,
  design_pressure_kpa,
  design_temperature_c,
  specific_gravity,
  vacuum_design_basis,
  status
)
select id, 20.0000, 12.0000, 12.0000, 3, 3500.0000, 11.5000, 'flat_bottom', 'fixed_roof', 'ringwall', 2010, 0.0000, 60.0000, 1.0000, 'Not specified - engineering review required', 'draft'
from assets where asset_tag = 'TK-001'
on conflict (asset_id) do update set
  diameter_m = excluded.diameter_m,
  height_m = excluded.height_m,
  shell_height_m = excluded.shell_height_m,
  number_of_courses = excluded.number_of_courses,
  nominal_capacity_m3 = excluded.nominal_capacity_m3,
  design_liquid_level_m = excluded.design_liquid_level_m,
  bottom_type = excluded.bottom_type,
  roof_type = excluded.roof_type,
  foundation_type = excluded.foundation_type,
  design_pressure_kpa = excluded.design_pressure_kpa,
  design_temperature_c = excluded.design_temperature_c,
  specific_gravity = excluded.specific_gravity,
  vacuum_design_basis = excluded.vacuum_design_basis,
  updated_at = now();

insert into shell_courses(
  asset_id,
  course_no,
  material_id,
  nominal_thickness_mm,
  measured_min_thickness_mm,
  minimum_required_thickness_mm,
  height_mm,
  course_height_mm,
  material_specification,
  joint_efficiency,
  corrosion_allowance_mm,
  coating_lining_status,
  status
)
select a.id, course_no, m.id, nominal_thickness_mm, measured_min_thickness_mm, minimum_required_thickness_mm, 4000.000, 4000.000, m.material_specification, 1.0000, 1.000, 'unknown', 'draft'
from assets a
cross join materials m
join (values
  (1, 12.000, 11.500, 8.000),
  (2, 10.000, 9.600, 7.000),
  (3, 8.000, 7.700, 6.000)
) as sc(course_no, nominal_thickness_mm, measured_min_thickness_mm, minimum_required_thickness_mm) on true
where a.asset_tag = 'TK-001' and m.material_code = 'AIM-DEMO-CS-001'
on conflict (asset_id, course_no) do update set
  material_id = excluded.material_id,
  nominal_thickness_mm = excluded.nominal_thickness_mm,
  measured_min_thickness_mm = excluded.measured_min_thickness_mm,
  minimum_required_thickness_mm = excluded.minimum_required_thickness_mm,
  height_mm = excluded.height_mm,
  course_height_mm = excluded.course_height_mm,
  material_specification = excluded.material_specification,
  joint_efficiency = excluded.joint_efficiency,
  corrosion_allowance_mm = excluded.corrosion_allowance_mm,
  coating_lining_status = excluded.coating_lining_status,
  updated_at = now();

insert into formula_registry(
  formula_code,
  formula_name,
  code_basis,
  clause_reference,
  edition,
  inputs_schema,
  outputs_schema,
  units_schema,
  validation_rules,
  formula_expression_source,
  formula_expression,
  version,
  status
) values (
  'MVP-CORROSION-RATE-PLACEHOLDER',
  'MVP Corrosion Rate Placeholder - Not Executable',
  'Engineering Basis / User-approved formula registry required',
  'N/A - placeholder only',
  'MVP Foundation',
  '{"previous_thickness_mm":"number","current_thickness_mm":"number","years_between_inspections":"number"}'::jsonb,
  '{"corrosion_rate_mm_y":"number"}'::jsonb,
  '{"thickness":"mm","time":"year"}'::jsonb,
  '["Formula is not executable until approved_active and populated from Engineering Basis or approved workbook."]'::jsonb,
  'Placeholder only. No engineering formula implemented in this sprint.',
  null,
  '0.0.0-placeholder',
  'draft'
)
on conflict (formula_code, version) do update set
  formula_name = excluded.formula_name,
  validation_rules = excluded.validation_rules,
  formula_expression_source = excluded.formula_expression_source,
  status = excluded.status;

insert into audit_logs(event_type, entity_type, metadata_json)
values ('FOUNDATION_SEED_EXECUTED', 'database_seed', '{"seed":"0001_foundation_seed","idempotent":true}'::jsonb);
