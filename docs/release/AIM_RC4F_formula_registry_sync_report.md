# AIM RC4-F Formula Registry to formula_versions Synchronization Report

## Package

RC4-F — Formula Registry to formula_versions Synchronization

## Status

Implemented.

## Scope Delivered

RC4-F closes the governance gap between Formula Registry approval and executable `formula_versions` used by calculation execution.

Delivered controls:

- Approved/locked human-governed Formula Registry records synchronize to executable `formula_versions`.
- Draft, under-review, rejected, retired, deprecated, superseded, inactive, or otherwise unapproved Formula Registry records cannot synchronize into executable formula versions.
- Formula approval synchronizes to `formula_versions` in the same governed operation.
- Existing approved records can be synchronized through `POST /api/v1/formulas/records/{recordId}/sync-to-executable`.
- Synchronization is idempotent and prevents duplicate executable versions for the same registry/code/version.
- Sync success writes `FORMULA_SYNCED_TO_EXECUTABLE` audit logs.
- Sync failure writes `FORMULA_SYNC_FAILED` audit logs.
- Calculation execution checks `formula_versions` and requires an explicit approved synchronized formula version.
- Calculation execution writes `FORMULA_VERSION_EXECUTION_BLOCKED` when formula-version guardrails block execution.
- Formula Registry frontend shows sync status, executable formula_version_id, and last synced timestamp where available.

## Files Changed

### Backend/API

- `apps/api/src/modules/formula-registry/executable-sync.ts`
- `apps/api/src/routes/formulas.ts`
- `apps/api/src/routes/calculations.ts`
- `04_API/openapi.yaml`

### Frontend

- `apps/web/app/formulas/FormulaRegistryClient.tsx`
- `apps/web/app/formulas/[formulaId]/FormulaDetailClient.tsx`

### Tests

- `apps/api/tests/rc4-f-formula-registry-sync.test.ts`

### Documentation

- `README.md`
- `docs/sprint-status.md`
- `docs/operations/source_of_truth_alignment_checklist.md`
- `docs/release/AIM_RC4F_formula_registry_sync_report.md`
- `docs/uat/uat_rc4f_formula_registry_sync.md`

## API Behavior

New endpoint:

```text
POST /api/v1/formulas/records/{recordId}/sync-to-executable
```

Purpose:

- Synchronize an already approved/locked Formula Registry record to executable `formula_versions`.
- Reject unapproved/non-executable statuses.
- Write audit logs.

Updated endpoint behavior:

```text
POST /api/v1/formulas/records/{recordId}/approve
```

Formula approval now synchronizes the approved Formula Registry record into `formula_versions` before the operation is committed.

## Calculation Guardrail

Calculation execution continues to require:

- explicit `formula_id`;
- explicit `formula_version`;
- existing `formula_versions` row;
- approved/locked executable formula version;
- deterministic formula flag;
- approved/active source registry record where linked.

Missing, draft, under-review, rejected, retired, superseded, inactive, or otherwise unapproved formula versions are blocked.

## Governance Notes

RC4-F is governance synchronization only.

It does not introduce:

- new engineering formulas;
- API/ASME/API 579/API 581/FFS/RBI calculation content;
- FFS/RBI trigger logic;
- calculation math changes;
- database migrations;
- backend schema changes;
- AI/n8n/service actor approval authority;
- direct n8n database access.

Formula approval remains human-governed. AI, n8n, and service actors cannot approve or sync formulas to executable state.

## Acceptance Summary

| Criterion | Status |
|---|---:|
| Approved registry records sync to formula_versions | Complete |
| Draft/rejected/retired records cannot sync | Complete |
| Synchronization is idempotent | Complete |
| Sync writes audit logs | Complete |
| Calculation requires approved synchronized formula_versions | Complete |
| Formula snapshot persistence remains in calculation_runs | Complete |
| Formula Registry UI exposes sync status | Complete |
| No formulas introduced | Complete |
| Governance boundaries preserved | Complete |
