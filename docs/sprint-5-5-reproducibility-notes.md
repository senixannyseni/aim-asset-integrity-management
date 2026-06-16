# Sprint 5.5 — Baseline Reproducibility and Documentation Alignment

## Objective

Make the AIM+n8n Tank Integrity repository clean-clone reproducible through Sprint 5 and align current documentation with the implemented schema/API surface.

## Changes

- Restored foundational migrations `0001_baseline.sql`, `0002_tank_asset_master_data.sql`, and `0003_governance_hardening.sql` so a clean database can migrate through `0006_formula_registry_module.sql`.
- Updated README, sprint status, ERD, and data dictionary through Sprint 5.
- Added migration-sequence regression tests to confirm migrations `0001` through `0006` are tracked.
- Strengthened Formula Registry source traceability with required `formula_expression_source` handling in validation, create, update, versioning, migration, and OpenAPI schema.
- Aligned Formula Registry RBAC policy: formula create/update/approve/deprecate/test-run are restricted to `admin` and `senior_engineer`; QA/QC retains read/audit review visibility only.

## Boundary Confirmation

No engineering calculation was implemented. No API/API-ASME formula expression or copyrighted standard clause text was embedded. No AI extraction runtime, report generation, or work-order integration was implemented.
