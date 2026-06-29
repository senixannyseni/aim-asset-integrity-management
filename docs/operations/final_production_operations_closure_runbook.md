# Final Production Operations Closure and Continuous Improvement Runbook

**Package:** Final Production Operations Closure and Continuous Improvement Backlog Pack

## 1. Verification Commands

Run from the repository root:

```powershell
pnpm --filter @aim/api test -- final-production-operations-closure-continuous-improvement.test.ts
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

## 2. Required Evidence Collection Steps

1. Attach final production go-live authorization, hypercare closure, and BAU transition records.
2. Complete `OPS-CLOSE-001` through `OPS-CLOSE-012` or mark not applicable with rationale and named human approval.
3. Confirm BAU support ownership, monitoring ownership, security ownership, DR ownership, and evidence archive ownership.
4. Reconcile open incidents, problems, defects, residual risks, and accepted carryover work.
5. Confirm KPI/SLA operating-state review and governance cadence.
6. Create or update the continuous-improvement backlog with owners, priority, risk/benefit, and target release/date.
7. Validate that governance controls remain active: evidence linkage, AI staging, calculation versioning/review, report issue gates, work-order authorization, audit-log redaction, object-storage privacy, and n8n orchestration-only boundary.
8. Obtain final human operations closure signoff or record no-go/extension decision.

## 3. Evidence Safety Rule

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, webhook secrets, CMMS credentials, database connection strings with passwords, private keys, confidential client evidence, raw production incident payloads, vulnerability exploit details, or unreleased commercial terms into operations closure records.

## 4. Escalation Rules

Escalate immediately when any of the following occur:

- blocker/critical production incident remains open without approved carryover;
- BAU support, monitoring, security, DR, or evidence archive ownership is missing;
- residual operational risk lacks owner, target date, mitigation, or approval;
- governance controls are bypassed or cannot be evidenced;
- n8n has direct PostgreSQL write access or direct database credentials;
- continuous-improvement backlog is not owned or prioritized;
- KPI/SLA exception is unapproved by named humans;
- evidence archive cannot be located or verified.

## 5. Human Authority Boundary

AI/n8n/service actors cannot accept operations closure evidence.
AI/n8n/service actors cannot approve continuous improvement priority.
AI/n8n/service actors cannot approve KPI/SLA exceptions.
AI/n8n/service actors cannot accept residual operational risks.
AI/n8n/service actors cannot close operations closure gaps.
AI/n8n/service actors cannot sign final operations closure.
AI/n8n/service actors cannot waive operations closure evidence.

n8n remains orchestration-only. AIM remains the system of record.
