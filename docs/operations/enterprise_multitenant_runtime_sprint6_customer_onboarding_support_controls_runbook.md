# Enterprise Multi-Tenant Runtime Sprint 6 Customer Onboarding Support Controls Runbook

## Purpose

Use this runbook to verify the MT Sprint 6 tenant/customer onboarding runtime and support-control foundation.

## Apply and verify

```powershell
pnpm db:migrate
pnpm --filter @aim/api test -- enterprise-multitenant-runtime-sprint6-customer-onboarding-support-controls.test.ts
pnpm --filter @aim/api test -- enterprise-multitenant-runtime-sprint5-evidence-lifecycle-export-controls.test.ts migration-sequence.test.ts
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

## Required review points

- Confirm `0033_enterprise_multitenant_sprint6_customer_onboarding_support_controls.sql` is forward-only.
- Confirm migrations 0028, 0029, 0030, 0031, and 0032 are not rewritten.
- Confirm no `disable trigger user` logic is introduced.
- Confirm tenant onboarding readiness gates require human approval evidence.
- Confirm customer activation cannot be approved by AI/n8n/service actors.
- Confirm support escalation and BAU handoff cannot be closed by AI/n8n/service actors.

## Human signoff

Sprint 6 is not closed until named humans approve customer onboarding readiness, support SLA readiness, support handoff readiness, and residual risks.

AI/n8n/service actors cannot sign multi-tenant Sprint 6 closure or waive Sprint 6 evidence.

## Safety and non-disclosure guardrails

Do not paste secrets, tenant credentials, customer PII, real customer data, tenant data, tenant billing details, payment processing data, full API 579, full API 581, or copied API/API-ASME formulas into these records. Use fixtures and evidence IDs only.

AI/n8n/service actors cannot accept multi-tenant Sprint 6 evidence, approve tenant onboarding, approve customer activation, approve support SLA exceptions, approve support escalation closure, approve BAU handoff, waive customer onboarding evidence, or sign Sprint 6 closure.
