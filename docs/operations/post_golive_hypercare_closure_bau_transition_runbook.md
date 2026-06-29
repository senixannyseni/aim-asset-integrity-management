# Post-Go-Live Hypercare Closure and BAU Transition Runbook

**Package:** Post-Go-Live Hypercare Closure and BAU Transition Authorization Pack

## 1. Verification Commands

Run from the repository root:

```powershell
pnpm --filter @aim/api test -- post-golive-hypercare-closure-bau-transition.test.ts
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

## 2. Required Evidence Collection Steps

1. Confirm final production go-live and hypercare baseline.
2. Confirm `HYPERCARE-001` through `HYPERCARE-012` are closed, extended, or risk-accepted by named humans.
3. Summarize open production incidents, defects, problems, and carryover backlog items.
4. Confirm BAU support owner, SLA/severity model, support channel, and escalation route.
5. Transfer monitoring/alert ownership from hypercare cadence to BAU operations.
6. Confirm security/access watch, backup/restore/DR ownership, and performance/capacity watch.
7. Archive hypercare and BAU transition evidence with index, checksum/location, and retention owner.
8. Obtain final human BAU transition authorization or record no-go/extension.

## 3. Evidence Safety Rule

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, webhook secrets, CMMS credentials, database connection strings with passwords, private keys, confidential client evidence, raw incident payloads, or vulnerability exploit details into BAU transition records.

## 4. Escalation Rules

Escalate immediately if any of the following are true:

- blocker/critical incident remains open without business approval;
- recurring high-severity incident has no root-cause owner;
- BAU owner or escalation route is missing;
- monitoring/alert ownership is not transferred;
- support SLA or intake channel is missing;
- security/access handoff is incomplete;
- evidence archive location or retention owner is missing;
- n8n has direct PostgreSQL write access or direct database credentials;
- AIM is not treated as the system of record.

## 5. Human Authority Boundary

AI/n8n/service actors cannot accept BAU transition evidence.
AI/n8n/service actors cannot approve BAU transition.
AI/n8n/service actors cannot close BAU transition gaps.
AI/n8n/service actors cannot accept residual BAU risks.
AI/n8n/service actors cannot approve support handoff.
AI/n8n/service actors cannot sign BAU transition authorization.

n8n remains orchestration-only. AIM remains the system of record.
