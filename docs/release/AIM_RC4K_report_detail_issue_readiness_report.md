# AIM RC4-K Report Detail and Issue Readiness Report

**Package:** RC4-K — Report Detail and Issue Readiness  
**Baseline:** RC4-J `rc4-j-engineering-review-approval-r1` and follow-up entity-context hotfix merged into `main`.  
**Status:** Patch candidate.

## Scope

RC4-K closes the user-facing report issue workflow gap without changing report-generation mathematics, report issue gates, object-storage policy, or final approval authority.

Implemented scope:

1. Report detail route `/reports/[reportId]`.
2. Read-only issue readiness API: `GET /api/v1/reports/{reportId}/issue-readiness`.
3. Issue-gate preview showing the same gate family used by the authoritative issue endpoint.
4. Direct evidence-link shortcuts for report, calculation run, and approved integrity decision targets.
5. Report approval, issue, export, and signed-URL actions from the report detail page with permission-aware visibility.
6. Export artifact register for JSON/HTML/DOCX/PDF object-storage artifacts with checksum visibility.
7. Report sections, traceability JSON, and evidence register visibility on the detail page.

## Governance behavior

The readiness endpoint is read-only. It does not approve, issue, export, lock, or mutate reports. The existing `POST /api/v1/reports/{reportId}/issue` endpoint remains authoritative and still persists gate results, audit logs, and error logs.

The issue readiness preview returns:

- `ready_to_issue` including the runtime issue-comment gate;
- `ready_to_issue_after_comment` excluding only the issue-comment gate;
- all gate rows and blocking gate rows;
- evidence counts for report, calculation run, calculation input, and approved integrity decision;
- linked context IDs used by the frontend for direct evidence-link shortcuts.

## Boundary confirmations

RC4-K uses a governed boundary instead of:

- new API/API-ASME formulas;
- full API 579 or API 581 logic;
- report content formula expansion;
- automatic report approval or issue;
- AI/n8n/service actor report approval;
- external CMMS/SAP/Maximo integration;
- direct n8n/database write behavior;
- object-storage credential or bucket changes.

AIM remains the system of record. Backend RBAC and issue gates remain authoritative.

## Changed areas

- `apps/api/src/routes/reports.ts`
- `apps/web/app/reports/ReportsClient.tsx`
- `apps/web/app/reports/[reportId]/page.tsx`
- `apps/web/app/reports/[reportId]/ReportDetailClient.tsx`
- `apps/web/app/globals.css`
- `04_API/openapi.yaml`
- `apps/api/tests/rc4-k-report-detail-issue-readiness.test.ts`
- `docs/uat/uat_rc4k_report_detail_issue_readiness.md`
- `docs/sprint-status.md`
- `README.md`

## Validation commands

```powershell
pnpm --filter @aim/api test -- rc4-k-report-detail-issue-readiness.test.ts
pnpm --filter @aim/api test -- report-generation.test.ts
pnpm -r lint
pnpm -r test
```
