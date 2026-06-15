# Database Baseline

## Migration

Baseline migration: `db/migrations/0001_baseline.sql`

Includes:

- users
- roles
- permissions
- user_roles
- role_permissions
- assets
- tank_geometry
- shell_courses
- materials
- inspection_events
- evidence_files
- evidence_links
- formula_registry
- calculation_runs
- calculation_inputs
- calculation_outputs
- engineering_reviews
- approval_records
- ffs_cases
- rbi_cases
- audit_logs

## Seed

Baseline seed: `db/seeds/0001_foundation_seed.sql`

Seed is idempotent through `ON CONFLICT` upserts.

## Formula Registry Boundary

The seed includes a placeholder Formula Registry record only. It is draft, not executable, and contains no formula implementation.


## Sprint 2 Additive Migration

Migration: `db/migrations/0002_tank_asset_master_data.sql`

Adds or extends:

- `assets.location`
- `assets.tank_type`
- `assets.construction_year`
- `assets.original_design_code`
- `assets.current_assessment_code`
- `assets.code_edition`
- `assets.owner`
- `assets.operating_status`
- `assets.inspection_due_date`
- `assets.deleted_at`
- `assets.deleted_by`
- `tank_geometry.shell_height_m`
- `tank_geometry.number_of_courses`
- `tank_geometry.vacuum_design_basis`
- `shell_courses.course_height_mm`
- `shell_courses.measured_min_thickness_mm`
- `shell_courses.material_specification`
- `shell_courses.coating_lining_status`
- `materials.material_family`
- `materials.is_active`
- `asset.delete` permission

No calculation formulas are implemented by this migration.
