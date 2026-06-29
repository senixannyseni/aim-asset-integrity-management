# Commercial Scale Operating Model and Partner Implementation Readiness Runbook

**Package:** Commercial Scale Operating Model and Partner Implementation Readiness Pack

## 1. Verification Commands

Run from the repository root:

```powershell
pnpm --filter @aim/api test -- commercial-scale-operating-model-partner-implementation.test.ts
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

## 2. Required Evidence Collection Steps

1. Attach the commercial governance, customer success, productization, commercial launch, BAU, and final operations closure baselines.
2. Complete the scale operating model and delivery governance record.
3. Complete the partner implementation readiness record.
4. Complete the multi-customer rollout and support capacity record.
5. Confirm support escalation, customer communication, and partner escalation routes.
6. Confirm scale risks, delivery capacity, and customer rollout gates.
7. Confirm evidence archive and data-safety rules for customer/partner implementation artifacts.
8. Obtain final human scale operating-model authorization or record no-go/carryover items.

## 3. Evidence Safety Rule

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, customer PII, real customer data, customer commercial terms, contract redlines, invoice/payment details, tenant billing details, payment processing data, partner contract terms, confidential sales pipeline data, partner credentials, production incident payloads, or vulnerability exploit details into scale operating model records.

## 4. Escalation Rules

Escalate immediately when any of the following occur:

- partner access scope is unclear or excessive;
- customer PII or real customer data appears in unsafe evidence records;
- customer commitments exceed approved proposal/SOW/support/SLA boundaries;
- delivery or support capacity cannot support rollout wave assumptions;
- AI/n8n/service actors are used to approve partner readiness, rollout readiness, support handoff, or scale closure;
- n8n has direct PostgreSQL write access or direct database credentials.

## 5. Human Authority Boundary

AI/n8n/service actors cannot accept scale operating model evidence.
AI/n8n/service actors cannot approve partner implementation readiness.
AI/n8n/service actors cannot approve multi-customer rollout readiness.
AI/n8n/service actors cannot approve support escalation handoff.
AI/n8n/service actors cannot accept scale operating risks.
AI/n8n/service actors cannot waive scale operating evidence.
AI/n8n/service actors cannot sign scale operating model closure.

n8n remains orchestration-only. AIM remains the system of record.
