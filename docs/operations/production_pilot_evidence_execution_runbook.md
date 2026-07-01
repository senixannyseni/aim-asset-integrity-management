# Production Pilot Evidence Execution Runbook

**Package:** Production Pilot Evidence Execution Pack  
**Purpose:** Provide the controlled steps for executing and archiving production pilot evidence.

## 1. Pre-Execution Verification

Run and attach the verification outputs or approved CI evidence:

```bash
pnpm --filter @aim/api test -- production-pilot-evidence-execution.test.ts
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

## 2. Execution Steps

1. Confirm the pilot release tag, commit SHA, branch, environment, and evidence archive owner.
2. Confirm Phase 5 final closure and P5-1 through P5-6 evidence references.
3. Confirm pilot users, RBAC, denied-action proof, and service actor boundaries.
4. Execute the pilot scenario matrix from `docs/pilot/production_pilot_execution_plan.md`.
5. Capture engineering governance evidence for staging promotion, calculation review, integrity decision, report issue, and work-order closure.
6. Capture monitoring, alert, incident, rollback, and recovery evidence.
7. Record defects, residual risks, exceptions, and human approvals.
8. Complete KPI/adoption evidence and business validation.
9. Complete final pilot decision and handoff.
10. Archive evidence and update the release evidence register.

## 3. Evidence Handling Rule

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, database connection strings with passwords, private keys, webhook secrets, CMMS credentials, confidential client evidence, exploit details, or unredacted vulnerability evidence into pilot documents.

Use redacted fixtures and secure evidence storage. Do not commit production logs containing sensitive data.

## 4. Governance Boundaries

- AIM remains the system of record.
- n8n remains orchestration-only and must call AIM APIs only.
- AI output remains staging-only.
- AI/n8n/service actors cannot accept production pilot evidence.
- AI/n8n/service actors cannot approve pilot completion.
- AI/n8n/service actors cannot approve production-wide go-live.
- AI/n8n/service actors cannot close pilot defects or accept residual pilot risks.
- Human review remains mandatory for engineering data, calculations, reports, work orders, accepted risks, and final pilot decisions.

## 5. Completion Rule

`PILOT-001` through `PILOT-012` must be completed, reviewed, archived, and referenced from the release evidence register or explicitly marked not applicable with rationale and named human approval.

Production pilot evidence execution is not production-wide go-live approval. A separate human go/no-go decision is required before broader production rollout.
