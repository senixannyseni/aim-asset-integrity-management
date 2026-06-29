# Post-Go-Live Hypercare and Production Stabilization Runbook

**Package:** Post-Go-Live Hypercare and Production Stabilization Evidence Pack

## 1. Verification Commands

Run from the repository root:

```powershell
pnpm --filter @aim/api test -- post-golive-hypercare-stabilization.test.ts
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

## 2. Required Evidence Collection Steps

1. Attach final production go-live authorization baseline.
2. Open the hypercare plan and record the hypercare window, cadence, and named owners.
3. Capture daily production monitoring and alert-routing evidence.
4. Record incidents, defects, support issues, and workarounds in the hypercare incident/problem/defect record.
5. Review governance workflow controls: evidence linkage, AI staging, calculation review, report issue gates, work-order gates, n8n orchestration-only boundary, and audit-log redaction.
6. Review security/access watch, performance/capacity watch, backup/restore watch, and rollback/watch conditions.
7. Prepare the stabilization and BAU handoff record.
8. Obtain final human hypercare closure signoff or extend hypercare with owners and target dates.

## 3. Evidence Safety Rule

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, webhook secrets, CMMS credentials, database connection strings with passwords, private keys, confidential client evidence, raw incident payloads, or vulnerability exploit details into hypercare records.

## 4. Escalation Rules

Escalate immediately when any of the following occur:

- a blocker/critical production incident is open;
- repeated high-severity incidents occur without root-cause owner;
- audit-log redaction fails;
- evidence/report object-storage access exposes raw object keys or durable signed URLs;
- AI output bypasses staging/review;
- n8n has direct PostgreSQL write access or direct database credentials;
- report/work-order/calculation approval gates are bypassed;
- rollback/watch conditions are met.

## 5. Human Authority Boundary

AI/n8n/service actors cannot accept hypercare evidence, close production incidents, close hypercare defects, approve BAU handoff, approve residual operational risk, waive missing evidence, or sign hypercare closure.

AI/n8n/service actors cannot sign hypercare closure.

n8n remains orchestration-only. AIM remains the system of record.
