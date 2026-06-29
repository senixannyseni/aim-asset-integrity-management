# Final Production Go-Live Authorization Runbook

**Runbook:** Final Production Go-Live Authorization Runbook  
**Purpose:** Execute and verify the final human-only production go-live authorization package.  
**Scope:** Documentation/evidence-control only; no runtime code changes.

## 1. Verification Commands

Run from the repository root before attaching final evidence:

```powershell
pnpm --filter @aim/api test -- final-production-golive-authorization.test.ts
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

Attach the command output or CI links as redacted evidence. Do not paste secrets, tokens, signed URLs, raw object keys, private keys, production credentials, webhook secrets, CMMS credentials, or confidential client evidence into this document.

## 2. Required Evidence Collection

1. Confirm final release baseline: tag, commit SHA, artifact identifier/checksum, PR, and clean working tree.
2. Confirm production pilot closure: pilot decision, UAT/business validation, operational readiness, defect/risk disposition.
3. Confirm Phase 5 closure baseline remains attached: P5-1 through P5-6 and Phase 5 final closure evidence.
4. Confirm security, deployment, observability, backup/restore/DR, performance/lifecycle, and integration signoffs.
5. Confirm final residual-risk business acceptance.
6. Confirm cutover/rollback authorization and hypercare activation.
7. Convene final go/no-go meeting and record named-human decision.
8. Archive final authorization package and evidence register location.

## 3. Human-Only Controls

AI/n8n/service actors cannot approve final production go-live.
AI/n8n/service actors cannot accept final residual risks.
AI/n8n/service actors cannot authorize cutover.
AI/n8n/service actors cannot approve hypercare activation.
AI/n8n/service actors cannot close go-live gaps.
AI/n8n/service actors cannot sign final production authorization.

n8n remains orchestration-only. AIM remains the system of record.

## 4. No-Go Triggers

Stop and record no-go if:

- any `GOLIVE-001` through `GOLIVE-012` evidence item is missing without named-human not-applicable approval;
- production pilot evidence is incomplete or blocker defects remain unresolved;
- security or deployment owner does not sign off;
- rollback path is not executable or lacks an owner;
- hypercare is not active;
- n8n has direct PostgreSQL write access;
- full API 579, full API 581, or copied API/API-ASME formulas are represented as implemented when they remain exclusions;
- a service actor attempts to approve or sign the final production go-live decision.

## 5. Archive and Handoff

The final go-live package must be archived with:

- final release tag;
- commit SHA;
- evidence index;
- final authorization record;
- residual-risk acceptance record;
- cutover/hypercare activation record;
- final decision date/time;
- archive owner;
- retention policy.
