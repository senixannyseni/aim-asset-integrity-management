# Commercial Governance, Sales Enablement, and Scale Readiness Runbook

**Package:** Commercial Governance, Sales Enablement, and Scale Readiness Evidence Pack

## 1. Verification Commands

Run from the repository root:

```powershell
pnpm --filter @aim/api test -- commercial-governance-sales-enablement-scale-readiness.test.ts
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

## 2. Required Evidence Collection Steps

1. Attach the customer success/commercial operations baseline.
2. Open the commercial governance control record and record pricing, discount, proposal/SOW, legal/compliance, and residual-risk owners.
3. Open the sales enablement and demo safety record and attach approved sales/demo materials using safe demo/sandbox data only.
4. Open the scale readiness, partner, and channel record and document delivery capacity, partner/channel boundaries, support/SLA scale limits, and implementation playbook ownership.
5. Reconcile `COMM-GOV-001` through `COMM-GOV-012` against the final release evidence register.
6. Record any commercial, delivery, legal, security, support, partner, or scale gap in the commercial scale risk register.
7. Obtain final named-human commercial governance and scale-readiness signoff, defer, or no-go decision.

## 3. Evidence Safety Rule

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, webhook secrets, CMMS credentials, database connection strings with passwords, private keys, customer PII, real customer data, customer commercial terms, contract redlines, invoice/payment details, tenant billing details, payment processing data, discount approvals, partner contract terms, confidential sales pipeline data, or vulnerability exploit details into commercial governance records.

## 4. Escalation Rules

Escalate to the Product Owner, Commercial Owner, Security Owner, Legal/Compliance Owner, and Lead Engineer when any of the following occur:

- sales/demo materials use real customer data, customer PII, raw production evidence, unsupported claims, or unapproved screenshots;
- pricing/discount exceptions are requested without named human approval;
- proposal/SOW language commits unsupported functionality, compliance guarantees, integrations, SLA, full API 579, full API 581, 3D processing, or copied API/API-ASME formulas;
- partner/channel enablement creates access or customer-facing commitments outside the approved boundary;
- scale readiness depends on unowned delivery, support, legal, security, or operational gaps;
- AI/n8n/service actors attempt to accept commercial governance evidence, approve sales enablement materials, approve customer commitments, approve pricing/discount exceptions, approve partner/channel readiness, approve scale readiness, accept commercial scale risks, or sign commercial governance closure.

## 5. Human Authority Boundary

AI/n8n/service actors cannot accept commercial governance evidence.
AI/n8n/service actors cannot approve sales enablement materials.
AI/n8n/service actors cannot approve pricing or discount exceptions.
AI/n8n/service actors cannot approve customer commitments.
AI/n8n/service actors cannot approve partner/channel readiness.
AI/n8n/service actors cannot approve scale readiness.
AI/n8n/service actors cannot accept commercial scale risks.
AI/n8n/service actors cannot sign commercial governance closure.
AI/n8n/service actors cannot waive commercial governance evidence.

n8n remains orchestration-only. AIM remains the system of record.
