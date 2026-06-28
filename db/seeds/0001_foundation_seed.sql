insert into roles(role_code, role_name, description) values
  ('admin', 'Administrator', 'Full system administration role.'),
  ('data_entry', 'Data Entry', 'Can input asset, inspection, evidence, and staging data.'),
  ('inspector', 'Inspector', 'Performs inspection and NDT data entry.'),
  ('engineer', 'Engineer', 'Reviews engineering data and runs draft calculations.'),
  ('senior_engineer', 'Senior Engineer', 'Approves engineering calculations and decisions.'),
  ('lead_engineer', 'Lead Engineer', 'Leads engineering review, staging promotion, and controlled engineering approvals.'),
  ('approver', 'Approver', 'Approves controlled reports, integrity decisions, and formal issue actions.'),
  ('management', 'Management', 'Read-only management dashboard and reporting access.'),
  ('it_admin', 'IT Admin', 'Manages technical configuration, workflow monitoring, and system operations.'),
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
  ('finding.read', 'Read findings and anomaly records'),
  ('finding.create', 'Create findings and anomaly records'),
  ('finding.update', 'Update findings and safe linkages'),
  ('finding.close', 'Close findings with human-governed closure reason'),
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
  ('report.read', 'Read generated reports'),
  ('report.generate', 'Generate reports'),
  ('report.review', 'Review reports'),
  ('report.approve', 'Approve reports'),
  ('report.issue', 'Issue reports'),
  ('work_order.read', 'Read internal work orders'),
  ('work_order.create', 'Create internal work orders'),
  ('work_order.update', 'Update internal work orders'),
  ('work_order.close', 'Close internal work orders'),
  ('workflow_event.create', 'Create workflow events'),
  ('audit.read', 'Read audit logs'),
  ('audit_logs.view', 'View redacted, read-only audit log governance records'),
  ('admin.manage', 'Manage users, roles, and settings')
on conflict (permission_code) do update set description = excluded.description;

insert into permissions(permission_code, description) values
  ('auth.login', 'Authenticate user login'),
  ('auth.logout', 'Invalidate user session or refresh token'),
  ('auth.refresh', 'Refresh authenticated session token'),
  ('dashboard.view', 'View AIM dashboard and KPI summaries'),
  ('workflow_console.view', 'View read-only AIM-side workflow orchestration console summaries and redacted workflow metadata'),
  ('ndt_data_room.view', 'View read-only NDT data room summaries, measurement readiness, and evidence linkage visibility'),
  ('golive_readiness.view', 'View read-only hypercare and go-live readiness summaries, blockers, gates, and UAT readiness indicators'),

  ('user.read', 'Read AIM users'),
  ('user.manage', 'Create, update, disable, or manage AIM users'),
  ('role.read', 'Read AIM roles'),
  ('role.manage', 'Create, update, or manage AIM roles'),
  ('permission.read', 'Read AIM permissions'),
  ('permission.manage', 'Grant, revoke, or manage AIM permissions'),

  ('staging.review', 'Review AI extraction staging records'),
  ('staging.promote', 'Promote engineer-reviewed staging records'),
  ('manual_override.create', 'Create manual correction records with reason and evidence reference'),
  ('data_quality_check.read', 'Read AI extraction and staging data quality checks'),

  ('evidence.download_url', 'Create short-lived signed evidence download URLs'),

  ('system_settings.read', 'Read AIM system settings'),
  ('system_settings.update', 'Update AIM system settings')
on conflict (permission_code) do update set
  description = excluded.description;

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


insert into permissions(permission_code, description) values
  ('admin_governance.view', 'View read-only admin governance users, roles, permissions, assignments, and redacted settings'),
  ('admin_governance.manage_roles', 'Safely assign or remove user-role mappings with reason and audit logging'),
  ('admin_governance.manage_settings', 'Safely update allowlisted non-secret system settings with reason and audit logging')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'admin_governance.view',
  'admin_governance.manage_roles',
  'admin_governance.manage_settings'
)
where r.role_code in ('admin', 'it_admin')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code = 'workflow_console.view'
where r.role_code in ('admin', 'it_admin', 'management')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code = 'ndt_data_room.view'
where r.role_code in ('admin', 'data_entry', 'inspector', 'engineer', 'senior_engineer', 'lead_engineer', 'approver', 'qa_qc', 'management', 'it_admin', 'client_viewer')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code = 'golive_readiness.view'
where r.role_code in ('admin', 'data_entry', 'inspector', 'engineer', 'senior_engineer', 'lead_engineer', 'approver', 'qa_qc', 'management', 'it_admin', 'client_viewer')
on conflict do nothing;


insert into system_settings(setting_key, setting_value, setting_type, description, requires_approval) values
  ('evidence_retention_days', '3650'::jsonb, 'number', 'Non-secret evidence governance retention window in days.', false),
  ('report_export_expiry_hours', '24'::jsonb, 'number', 'Non-secret report export link policy window in hours.', false),
  ('ai_review_sla_hours', '72'::jsonb, 'number', 'Non-secret AI review reminder SLA in hours.', false),
  ('governance_banner_text', '"AIM governance controls active"'::jsonb, 'string', 'Non-secret admin governance banner text.', false),
  ('admin_governance_read_only_notice_enabled', 'true'::jsonb, 'boolean', 'Non-secret UI notice toggle for admin governance.', false)
on conflict (setting_key) do update set
  description = excluded.description,
  setting_type = excluded.setting_type,
  updated_at = now();

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
  'asset.read','inspection.read','evidence.read','ndt.read','ndt_data_room.view','formula.read','calculation.read','rbi.interface.read'
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
  'asset.read','inspection.read','inspection.create','inspection.update','evidence.read','evidence.upload','evidence.link','ndt.read','ndt_data_room.view','ndt.create','ndt.update','work_order.read','work_order.create','work_order.update'
)
where r.role_code = 'inspector'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'asset.read','asset.update','inspection.read','inspection.update','inspection.review','evidence.read','evidence.link','evidence.update_metadata',
  'ai_extraction.read','ai_extraction.review','ai_extraction.correct','ai_extraction.promote','ndt.read','ndt_data_room.view','ndt.review','formula.read',
  'calculation.run','calculation.read','calculation.review','calculation.revise','ffs.trigger','ffs.review','rbi.interface.read','rbi.interface.create',
  'integrity_decision.create','integrity_decision.review','report.read','report.generate','report.review','work_order.read','work_order.create','work_order.update'
)
where r.role_code = 'engineer'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'asset.read','asset.update','asset.delete','asset.approve','inspection.read','inspection.review','inspection.approve','evidence.read','evidence.link','evidence.update_metadata','evidence.delete_request',
  'ai_extraction.read','ai_extraction.review','ai_extraction.correct','ai_extraction.promote','ndt.read','ndt_data_room.view','ndt.review','ndt.approve','formula.read','formula.create','formula.update',
  'calculation.run','calculation.read','calculation.review','calculation.approve','calculation.revise','ffs.trigger','ffs.review','ffs.request_assessment',
  'rbi.interface.read','rbi.interface.create','rbi.interface.export','integrity_decision.create','integrity_decision.review','integrity_decision.approve',
  'report.generate','report.review','report.approve','work_order.read','work_order.create','work_order.update','work_order.close','audit.read','audit_logs.view'
)
where r.role_code in ('senior_engineer','lead_engineer')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'asset.read','inspection.read','evidence.read','ai_extraction.read','ndt.read','formula.read',
  'calculation.read','calculation.review','ffs.review','rbi.interface.read','integrity_decision.review','report.read','report.review','report.approve','audit.read','audit_logs.view'
)
where r.role_code = 'qa_qc'
on conflict do nothing;


-- Sprint 7 governance hardening permission synchronization.
-- This block mirrors apps/api/src/rbac/roles.ts for DB-backed RBAC readiness.
insert into permissions(permission_code, description) values
  ('asset.read', 'Asset Read'),
  ('asset.create', 'Asset Create'),
  ('asset.update', 'Asset Update'),
  ('asset.delete', 'Asset Delete'),
  ('asset.approve', 'Asset Approve'),
  ('inspection.read', 'Inspection Read'),
  ('inspection.create', 'Inspection Create'),
  ('inspection.update', 'Inspection Update'),
  ('inspection.review', 'Inspection Review'),
  ('inspection.approve', 'Inspection Approve'),
  ('evidence.open', 'Evidence Open'),
  ('evidence.read', 'Evidence Read'),
  ('evidence.upload', 'Evidence Upload'),
  ('evidence.link', 'Evidence Link'),
  ('evidence.update_metadata', 'Evidence Update Metadata'),
  ('evidence.delete_request', 'Evidence Delete Request'),
  ('evidence.delete_approve', 'Evidence Delete Approve'),
  ('ai_extraction.create', 'Ai Extraction Create'),
  ('ai_extraction.read', 'Ai Extraction Read'),
  ('ai_extraction.review', 'Ai Extraction Review'),
  ('ai_extraction.correct', 'Ai Extraction Correct'),
  ('ai_extraction.promote', 'Ai Extraction Promote'),
  ('ndt.read', 'Ndt Read'),
  ('ndt.create', 'Ndt Create'),
  ('ndt.import', 'Ndt Import'),
  ('ndt.update', 'Ndt Update'),
  ('ndt.review', 'Ndt Review'),
  ('ndt.approve', 'Ndt Approve'),
  ('formula.read', 'Formula Read'),
  ('formula.create', 'Formula Create'),
  ('formula.update', 'Formula Update'),
  ('formula.approve', 'Formula Approve'),
  ('formula.retire', 'Formula Retire'),
  ('formula.test', 'Formula Test'),
  ('calculation.run', 'Calculation Run'),
  ('calculation.read', 'Calculation Read'),
  ('calculation.review', 'Calculation Review'),
  ('calculation.approve', 'Calculation Approve'),
  ('calculation.revise', 'Calculation Revise'),
  ('ffs.read', 'Ffs Read'),
  ('ffs.create', 'Ffs Create'),
  ('ffs.trigger', 'Ffs Trigger'),
  ('ffs.update', 'Ffs Update'),
  ('ffs.review', 'Ffs Review'),
  ('ffs.request_assessment', 'Ffs Request Assessment'),
  ('ffs.approve', 'Ffs Approve'),
  ('ffs.close', 'Ffs Close'),
  ('rbi.interface.read', 'Rbi Interface Read'),
  ('rbi.interface.create', 'Rbi Interface Create'),
  ('rbi.interface.export', 'Rbi Interface Export'),
  ('integrity_decision.create', 'Integrity Decision Create'),
  ('integrity_decision.review', 'Integrity Decision Review'),
  ('integrity_decision.approve', 'Integrity Decision Approve'),
  ('report.read', 'Report Read'),
  ('report.generate', 'Report Generate'),
  ('report.review', 'Report Review'),
  ('report.approve', 'Report Approve'),
  ('report.issue', 'Report Issue'),
  ('work_order.read', 'Work Order Read'),
  ('work_order.create', 'Work Order Create'),
  ('work_order.update', 'Work Order Update'),
  ('work_order.close', 'Work Order Close'),
  ('workflow_event.create', 'Workflow Event Create'),
  ('error_log.create', 'Error Log Create'),
  ('error_log.read', 'Error Log Read'),
  ('validation.read', 'Validation Read'),
  ('validation.run', 'Validation Run'),
  ('audit.read', 'Audit Read'),
  ('audit_logs.view', 'Audit Logs View'),
  ('admin.manage', 'Admin Manage')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('asset.read','asset.create','asset.update','inspection.read','inspection.create','evidence.read','evidence.upload','evidence.link','ai_extraction.read','ndt.read','ndt_data_room.view','ndt.import','ndt.create','validation.read')
where r.role_code = 'data_entry'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('asset.read','inspection.read','inspection.create','inspection.update','evidence.read','evidence.upload','evidence.link','ndt.read','ndt_data_room.view','ndt.create','ndt.update','ndt.import','validation.read','validation.run','work_order.read','work_order.create','work_order.update')
where r.role_code = 'inspector'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('asset.read','asset.update','inspection.read','inspection.update','inspection.review','evidence.read','evidence.link','evidence.update_metadata','ai_extraction.read','ai_extraction.review','ai_extraction.correct','ai_extraction.promote','ndt.read','ndt_data_room.view','ndt.review','ndt.import','formula.read','calculation.run','calculation.read','calculation.review','calculation.revise','ffs.read','ffs.create','ffs.trigger','ffs.update','ffs.review','rbi.interface.read','rbi.interface.create','integrity_decision.create','integrity_decision.review','report.read','report.generate','report.review','work_order.read','work_order.create','work_order.update')
where r.role_code = 'engineer'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('asset.read','asset.update','asset.delete','asset.approve','inspection.read','inspection.review','inspection.approve','evidence.read','evidence.link','evidence.update_metadata','evidence.delete_request','ai_extraction.read','ai_extraction.review','ai_extraction.correct','ai_extraction.promote','ndt.read','ndt_data_room.view','ndt.review','ndt.approve','ndt.import','formula.read','formula.create','formula.update','formula.approve','formula.retire','formula.test','calculation.run','calculation.read','calculation.review','calculation.approve','calculation.revise','ffs.read','ffs.create','ffs.trigger','ffs.update','ffs.review','ffs.request_assessment','ffs.approve','ffs.close','rbi.interface.read','rbi.interface.create','rbi.interface.export','integrity_decision.create','integrity_decision.review','integrity_decision.approve','report.read','report.generate','report.review','report.approve','work_order.read','work_order.create','work_order.update','work_order.close','validation.read','validation.run','workflow_event.create','error_log.create','error_log.read','audit.read','audit_logs.view')
where r.role_code in ('senior_engineer','lead_engineer')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('asset.read','inspection.read','evidence.read','ai_extraction.read','ndt.read','ndt_data_room.view','ndt.import','formula.read','calculation.read','calculation.review','ffs.read','ffs.review','rbi.interface.read','integrity_decision.review','report.read','report.review','report.approve','validation.read','validation.run','error_log.read','audit.read')
where r.role_code = 'qa_qc'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('asset.read','inspection.read','evidence.read','ndt.read','ndt_data_room.view','formula.read','calculation.read','ffs.read','rbi.interface.read','validation.read')
where r.role_code = 'client_viewer'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('asset.read','inspection.read','evidence.read','ai_extraction.create','ai_extraction.read','workflow_event.create','error_log.create')
where r.role_code = 'ai_agent'
on conflict do nothing;

-- Governance guardrail: AI agent is intentionally not granted approval/finalization permissions.
-- No ffs.approve, ffs.close, ndt.approve, formula.approve, calculation.approve, report.approve, report.issue, or integrity_decision.approve is assigned to ai_agent.

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

-- Sprint 8 RBI interface permissions synchronization.
insert into permissions(permission_code, description) values
  ('rbi.interface.update', 'Update RBI interface workflow status and review data'),
  ('rbi.interface.review', 'Review RBI interface records'),
  ('rbi.interface.approve', 'Approve RBI interface summary for export or inspection planning')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('rbi.interface.read','rbi.interface.create','rbi.interface.update','rbi.interface.review','rbi.interface.approve','rbi.interface.export')
where r.role_code in ('admin','senior_engineer','lead_engineer')
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
join permissions p on p.permission_code in ('rbi.interface.read','rbi.interface.review')
where r.role_code = 'qa_qc'
on conflict do nothing;

-- ai_agent intentionally receives no rbi.interface.* approval/finalization permissions.

-- Sprint 9 engineering review and approval workflow permissions synchronization.
insert into permissions(permission_code, description) values
  ('engineering_review.read', 'Read engineering review and approval workflow records'),
  ('engineering_review.create', 'Create engineering review workflow records'),
  ('engineering_review.update', 'Update engineering review workflow status and checklist'),
  ('engineering_review.comment', 'Add engineering review comments'),
  ('engineering_review.approve', 'Approve or lock engineering review workflow records'),
  ('engineering_review.override', 'Approve controlled engineering overrides'),
  ('approval_record.read', 'Read engineering approval records'),
  ('approval_record.create', 'Create engineering approval requests'),
  ('approval_record.approve', 'Approve engineering approval records'),
  ('approval_record.reject', 'Reject engineering approval records')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'engineering_review.read','engineering_review.create','engineering_review.update','engineering_review.comment',
  'approval_record.read','approval_record.create'
)
where r.role_code in ('engineer','senior_engineer','qa_qc')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'engineering_review.approve','engineering_review.override','approval_record.approve','approval_record.reject'
)
where r.role_code in ('admin','senior_engineer','lead_engineer')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('engineering_review.read','approval_record.read')
where r.role_code = 'client_viewer'
on conflict do nothing;

-- ai_agent intentionally receives no engineering review, approval, override, reject, or lock permissions.


-- Sprint 10 report generation permissions synchronization.
insert into permissions(permission_code, description) values
  ('report.read', 'Read generated tank integrity reports'),
  ('report.generate', 'Generate draft tank integrity reports'),
  ('report.review', 'Review draft tank integrity reports'),
  ('report.approve', 'Approve generated tank integrity reports'),
  ('report.issue', 'Issue approved tank integrity reports'),
  ('report.export', 'Create and download object-storage report export artifacts')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('report.read','report.generate','report.review')
where r.role_code in ('engineer','senior_engineer','qa_qc')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('report.approve','report.issue','report.export')
where r.role_code in ('admin','senior_engineer','lead_engineer','approver')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code = 'report.read'
where r.role_code = 'client_viewer'
on conflict do nothing;

-- RC3-B report export object-storage permission synchronization.
-- ai_agent intentionally receives no report generation, export, approval, issue, or finalization permissions.
