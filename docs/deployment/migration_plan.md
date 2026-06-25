# AIM Phase 2.0 Migration Plan

**Sprint:** Phase 2.0 — MVP Release Readiness Pack  
**Purpose:** Define clean database setup, upgrade validation, rollback, and migration acceptance criteria.  
**Scope:** Release readiness only. No new schema migration is required by Phase 2.0 unless a future UAT sample seed is explicitly added.

## 1. Migration Baseline

The expected baseline is the repository after Phase 1 Governance Closure through Phase 1.7.

Expected migrations in current repository:

| Order | Migration |
|---:|---|
| 0001 | `0001_baseline.sql` |
| 0002 | `0002_tank_asset_master_data.sql` |
| 0003 | `0003_governance_hardening.sql` |
| 0004 | `0004_evidence_ndt_data_room.sql` |
| 0005 | `0005_engineering_validation_engine.sql` |
| 0006 | `0006_formula_registry_module.sql` |
| 0007 | `0007_deterministic_calculation_engine.sql` |
| 0008 | `0008_ffs_trigger_workflow.sql` |
| 0009 | `0009_rbi_interface_trigger_workflow.sql` |
| 0010 | `0010_engineering_review_approval_workflow.sql` |
| 0011 | `0011_report_generation_engine.sql` |
| 0012 | `0012_auth_rbac_skeleton.sql` |
| 0013 | `0013_source_truth_schema_closure.sql` |
| 0014 | `0014_phase1_3_ai_evidence_approval_governance.sql` |
| 0015 | `0015_phase1_5_calculation_governance_hardening.sql` |
| 0016 | `0016_phase1_6_report_issue_work_order_gates.sql` |

Migration rules:

- Production/UAT migration is performed by AIM backend/operator only.
- n8n must not run migrations.
- n8n must not have PostgreSQL credentials.
- AI services must not write directly to final engineering tables.
- Preserve audit history and evidence linkage.

## 2. Clean Database Setup

Use this path for local/UAT rehearsal.

1. Create or reset empty UAT database.
2. Configure `DATABASE_URL` to point to this database.
3. Apply migrations from zero.
4. Apply foundation seed.
5. Optionally apply UAT sample seed if created and explicitly approved.
6. Run validation queries/checks.
7. Run API regression tests.
8. Run UAT smoke cases.

Commands:

```powershell
pnpm db:migrate
pnpm db:seed
pnpm --filter @aim/api typecheck
pnpm --filter @aim/api test
```

Optional future UAT seed guidance:

```powershell
# Only in local/UAT, never production, and only if db/seeds/0002_uat_sample_data.sql exists and is approved.
# Use the project-approved seed runner or psql command for the UAT database only.
```

## 3. Upgrade Path from Phase 1.6 / Phase 1.7 Baseline to Phase 2.0

Phase 2.0 is documentation-first and readiness-test focused.

Expected upgrade behavior:

- No new schema migration required.
- No data-destructive migration introduced.
- No change to Phase 1 governance behavior.
- Existing migrations remain authoritative.
- Existing seed remains authoritative unless a future UAT sample seed is approved for local/UAT only.

Upgrade steps:

1. Pull/checkout Phase 2.0 branch.
2. Confirm clean working tree.
3. Run typecheck and tests.
4. Run `pnpm db:migrate` against UAT DB to confirm no missing migrations.
5. Run `pnpm db:seed` against UAT DB to confirm idempotent baseline behavior.
6. Execute release-readiness static test.
7. Execute smoke tests from deployment runbook.

## 4. Validation Queries and Checks

Run equivalent checks through the project migration/test runner or psql.

### 4.1 Core Tables Exist

Expected table/entity groups:

- `users`, `roles`, `permissions`, `user_roles`, `role_permissions`
- `assets`, `asset_components`, `inspections`, `inspection_findings`
- `evidence_files`, `evidence_links`
- `extraction_jobs`, `extraction_fields`, `staging_records`, `manual_overrides`, `data_quality_checks`
- `ndt_measurements`, `cml_points`, `thickness_readings`
- `formula_versions`, `calculation_runs`, `calculation_inputs`, `calculation_outputs`, `calculation_validation_cases`
- `integrity_decisions`, `reports`, `report_templates`, `report_versions`, `report_exports`
- `workflow_events`, `workflow_tasks`, `notification_logs`, `error_logs`, `audit_logs`
- `system_settings`, `internal_work_orders`

Example validation query pattern:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'users','roles','permissions','assets','evidence_files','evidence_links',
    'extraction_jobs','extraction_fields','staging_records','manual_overrides',
    'data_quality_checks','formula_versions','calculation_runs','calculation_inputs',
    'calculation_outputs','calculation_validation_cases','integrity_decisions',
    'reports','report_versions','report_exports','workflow_events','workflow_tasks',
    'notification_logs','error_logs','audit_logs','system_settings','internal_work_orders'
  )
order by table_name;
```

### 4.2 Required Permissions Exist

At minimum check:

- `asset.read`, `asset.create`, `asset.update`, `asset.approve`
- `inspection.read`, `inspection.create`, `inspection.update`, `inspection.submit`, `inspection.approve`
- `evidence.read`, `evidence.upload`, `evidence.link`, `evidence.download_url`, `evidence.delete_request`, `evidence.delete_approve`
- `ai_extraction.create`, `ai_extraction.review`, `ai_extraction.correct`, `ai_extraction.promote`
- `staging.review`, `staging.promote`
- `manual_override.create`
- `calculation.read`, `calculation.run`, `calculation.review`, `calculation.approve`, `calculation.reject`
- `integrity.read`, `integrity.create`, `integrity.review`, `integrity.approve`, `integrity.reject`
- `report.read`, `report.generate`, `report.review`, `report.approve`, `report.issue`
- `work_order.read`, `work_order.create`, `work_order.update`, `work_order.close`
- `workflow_event.create`, `workflow_event.read`
- `error_log.create`, `error_log.read`, `error_log.resolve`
- `audit.read`

### 4.3 Required Roles Exist

Expected system roles:

- Admin
- Inspector
- Engineer
- Lead Engineer
- Approver
- Management
- IT Admin
- ai_agent or equivalent service role if present
- n8n_service or equivalent workflow service role if present

### 4.4 Formula Version and Calculation Governance

Check that:

- Formula version table exists.
- Approved formula fixture exists in seed if required by tests/UAT.
- Draft/unapproved/retired/rejected formula versions are blocked by application logic.
- `calculation_runs` support formula version snapshot / explicit version reference.
- `calculation_outputs` retain warnings/final-use blockers and disclaimer.

### 4.5 Audit / Workflow / Error Tables

Check:

- `audit_logs` exists and is append-only through public APIs.
- `workflow_events` exists.
- `error_logs` exists.
- n8n service user has API permissions only, not database credentials.

### 4.6 Report Gate Columns

Confirm report gate support columns/metadata exist where implemented:

- issue gate status,
- gate checklist JSON,
- blocked reason,
- checked by/at,
- report issue audit linkage.

### 4.7 Work Order Gate Columns

Confirm internal work order fallback supports:

- source decision/report reference,
- asset/inspection reference,
- action source,
- gate checklist/status,
- closure evidence requirement,
- closure evidence link,
- completion note.

## 5. Rollback and Restore

Before migration or release rehearsal:

1. Take a database backup.
2. Record application commit SHA/tag.
3. Record migration list already applied.
4. Stop n8n triggers for the target environment if rollback risk exists.

Rollback procedure:

1. Stop AIM API service.
2. Disable n8n triggers for the affected environment.
3. Restore previous application version.
4. Restore DB backup if data/schema changed and migration is not reversible.
5. Restart AIM API.
6. Run health/login smoke tests.
7. Confirm audit/workflow/error routes are functional.
8. Record rollback action and reason.

Audit preservation:

- Preserve audit logs when possible.
- If restoring a DB backup, record the rollback reason outside the restored DB as release evidence.
- Never manually delete audit logs to hide a failed migration or release attempt.

## 6. Migration Acceptance Criteria

Migration/release rehearsal passes only when:

- Migrations apply from empty DB without error.
- Foundation seed completes without error.
- Required roles and permissions exist.
- Typecheck passes.
- Full API test suite passes.
- Phase 2.0 release-readiness static test passes.
- UAT smoke cases pass.
- Object storage placeholder/signed URL smoke test passes or is explicitly documented as environment-not-configured for local only.
- Workflow event creation works through AIM API.
- Error log creation works through AIM API.
- No n8n PostgreSQL credentials are present.
- No direct DB write path exists for n8n or AI final engineering data.

## 7. No Data-Destructive Change Confirmation

Phase 2.0 must not introduce schema migrations that delete, truncate, rewrite, or silently promote engineering data. If a future migration is required, it must be additive, reviewed, tested on a clean DB, and documented here before acceptance.


## RC3-A alignment note

RC2 is merged/tagged and RC3 hardening is in progress. Correct health endpoints are `GET /health` and `GET /health/db`. Correct authentication endpoints are `POST /api/v1/auth/login` and `GET /api/v1/auth/me`. RBAC demo endpoints and demo CORS headers are local/development/test only when `AUTH_ALLOW_LOCAL_DEMO=true`; they are unavailable in production-like environments. Evidence object-storage upload/download and report artifact object-storage storage are planned for later RC3 packages and are not implemented by RC3-A. Final production closure remains human-gated after hypercare completion; AI and n8n cannot approve production closure or final engineering actions.
