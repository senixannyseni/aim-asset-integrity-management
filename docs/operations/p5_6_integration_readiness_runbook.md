# P5-6 Integration Readiness Runbook

**Runbook:** P5-6 Integration Readiness Runbook  
**Status:** Evidence execution guide; not runtime implementation

## 1. Preconditions

- Work from the approved release tag and commit SHA.
- Confirm P5-1 through P5-5 evidence packs are present or intentionally not applicable with named human rationale.
- Confirm test data is redacted and approved for integration testing.
- Confirm internal work-order fallback remains active unless external CMMS cutover is approved by named humans.
- Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, webhook secrets, CMMS credentials, database dumps, or confidential client evidence into committed documents.

## 2. Local Verification Commands

```powershell
pnpm --filter @aim/api test -- p5-6-integration-readiness.test.ts
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

## 3. Evidence Execution Checklist

| Step | Evidence ID | Action | Owner |
|---|---|---|---|
| 1 | P5-INT-001 | Record integration inventory, owners, direction, environment, credential owner, and evidence location | Product Owner / Lead Engineer |
| 2 | P5-INT-002 | Attach AIM API contract boundary review | Lead Engineer / Security Owner |
| 3 | P5-INT-003 | Attach n8n workflow boundary and no direct PostgreSQL access evidence | DevOps / Security Owner |
| 4 | P5-INT-004 | Attach object-storage handoff boundary evidence | DevOps / Security Owner |
| 5 | P5-INT-005 | Record external CMMS readiness decision and internal work-order fallback status | Product Owner / Lead Engineer |
| 6 | P5-INT-006 | Attach notification and webhook routing readiness evidence | Operations / DevOps |
| 7 | P5-INT-007 | Attach retry, replay, and idempotency policy evidence | Lead Engineer / Operations |
| 8 | P5-INT-008 | Attach integration error, audit, and correlation logging evidence | Lead Engineer / Security Owner |
| 9 | P5-INT-009 | Attach service-account and credential review evidence | Security Owner / DevOps |
| 10 | P5-INT-010 | Attach sandbox and test-data validation evidence | Lead Engineer / Product Owner |
| 11 | P5-INT-011 | Approve integration accepted-risk register | Product Owner / Security Owner |
| 12 | P5-INT-012 | Record final human integration readiness signoff | Product Owner / Lead Engineer / Security Owner |

## 4. Governance Boundary

AI/n8n/service actors cannot accept integration evidence. AI/n8n/service actors cannot approve integration readiness. AI/n8n/service actors cannot close integration gaps. AI/n8n/service actors cannot approve external CMMS cutover. AI/n8n/service actors cannot authorize production go-live.

n8n remains orchestration-only and must call AIM APIs only. n8n must not write directly to PostgreSQL, store final engineering data, accept evidence, approve reports, close work orders, or own final integration decisions.

AIM remains the system of record for final structured engineering data, evidence metadata, calculations, integrity decisions, report issue status, work-order fallback records, audit logs, and release evidence.

## 5. No-Go Handling

Record a no-go if integration ownership is missing, if API boundary evidence is missing, if n8n has direct PostgreSQL write access, if external CMMS cutover lacks human approval, if retry/replay/idempotency behavior is undocumented, if service accounts are overprivileged or ownerless, if notification/webhook routing leaks sensitive data, if unsafe evidence is committed, or if human integration readiness signoff is absent.
