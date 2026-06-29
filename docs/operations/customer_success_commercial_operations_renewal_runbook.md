# Customer Success, Commercial Operations, and Renewal Readiness Runbook

**Package:** Customer Success, Commercial Operations, and Renewal Readiness Evidence Pack

## 1. Verification Commands

Run from the repository root:

```powershell
pnpm --filter @aim/api test -- customer-success-commercial-operations-renewal.test.ts
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

## 2. Required Evidence Collection Steps

1. Confirm the Commercial MVP Launch Control and Customer Onboarding Evidence Pack baseline.
2. Assign named Customer Success Owner, Commercial Owner, Support Owner, Product Owner, and Security Owner where applicable.
3. Complete customer health, adoption, value realization, and issue/escalation evidence.
4. Complete support operations, SLA/KPI operating review, commercial operations handoff, and evidence archive ownership.
5. Complete renewal readiness, expansion readiness, and customer lifecycle risk review.
6. Confirm that sensitive evidence is stored only in approved secure evidence storage.
7. Record final human decision: continue, renew, expand, stabilize, pause, or stop.
8. Link `CS-OPS-001` through `CS-OPS-012` into the final release evidence register.

## 3. Evidence Safety Rule

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, customer PII, real customer data, customer commercial terms, contract redlines, invoice/payment details, tenant billing details, payment processing data, private keys, confidential client evidence, raw support payloads, webhook secrets, CMMS credentials, database connection strings with passwords, or vulnerability exploit details into customer success or commercial operations records.

## 4. Escalation Rules

Escalate immediately when any of the following occur:

- customer health becomes red or repeatedly yellow without owner;
- SLA/KPI exceptions are recurring or customer-impacting;
- customer PII, real customer data, commercial terms, signed URLs, or credentials are exposed in evidence records;
- support or customer success ownership is missing;
- renewal readiness is asserted without customer success evidence;
- expansion readiness is used to authorize unapproved runtime, tenant billing, payment processing, contract execution, external CMMS integration, full API 579, full API 581, 3D processing, or copied API/API-ASME formulas;
- AI/n8n/service actors attempt to approve customer success readiness, renewal readiness, expansion readiness, customer lifecycle risk acceptance, commercial operations handoff, SLA exceptions, or customer lifecycle closure.

## 5. Human Authority Boundary

AI/n8n/service actors cannot accept customer success evidence.  
AI/n8n/service actors cannot approve customer success readiness.  
AI/n8n/service actors cannot approve renewal readiness.  
AI/n8n/service actors cannot approve expansion readiness.  
AI/n8n/service actors cannot approve commercial operations handoff.  
AI/n8n/service actors cannot approve SLA exceptions.  
AI/n8n/service actors cannot accept customer lifecycle risks.  
AI/n8n/service actors cannot sign customer lifecycle closure.

n8n remains orchestration-only. AIM remains the system of record.
