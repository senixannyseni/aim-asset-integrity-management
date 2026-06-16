-- Sprint 2: Tank Asset Register and Engineering Master Data
-- Additive migration only. No engineering calculation is implemented here.

alter table assets
  add column if not exists location text,
  add column if not exists tank_type text,
  add column if not exists construction_year integer,
  add column if not exists original_design_code text,
  add column if not exists current_assessment_code text,
  add column if not exists code_edition text,
  add column if not exists owner text,
  add column if not exists operating_status text,
  add column if not exists inspection_due_date date,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references users(id);

update assets
set
  location = coalesce(location, area),
  tank_type = coalesce(tank_type, 'aboveground_storage_tank'),
  construction_year = coalesce(construction_year, null),
  original_design_code = coalesce(original_design_code, design_code),
  code_edition = coalesce(code_edition, design_code_edition),
  owner = coalesce(owner, 'Unassigned'),
  operating_status = coalesce(operating_status, case when status = 'active' then 'in_service' else 'out_of_service' end)
where tank_type is null
   or original_design_code is null
   or code_edition is null
   or owner is null
   or operating_status is null;

alter table tank_geometry
  add column if not exists shell_height_m numeric(12,4),
  add column if not exists number_of_courses integer,
  add column if not exists vacuum_design_basis text,
  add column if not exists unit_system text not null default 'metric';

update tank_geometry
set shell_height_m = coalesce(shell_height_m, height_m)
where shell_height_m is null;

alter table shell_courses
  add column if not exists course_height_mm numeric(12,3),
  add column if not exists measured_min_thickness_mm numeric(10,3),
  add column if not exists material_specification text,
  add column if not exists coating_lining_status text,
  add column if not exists unit_system text not null default 'metric';

update shell_courses
set
  course_height_mm = coalesce(course_height_mm, height_mm),
  measured_min_thickness_mm = coalesce(measured_min_thickness_mm, nominal_thickness_mm),
  coating_lining_status = coalesce(coating_lining_status, 'unknown')
where course_height_mm is null
   or measured_min_thickness_mm is null
   or coating_lining_status is null;

alter table materials
  add column if not exists material_family text,
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

insert into permissions(permission_code, description) values
  ('asset.delete', 'Soft delete tank assets')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code = 'asset.delete'
where r.role_code in ('admin', 'senior_engineer')
on conflict do nothing;

insert into materials(material_code, material_name, material_specification, material_family, notes) values
  ('ASTM-A36', 'ASTM A36 Carbon Steel', 'ASTM A36', 'carbon_steel', 'Reference material option for tank shell master data. Verify project-specific applicability before engineering use.'),
  ('ASTM-A283-C', 'ASTM A283 Grade C Carbon Steel', 'ASTM A283 Grade C', 'carbon_steel', 'Reference material option for tank shell master data. Verify project-specific applicability before engineering use.'),
  ('ASTM-A516-70', 'ASTM A516 Grade 70 Carbon Steel', 'ASTM A516 Grade 70', 'carbon_steel', 'Reference material option for tank shell master data. Verify project-specific applicability before engineering use.')
on conflict (material_code) do update set
  material_name = excluded.material_name,
  material_specification = excluded.material_specification,
  material_family = excluded.material_family,
  notes = excluded.notes,
  is_active = true,
  updated_at = now();

create index if not exists idx_assets_operating_status on assets(operating_status);
create index if not exists idx_assets_inspection_due_date on assets(inspection_due_date);
create index if not exists idx_assets_deleted_at on assets(deleted_at);
create index if not exists idx_materials_is_active on materials(is_active);
