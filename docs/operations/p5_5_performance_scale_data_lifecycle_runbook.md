# P5-5 Performance, Scale, and Data Lifecycle Runbook

**Runbook:** P5-5 Performance, Scale, and Data Lifecycle Runbook  
**Status:** Evidence execution guide; not runtime implementation

## 1. Preconditions

- Work from the approved release tag and commit SHA.
- Confirm P5-1 through P5-4 evidence packs are present or intentionally not applicable with named human rationale.
- Confirm test data is redacted and approved for performance/lifecycle testing.
- Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, database dumps, or confidential client evidence into committed documents.

## 2. Local Verification Commands

```powershell
pnpm --filter @aim/api test -- p5-5-performance-scale-data-lifecycle.test.ts
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

## 3. Evidence Execution Checklist

| Step | Evidence ID | Action | Owner |
|---|---|---|---|
| 1 | P5-PERF-001 | Record performance baseline owner, environment, test window, and evidence location | Lead Engineer |
| 2 | P5-PERF-002 | Attach API load smoke result | Lead Engineer / DevOps |
| 3 | P5-PERF-003 | Attach report export throughput result | Lead Engineer |
| 4 | P5-PERF-004 | Attach object-storage upload/download throughput result without signed URLs | DevOps / Security Owner |
| 5 | P5-PERF-005 | Attach database query and pagination review | Lead Engineer / DBA |
| 6 | P5-PERF-006 | Attach frontend route responsiveness smoke evidence | Product Owner / Lead Engineer |
| 7 | P5-PERF-007 | Record capacity assumptions | Product Owner / Lead Engineer |
| 8 | P5-PERF-008 | Record timeout, retry, and error policy | Lead Engineer / Operations |
| 9 | P5-PERF-009 | Approve data retention matrix | Product Owner / Security Owner |
| 10 | P5-PERF-010 | Approve archive/export/purge lifecycle procedure | Product Owner / Operations |
| 11 | P5-PERF-011 | Approve accepted-risk register for performance/lifecycle gaps | Product Owner / Lead Engineer |
| 12 | P5-PERF-012 | Record final human performance and lifecycle signoff | Product Owner / Lead Engineer / Security Owner |

## 4. Governance Boundary

AI/n8n/service actors cannot accept performance evidence. AI/n8n/service actors cannot approve performance readiness. AI/n8n/service actors cannot approve data-retention exceptions. AI/n8n/service actors cannot close lifecycle gaps. AI/n8n/service actors cannot authorize production go-live.

n8n remains orchestration-only and must call AIM APIs only. n8n must not write directly to PostgreSQL or own final lifecycle decisions.

## 5. No-Go Handling

Record a no-go if performance baseline evidence is missing, if capacity assumptions are undocumented, if large evidence/report export behavior is unknown, if query/pagination risks are unresolved, if retention/lifecycle rules are missing, if unsafe evidence is committed, or if human signoff is absent.
