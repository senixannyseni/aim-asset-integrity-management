# RC4-M Evidence Traceability Matrix Patch Manifest

## Patch
RC4-M — Evidence Traceability Matrix and Cross-Module Coverage

## Changed Files
- `04_API/openapi.yaml`
- `README.md`
- `RC4M_EVIDENCE_TRACEABILITY_MATRIX_PATCH_MANIFEST.md`
- `apps/api/src/routes/evidence.ts`
- `apps/api/tests/rc4-m-evidence-traceability-matrix.test.ts`
- `apps/web/app/evidence/EvidenceRepositoryClient.tsx`
- `apps/web/app/evidence-traceability/EvidenceTraceabilityMatrixClient.tsx`
- `apps/web/app/evidence-traceability/page.tsx`
- `apps/web/app/page.tsx`
- `docs/release/AIM_RC4M_evidence_traceability_matrix_report.md`
- `docs/sprint-status.md`
- `docs/uat/uat_rc4m_evidence_traceability_matrix.md`

## Scope
Adds a read-only cross-module evidence traceability matrix and frontend page.

## Out of Scope
- Object storage upload/download changes
- Evidence deletion
- AI extraction changes
- n8n orchestration changes
- Approval/finalization changes
- Report issue or work-order closure logic changes

## Validation
Run:

```powershell
pnpm --filter @aim/api test -- rc4-m-evidence-traceability-matrix.test.ts
pnpm --filter @aim/api test -- rc4-l-work-order-detail-closure-readiness.test.ts
pnpm -r lint
pnpm -r test
```
