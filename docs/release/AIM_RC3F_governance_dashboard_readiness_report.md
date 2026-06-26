# AIM RC3-F Governance Dashboard Readiness Report

## Summary

RC3-F adds a read-only governance dashboard readiness overview for AIM Tank Integrity. The dashboard consolidates safe counts and status summaries from existing AIM PostgreSQL state and exposes them through an RBAC-controlled API and frontend page.

## Implemented scope

- `GET /api/v1/governance-dashboard/overview`
- `dashboard.view` RBAC enforcement
- Service / AI / n8n-style dashboard visibility block
- Frontend `/dashboard` page
- Evidence readiness summary
- AI extraction review queue summary
- Staging promotion readiness summary
- Calculation/review readiness summary
- Report issue gate readiness summary
- Work-order follow-up summary
- Governance/audit warning summary
- Safe traceability links to existing pages
- OpenAPI documentation
- UAT script
- n8n API-only dashboard boundary addendum

## Governance boundaries

RC3-F is read-only. It does not create, update, approve, reject, correct, promote, issue, delete, administer, or run calculations. It does not expose raw evidence, report artifacts, signed URLs, object-storage credentials, tokens, passwords, private keys, or environment variables.

## Out of scope

No n8n console, NDT visualization, hypercare dashboard, new AI extraction feature, new staging promotion feature, new object-storage feature, new report builder feature, new calculation logic, external CMMS integration, direct database editing, or audit mutation tooling is implemented.

## Validation

Expected validation set:

```powershell
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @aim/api test -- rc3-f-governance-dashboard-readiness.test.ts
pnpm --filter @aim/api test -- rc3-e-admin-governance-console.test.ts
pnpm --filter @aim/api test -- rc3-d-audit-log-governance-visibility.test.ts
pnpm --filter @aim/api test -- rc3-c-ai-staging-promotion-governance.test.ts
pnpm --filter @aim/api test -- rc3-b-object-storage-governance.test.ts
pnpm --filter @aim/api test -- phase1-7-governance-closure.test.ts
pnpm --filter @aim/api test -- phase1-4-openapi-contract.test.ts
pnpm --filter @aim/api test -- report-generation.test.ts
```
