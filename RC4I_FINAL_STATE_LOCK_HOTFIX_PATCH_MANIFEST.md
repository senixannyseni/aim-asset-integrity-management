# RC4-I Final State Lock Hotfix Patch Manifest

## Scope

Hardens RC4-I RBI workflow governance after finalization gate hardening.

## Fixes

1. Blocks `/api/v1/rbi/cases/{caseId}/review` from mutating approved, exported, or closed RBI cases.
2. Blocks `/api/v1/rbi/cases/{caseId}/status` from mutating approved, exported, or closed RBI cases.
3. Keeps `/review` as the only route that can record human review readiness.
4. Keeps `/status` limited to mutable pre-review workflow states only.
5. Updates tests, OpenAPI description/enum, release notes, UAT, and data dictionary notes.

## Changed Files

- `03_Database/data_dictionary_current.md`
- `04_API/openapi.yaml`
- `RC4I_FINAL_STATE_LOCK_HOTFIX_PATCH_MANIFEST.md`
- `RC4I_RBI_WORKFLOW_DETAIL_GUIDED_UI_PATCH_MANIFEST.md`
- `apps/api/src/routes/rbi.ts`
- `apps/api/tests/rbi-workflow.test.ts`
- `apps/api/tests/rc4-i-rbi-workflow-detail-guided-ui.test.ts`
- `docs/release/AIM_RC4I_rbi_workflow_detail_guided_ui_report.md`
- `docs/uat/uat_rc4i_rbi_workflow_detail_guided_ui.md`

## Local Test Commands

```bash
pnpm --filter @aim/api test -- rc4-i-rbi-workflow-detail-guided-ui.test.ts
pnpm --filter @aim/api test -- rbi-workflow.test.ts
pnpm -r lint
pnpm -r test
```
