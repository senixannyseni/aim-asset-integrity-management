# Phase 2.1 UAT Seed Execution Guide

## 1. Purpose

This guide explains how to apply `db/seeds/0002_uat_sample_data.sql` in a controlled local or UAT environment. The seed turns the Phase 2.0 sample dataset manifest into executable test support without adding product functionality.

## 2. Use Restrictions

Use this seed only when all of the following are true:

- the environment is local development or an isolated UAT database;
- the database has already applied the normal AIM migrations;
- the foundation seed has already run;
- the operator understands that the seed is **UAT/sample only**;
- no real client data, real evidence files, production credentials, or production object storage paths are present.

Do not use this seed in production, pre-production with client data, shared customer databases, or any database where synthetic sample records could be confused with formal engineering records.

## 3. Governance Boundary

The seed is designed to preserve AIM governance:

- AIM remains the system of record.
- AI extraction output is represented only in `extraction_jobs`, `extraction_fields`, and `staging_records`.
- Human review and manual override records are explicit.
- Evidence files are metadata placeholders only; no real evidence binary is included.
- Calculation records use an approved UAT fixture and retain `Engineering review required before final use.`
- Report issue remains gate-controlled.
- Internal work order fallback is represented inside AIM only.
- External CMMS / SAP / Maximo references remain null or explicitly out-of-scope.
- No full API 579, full API 581, 3D processing, frontend UI, or invented API/ASME formula implementation is introduced.

## 4. Prerequisites

From the repository root:

```powershell
pnpm --filter @aim/api typecheck
pnpm db:migrate
pnpm db:seed
```

Confirm PostgreSQL is reachable:

```powershell
Test-NetConnection 127.0.0.1 -Port 5433
```

## 5. Apply the UAT Seed

Apply only in a local/UAT database. Example with `psql`:

Use the existing environment variable instead of writing a database URL into documentation:

```powershell
psql $env:DATABASE_URL -f .\db\seeds\0002_uat_sample_data.sql
```

If your project has a local wrapper for running one seed file, use that wrapper only after confirming it targets a local/UAT database.

## 6. Expected Records Created

The seed creates or updates synthetic records for:

- UAT users and service users;
- one atmospheric tank asset `AIM-UAT-T-001`;
- one inspection `AIM-UAT-INS-001`;
- evidence metadata placeholders `EVD-2026-900001` to `EVD-2026-900003`;
- evidence links for extraction, calculation input, decision support, report attachment, and work order support;
- one extraction job `EXJ-UAT-000001`;
- extraction fields covering high confidence, low confidence, missing evidence, unit mismatch, and corrected/manual override scenarios;
- one staging record;
- one `manual_overrides` record;
- data quality checks;
- an approved UAT formula registry/version fixture;
- calculation validation cases;
- reviewed calculation inputs and outputs;
- one approved integrity decision;
- one approved but not issued report;
- one internal work order fallback;
- workflow, error, and audit log samples.

## 7. Validation SQL Queries

```sql
select asset_tag, status from assets where asset_tag = 'AIM-UAT-T-001';
select inspection_code, status from inspection_events where inspection_code = 'AIM-UAT-INS-001';
select evidence_code, malware_scan_status from evidence_files where evidence_code like 'EVD-2026-900%';
select extraction_job_code, status, staging_only_flag from extraction_jobs where extraction_job_code = 'EXJ-UAT-000001';
select field_name, field_status, validation_flags from extraction_fields where extraction_job_id = '25000000-0000-4000-8000-000000000001';
select corrected_value, correction_reason from manual_overrides where id = '27000000-0000-4000-8000-000000000001';
select formula_code, version, formula_status from formula_versions where formula_code = 'AIM-UAT-CORROSION-GOVERNANCE-FIXTURE';
select run_id, final_use_disclaimer, final_use_status from calculation_runs where run_id = 'CALC-UAT-000001';
select decision_code, decision_status from integrity_decisions where decision_code = 'DEC-UAT-000001';
select report_code, report_status, issue_gate_status from reports where report_code = 'RPT-UAT-000001';
select work_order_code, status, external_cmms_reference from internal_work_orders where work_order_code = 'WO-UAT-000001';
select workflow_event_code, event_status from workflow_events where workflow_event_code = 'WF-UAT-000001';
select error_code, status from error_logs where error_code = 'UAT_MISSING_EVIDENCE_REFERENCE';
select event_type from audit_logs where request_id like 'req-uat%';
```

## 8. Rollback / Cleanup Notes

Because this seed uses stable synthetic IDs and natural keys, rerunning it should be idempotent where practical. To clean up a local/UAT database, prefer resetting the database through the normal local reset procedure:

```powershell
pnpm --filter @aim/api db:reset
pnpm db:migrate
pnpm db:seed
```

For manual cleanup, delete records in reverse dependency order and only in local/UAT databases. Do not run cleanup against production.

## 9. Evidence Placeholder Warning

Evidence rows created by this seed are metadata placeholders. They use `uat-placeholder://...` URIs and do not point to real object storage files. UAT evidence preview/download tests should verify metadata, RBAC, signed URL behavior, and audit behavior using the configured local object storage stub or test harness.

## 10. Acceptance Criteria

The seed is ready for UAT when:

- all validation SQL queries return expected synthetic records;
- no real data or secret appears in the seed;
- report issue remains gate-controlled;
- AI/n8n/service users remain blocked from approval/issue/final actions;
- external CMMS fields remain null for the internal work order fallback.
