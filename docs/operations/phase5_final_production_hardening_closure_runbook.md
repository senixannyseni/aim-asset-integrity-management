# Phase 5 Final Production Hardening Closure Runbook

**Package:** Phase 5 Final Production Hardening Closure Pack  
**Status:** Closure execution guide; not production go-live approval

## 1. Purpose

Use this runbook to assemble and verify the Phase 5 evidence-control baseline after P5-1 through P5-6 are merged and tagged.

## 2. Required Commands

Run from repository root:

```powershell
pnpm --filter @aim/api test -- phase5-final-production-hardening-closure.test.ts
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

## 3. Required Evidence Collection

Collect and attach:

- P5-1 through P5-6 merged PR links and tags;
- final test/lint/repo-hygiene output;
- final release evidence register snapshot;
- Phase 5 final closure pack;
- Phase 5 final evidence closure index;
- Phase 5 final closure decision record;
- evidence archive location, checksum/index, owner, and retention policy;
- residual-risk roll-up and accepted-risk approvals;
- named human signoff.

## 4. Human Closure Workflow

1. Confirm P5-SEC-001 through P5-SEC-012.
2. Confirm P5-ENV-001 through P5-ENV-012.
3. Confirm P5-OBS-001 through P5-OBS-012.
4. Confirm P5-DR-001 through P5-DR-012.
5. Confirm P5-PERF-001 through P5-PERF-012.
6. Confirm P5-INT-001 through P5-INT-012.
7. Complete P5-FINAL-001 through P5-FINAL-012.
8. Complete the final closure decision record.
9. Archive the final evidence bundle.
10. Proceed to production-pilot go/no-go only if named humans approve.

## 5. Safety and Governance Boundary

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, webhook secrets, CMMS credentials, database connection strings with passwords, private keys, confidential client evidence, vulnerability exploit details, or real production incident payloads into this runbook or closure records.

AI/n8n/service actors cannot accept Phase 5 closure evidence. AI/n8n/service actors cannot approve production go-live. AI/n8n/service actors cannot close Phase 5 final closure gaps. AI/n8n/service actors cannot sign Phase 5 final closure. n8n remains orchestration-only. AIM remains the system of record.

## 6. Exit Rule

The exit outcome must be one of:

- proceed to production-pilot go/no-go meeting;
- proceed to production-pilot go/no-go meeting with accepted risks;
- no-go until listed closure gaps are resolved.
