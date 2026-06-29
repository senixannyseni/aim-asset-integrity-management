# P5-4 DR Rehearsal and RPO/RTO Record

**Record:** P5-4 DR Rehearsal and RPO/RTO Record  
**Package:** P5-4 Backup, Restore, and DR  
**Status:** Evidence template; implementation evidence must be attached by named humans

## 1. RPO/RTO Targets

| Target | Required value | Actual measured value | Status |
|---|---|---:|---|
| PostgreSQL RPO | Target data-loss window | TBD | Pending |
| PostgreSQL RTO | Target database restore duration | TBD | Pending |
| Object-storage RPO | Target object/artifact data-loss window | TBD | Pending |
| Object-storage RTO | Target evidence/report artifact recovery duration | TBD | Pending |
| Application recovery RTO | Target API/web/n8n recovery duration | TBD | Pending |
| Governance recovery RTO | Target time to validate audit/evidence/review/report/work-order chain | TBD | Pending |

RPO/RTO acceptance must be approved by named humans. AI/n8n/service actors cannot approve RPO/RTO exceptions.

## 2. DR Scenario Rehearsal

| Evidence ID | Scenario | Expected proof | Owner | Status |
|---|---|---|---|---|
| P5-DR-008 | API/web outage recovery | Health checks and smoke test pass after recovery | DevOps / Lead Engineer | Pending |
| P5-DR-008 | PostgreSQL restore | Restore completes and validation queries pass | DBA / Lead Engineer | Pending |
| P5-DR-008 | Object-storage recovery | Sample evidence/report artifacts restore with checksum match | IT Admin / Security Owner | Pending |
| P5-DR-008 | n8n workflow recovery | n8n routes through AIM APIs only after recovery | DevOps / Security Owner | Pending |
| P5-DR-008 | AI/staging job recovery | Staging state is recoverable and cannot auto-promote | Lead Engineer | Pending |
| P5-DR-008 | Governance incident recovery | Unauthorized approval/evidence-loss/report-issue scenario routes to named humans | Security Owner / Product Owner | Pending |

## 3. Governance Recovery Validation

| Evidence ID | Governance object | Validation requirement | Status |
|---|---|---|---|
| P5-DR-009 | Audit logs | Approval, rejection, correction, calculation, report, and work-order audit events are recoverable | Pending |
| P5-DR-009 | Evidence links | Finding, NDT, calculation, decision, report, and work-order evidence links remain intact | Pending |
| P5-DR-009 | Calculation snapshots | Input/output snapshots, formula version, warnings, and review state remain recoverable | Pending |
| P5-DR-009 | Review gates | Required report issue gates remain traceable and cannot be bypassed after restore | Pending |
| P5-DR-009 | Report versions | Issued report versions and generated artifacts remain recoverable | Pending |
| P5-DR-009 | Work orders | Internal work-order lifecycle state remains recoverable and auditable | Pending |

## 4. Gap and Corrective Action Log

| Gap | Severity | Owner | Corrective action | Target date | Status |
|---|---|---|---|---|---|
| TBD | TBD | TBD | TBD | TBD | Pending |

AI/n8n/service actors cannot close DR gaps, accept residual DR risk, approve restore readiness, or authorize production go-live.
