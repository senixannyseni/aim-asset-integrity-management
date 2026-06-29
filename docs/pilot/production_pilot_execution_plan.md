# Production Pilot Execution Plan

**Package:** Production Pilot Evidence Execution Pack  
**Purpose:** Define the controlled execution plan for a limited AIM production pilot after Phase 5 final closure.

## 1. Pilot Scope

| Field | Required value | Evidence owner | Status |
|---|---|---|---|
| Pilot asset/site scope | To be completed | Pilot Owner | Pending |
| Release tag | To be completed | DevOps | Pending |
| Commit SHA | To be completed | DevOps | Pending |
| Environment | To be completed | DevOps | Pending |
| Pilot start/end window | To be completed | Product Owner | Pending |
| Evidence archive location | To be completed | Evidence Coordinator | Pending |

## 2. Scenario Execution Matrix

| Scenario ID | Workflow | Required evidence | Owner | Exit condition |
|---|---|---|---|---|
| PILOT-SCN-001 | Login/RBAC/protected route | User-role access and denied-action screenshots/logs | Security Owner | Only approved users access pilot data |
| PILOT-SCN-002 | Asset and inspection workspace | Asset/inspection record trace | Pilot Owner | Pilot asset scope is traceable |
| PILOT-SCN-003 | Evidence upload/download | Evidence code, checksum, object-storage metadata, signed URL redaction evidence | Engineer / DevOps | Evidence is governed and retrievable |
| PILOT-SCN-004 | AI extraction and staging | Extraction job, staged fields, validation status, confidence review | Engineering Reviewer | AI output remains staging-only |
| PILOT-SCN-005 | NDT measurement workflow | Measurement import/detail, evidence link, component/CML/TML trace | Engineer | Measurements remain evidence-linked |
| PILOT-SCN-006 | Calculation workflow | Approved formula version, input/output snapshot, warnings, review state | Lead Engineer | Calculation is deterministic and reviewed |
| PILOT-SCN-007 | Integrity decision workflow | Decision record, evidence links, reviewer approval | Engineering Reviewer | Decision has human review |
| PILOT-SCN-008 | Report issue gate | Gate results, approver comment, issued artifact reference | Product Owner / Lead Engineer | Report cannot issue unless gates pass |
| PILOT-SCN-009 | Internal work-order fallback | Work-order creation, owner, closure gate, audit trail | Operations | Work order is traceable and controlled |
| PILOT-SCN-010 | n8n orchestration call | Workflow trigger/callback evidence through AIM API only | DevOps | n8n remains orchestration-only |
| PILOT-SCN-011 | Monitoring/incident route | Alert/log/correlation evidence and triage route | Operations | Named humans receive and triage alerts |
| PILOT-SCN-012 | Rollback/recovery reference | Rollback owner, backup/restore reference, no-go route | DevOps | Recovery route is owned and executable |

## 3. Pilot Entry Checklist

- `PILOT-001` pilot baseline and scope completed.
- `PILOT-002` Phase 5 final closure references attached.
- P5-SEC, P5-ENV, P5-OBS, P5-DR, P5-PERF, and P5-INT evidence are available or explicitly risk-accepted.
- Pilot users and RBAC are approved.
- Evidence archive location is available.
- Monitoring, incident, rollback, and recovery owners are named.

## 4. Pilot Exit Checklist

- `PILOT-001` through `PILOT-012` are completed or explicitly marked not applicable with rationale.
- Blocker and critical defects are closed or trigger no-go.
- Residual pilot risks have named human approvals.
- Pilot KPI/adoption evidence is reviewed.
- Final pilot decision and handoff are signed by named humans.

AI/n8n/service actors cannot accept production pilot evidence, cannot approve pilot completion, cannot accept residual pilot risks, and cannot approve production-wide go-live.

AIM remains the system of record and n8n remains orchestration-only.
