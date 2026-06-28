# RC4-I Review Status Gate Hotfix Patch Manifest

## Purpose

Close the remaining RC4-I governance leak identified during review: the generic RBI status update endpoint could mark a case `ready_for_review` and populate `reviewed_at`, allowing approval readiness without using the dedicated human review endpoint.

## Changed files

- `apps/api/src/routes/rbi.ts`
- `apps/api/tests/rbi-workflow.test.ts`
- `apps/api/tests/rc4-i-rbi-workflow-detail-guided-ui.test.ts`
- `03_Database/data_dictionary_current.md`
- `docs/release/AIM_RC4I_rbi_workflow_detail_guided_ui_report.md`
- `docs/uat/uat_rc4i_rbi_workflow_detail_guided_ui.md`
- `RC4I_RBI_WORKFLOW_DETAIL_GUIDED_UI_PATCH_MANIFEST.md`
- `RC4I_FINALIZATION_GATE_HARDENING_PATCH_MANIFEST.md`

## Governance controls

- `/rbi/cases/{caseId}/status` cannot set `ready_for_review`.
- `/rbi/cases/{caseId}/status` no longer writes `reviewer` or `reviewed_at`.
- `/rbi/cases/{caseId}/review` remains the only route that records human review readiness for approval.
- Approval still requires recorded human review and `ready_for_review` status.

## Validation

Run locally:

```bash
pnpm --filter @aim/api test -- rc4-i-rbi-workflow-detail-guided-ui.test.ts
pnpm --filter @aim/api test -- rbi-workflow.test.ts
pnpm -r lint
pnpm -r test
```
