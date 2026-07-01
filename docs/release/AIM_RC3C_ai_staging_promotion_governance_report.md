# AIM RC3-C AI Staging Promotion Governance Report

## Scope

RC3-C hardens AI extraction review and staging promotion governance. It uses a governed boundary instead of UI modules, n8n console, dashboards, NDT visualization, hypercare dashboard, external CMMS integration, or new API/API-ASME formulas.

## Implemented controls

- Human-only review and promotion guard for AI-extracted fields and staging records.
- Meaningful reason enforcement for corrections, rejections, low-confidence approvals, and promotion.
- Verified object-storage evidence requirement before review/promotion where evidence is required.
- Rejected and validation-rejected fields cannot be promoted.
- Low-confidence AI extraction fields require correction before promotion.
- Segregation-of-duty gate blocks the same reviewer from promoting their own reviewed staging record.
- Job-level promotion readiness and promotion endpoints.
- Transactional promotion gate evaluation and fail-closed blocking behavior.
- Audit events for field approve/correct/reject, override recording, promotion request, promotion block, promotion success, and promotion failure.
- n8n API-only orchestration addendum.

## Validation commands

```powershell
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @aim/api test -- rc3-c-ai-staging-promotion-governance.test.ts
pnpm --filter @aim/api test -- rc3-b-object-storage-governance.test.ts
pnpm --filter @aim/api test -- phase1-7-governance-closure.test.ts
pnpm --filter @aim/api test -- report-generation.test.ts
```

## Known limitation

The RC3-C promotion implementation records governed promotion state in staging records and review gates. It does not perform final engineering table mutation beyond controlled staging status updates. Downstream deterministic final-table mapping remains a later package and must not be performed by AI or n8n.

