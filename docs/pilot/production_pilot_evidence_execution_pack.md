# Production Pilot Evidence Execution Pack

**Package:** Production Pilot Evidence Execution Pack  
**Baseline:** After Phase 5 Final Production Hardening Closure Pack  
**Status:** Evidence execution package; pilot evidence must be completed by named humans before any wider production go-live decision

## 1. Purpose

This pack converts the Phase 5 closure baseline into a controlled production-pilot evidence execution package. It defines what must be executed, recorded, reviewed, and signed before the AIM MVP release candidate can be considered ready for a limited production pilot decision.

Production pilot evidence execution is not production-wide go-live approval. It does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, approval behavior, report issue behavior, work-order behavior, external CMMS integration, full API 579, full API 581, 3D processing, or copied API/API-ASME formulas.

## 2. Required Production Pilot Evidence

| Evidence ID | Evidence area | Required artifact | Owner | Exit condition |
|---|---|---|---|---|
| PILOT-001 | Pilot baseline and scope | Pilot asset/site scope, release tag, commit SHA, environment, owner, and decision window | Product Owner / Pilot Owner | Pilot scope is explicit and traceable to approved release baseline |
| PILOT-002 | Pilot entry gate | Phase 5 final closure, P5-1 through P5-6 evidence references, and no-go override status | Product Owner / Security Owner | Entry gate is accepted by named humans only |
| PILOT-003 | Pilot users and RBAC | Named pilot users, roles, permissions, and denied-action evidence | Security Owner / Lead Engineer | Pilot users have least-privilege access and service actors cannot approve governed actions |
| PILOT-004 | Pilot data and evidence set | Approved pilot dataset, evidence codes, object-storage paths, redaction status, and consent/authorization note | Pilot Owner / Engineer | Pilot uses authorized data and no unsafe sensitive evidence is committed |
| PILOT-005 | Pilot execution scenarios | Executed critical workflows for asset, evidence, extraction/staging, NDT, calculation, review, report, and work-order gates | Pilot Owner / Lead Engineer | Critical workflow evidence is captured and traceable |
| PILOT-006 | Engineering governance validation | Human review proof for staging promotion, calculations, integrity decisions, report issue, and work-order closure | Lead Engineer / Engineering Reviewer | AI/n8n/service actors cannot approve, promote, issue, close, or sign governed records |
| PILOT-007 | Operational smoke and monitoring | Health, auth, protected routes, object storage, PostgreSQL, n8n workflow calls, alerts, and logs | DevOps / Operations | Production-pilot monitoring and alert routes are active |
| PILOT-008 | Incident, rollback, and recovery readiness | Incident route, rollback owner, backup/restore reference, and recovery rehearsal linkage | Operations / DevOps | Named humans can execute incident, rollback, and recovery actions |
| PILOT-009 | Defect and issue triage | Pilot defect log, severity, owner, target date, disposition, and evidence reference | Pilot Owner / Product Owner | Blocker/critical defects are closed or trigger a no-go decision |
| PILOT-010 | Pilot KPI and adoption evidence | Pilot KPI scorecard, user feedback summary, support load, workflow completion, and acceptance criteria | Product Owner / Pilot Owner | Pilot success criteria are measured and reviewed |
| PILOT-011 | Residual-risk and exception review | Accepted risk register, exceptions, open gaps, mitigation, target dates, and approvers | Product Owner / Security Owner | Residual pilot risks are accepted only by named humans |
| PILOT-012 | Final pilot decision and handoff | Pilot completion decision, wider go-live recommendation, evidence archive location, and human signoff | Decision Owner / Product Owner | Pilot completion is signed by named humans only |

## 3. Evidence Safety Rule

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, database connection strings with passwords, private keys, webhook secrets, CMMS credentials, confidential client evidence, exploit details, or unredacted vulnerability evidence into pilot documents. Use redacted fixtures and attach sensitive evidence only in approved secure evidence storage.

## 4. Required Human Review

Production pilot evidence must be reviewed by named humans. Automated tools, AI, n8n, service actors, monitoring tools, and CI/CD systems may generate logs or evidence, but they cannot accept pilot evidence, waive missing pilot evidence, approve pilot completion, accept residual risks, or approve production-wide go-live.


Explicit governance markers:

- AI/n8n/service actors cannot accept production pilot evidence.
- AI/n8n/service actors cannot approve pilot completion.
- AI/n8n/service actors cannot approve production-wide go-live.
- AI/n8n/service actors cannot close pilot defects or accept residual pilot risks.

Required human roles:

- Product Owner;
- Pilot Owner;
- Lead Engineer;
- Engineering Reviewer;
- Security Owner;
- IT Admin / DevOps;
- Operations / Hypercare Owner;
- Business/User Representative.

## 5. No-Go Conditions

A pilot no-go must be recorded if any of the following remain true:

- pilot baseline, release tag, commit SHA, environment, or scope is missing;
- P5-1 through P5-6 closure evidence is missing or unresolved;
- pilot users or RBAC permissions are not approved by named humans;
- AI/n8n/service actors can accept production pilot evidence, approve pilot completion, approve production-wide go-live, approve engineering records, promote staging, issue reports, or close work orders;
- n8n has direct PostgreSQL write access or direct database credentials;
- AIM is not the system of record for pilot engineering data;
- pilot data includes unauthorized confidential client evidence or unsafe committed sensitive evidence;
- critical workflow evidence for asset, evidence, staging, NDT, calculation, review, report, or work-order gates is missing;
- monitoring, alert routing, incident route, rollback owner, or recovery linkage is missing;
- blocker/critical defects remain open without a human no-go/accepted-risk decision;
- residual pilot risks are not accepted by named human owners.

## 6. Completion Rule

The Production Pilot Evidence Execution Pack is complete only when `PILOT-001` through `PILOT-012` are attached, reviewed, and referenced from the release evidence register or explicitly marked not applicable with rationale and named human approval.

Production pilot evidence execution is not production-wide go-live approval. A separate human go/no-go decision is required before broader production rollout.
