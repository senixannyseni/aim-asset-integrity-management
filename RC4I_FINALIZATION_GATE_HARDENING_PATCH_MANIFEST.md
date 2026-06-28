# RC4-I Finalization Gate Hardening Patch Manifest

## Patch

`fix(rc4-i): harden RBI finalization gates and DB RBAC alignment`

## Purpose

This follow-up patch cleans RC4-I before RC4-J work starts. It closes finalization bypass paths and aligns DB-backed permissions with the static RBAC model.

## Changed Files

- `apps/api/src/routes/rbi.ts`
- `apps/api/tests/rc4-i-rbi-workflow-detail-guided-ui.test.ts`
- `apps/api/tests/rbi-workflow.test.ts`
- `apps/web/app/rbi/[caseId]/RbiCaseDetailClient.tsx`
- `db/migrations/0009_rbi_interface_trigger_workflow.sql`
- `db/seeds/0001_foundation_seed.sql`
- `04_API/openapi.yaml`
- `03_Database/data_dictionary_current.md`
- `docs/release/AIM_RC4I_rbi_workflow_detail_guided_ui_report.md`
- `docs/uat/uat_rc4i_rbi_workflow_detail_guided_ui.md`
- `RC4I_RBI_WORKFLOW_DETAIL_GUIDED_UI_PATCH_MANIFEST.md`
- `RC4I_FINALIZATION_GATE_HARDENING_PATCH_MANIFEST.md`

## Fixes

1. Adds `lead_engineer` to DB migration/seed RBI finalization permission grants.
2. Makes `/approve` approve-only and rejects attempts to set `status=exported` or `status=closed` through that endpoint.
3. Requires recorded human review and `ready_for_review` status before approval.
7. Follow-up review cleanup: generic status update cannot mark `ready_for_review` or write `reviewed_at`; approval readiness must be created through `/review`.
4. Requires prior approval before export.
5. Requires prior approval/export plus closure comment before close.
6. Ensures `approved_at` is set only by actual approval, not by export or close.
7. Uses separate UUID/text parameters for RBI case lookup to avoid PostgreSQL type conflicts.
8. Validates `asset_id` as UUID before asset-scoped RBI creation/query paths hit the database.
9. Updates frontend copy to show senior-engineer/lead-engineer/admin authority.
10. Adds regression/static assertions for the hardening controls.

## Governance Boundary

This patch does not implement quantitative API RP 581 formulas, final integrity decisions, report issue automation, FFS creation, or direct n8n/database writes. AI/service actors remain unable to approve, export, close, or finalize RBI cases.

## Validation Commands

```bash
pnpm --filter @aim/api test -- rc4-i-rbi-workflow-detail-guided-ui.test.ts
pnpm --filter @aim/api test -- rbi-workflow.test.ts
pnpm -r lint
pnpm -r test
```
