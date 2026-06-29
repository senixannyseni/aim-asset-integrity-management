# Commercial MVP Launch Control and Customer Onboarding Runbook

**Package:** Commercial MVP Launch Control and Customer Onboarding Evidence Pack

## 1. Verification Commands

Run from the repository root:

```powershell
pnpm --filter @aim/api test -- commercial-mvp-launch-control-customer-onboarding.test.ts
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

## 2. Required Evidence Collection Steps

1. Attach final productization/commercial readiness baseline.
2. Record commercial launch scope, exclusions, launch owner, no-go owner, and final decision authority.
3. Complete first-customer qualification and onboarding readiness record.
4. Validate tenant/customer setup assumptions and demo/sandbox/live environment boundaries.
5. Confirm demo/sandbox data uses synthetic or approved redacted evidence only.
6. Record customer UAT/acceptance criteria, defect triage, support/SLA commitments, and escalation path.
7. Confirm security, legal, data retention/export/deletion, and confidentiality assumptions.
8. Record residual commercial launch risks and final human launch authorization or no-go.

## 3. Evidence Safety Rule

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, webhook secrets, CMMS credentials, database connection strings with passwords, private keys, confidential client evidence, customer commercial terms, pricing approvals, legal opinions, raw vulnerability exploit details, real customer data, customer PII, contract redlines, or invoice/payment details into commercial launch records.

## 4. Escalation Rules

Escalate immediately when any of the following occur:

- commercial scope implies runtime behavior not covered by change control;
- tenant/customer isolation, billing, payment processing, external CMMS integration, full API 579, full API 581, 3D processing, or copied API/API-ASME formulas are promised as implemented without approved delivery evidence;
- real customer evidence, PII, secrets, signed URLs, raw object keys, or production credentials appear in launch documents;
- support/SLA commitments exceed the proven production operations baseline;
- customer onboarding, UAT, support, legal/security review, rollback/offboarding, or residual-risk evidence is missing.

## 5. Human Authority Boundary

AI/n8n/service actors cannot accept commercial launch evidence.  
AI/n8n/service actors cannot approve commercial launch.  
AI/n8n/service actors cannot approve customer onboarding.  
AI/n8n/service actors cannot approve customer acceptance.  
AI/n8n/service actors cannot approve SLA commitments.  
AI/n8n/service actors cannot accept commercial launch risks.  
AI/n8n/service actors cannot sign commercial launch authorization.

n8n remains orchestration-only. AIM remains the system of record.
