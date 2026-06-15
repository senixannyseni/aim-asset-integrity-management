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
