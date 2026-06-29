# P5-3 Monitoring and Alerting Evidence Record

**Package:** P5-3 Observability and Incident Response  
**Evidence IDs:** `P5-OBS-001`, `P5-OBS-002`, `P5-OBS-003`, `P5-OBS-004`, `P5-OBS-005`, `P5-OBS-006`, `P5-OBS-009`

## 1. Monitoring Ownership

| Field | Value |
|---|---|
| Monitoring owner | `<name / role>` |
| Backup owner | `<name / role>` |
| Review cadence | `<daily/weekly/other>` |
| Evidence location | `<secure evidence reference>` |
| Escalation channel | `<channel / route>` |

## 2. Dashboard Baseline

| Monitored area | Required signal | Dashboard/reference | Owner | Status |
|---|---|---|---|---|
| API/backend health | health endpoint, latency, error rate |  | IT Admin / DevOps | Pending |
| Frontend reachability | approved frontend URL and user flow status |  | IT Admin / DevOps | Pending |
| PostgreSQL | connectivity, error rate, backup indicator |  | DBA / DevOps | Pending |
| Object storage | upload/download/signed URL health, checksum policy |  | IT Admin / Security Owner | Pending |
| n8n workflow orchestration | workflow success/failure and retry visibility |  | IT Admin | Pending |
| AI/staging workers | job failure and staging backlog visibility |  | Lead Engineer | Pending |
| Report export jobs | export failure and artifact creation visibility |  | Lead Engineer | Pending |
| Work-order follow-up | workflow/error visibility for internal work orders |  | Operations | Pending |

## 3. Alert Routing Verification

| Alert scenario | Trigger method | Expected route | Actual route | Result | Evidence reference |
|---|---|---|---|---|---|
| API unavailable | controlled test or simulated alert | named human owner |  | Pending |  |
| DB connectivity failure | controlled test or simulated alert | named human owner |  | Pending |  |
| Object-storage failure | controlled test or simulated alert | named human owner |  | Pending |  |
| n8n workflow failure | controlled test or simulated alert | named human owner |  | Pending |  |
| AI extraction job failure | controlled test or simulated alert | named human owner |  | Pending |  |
| Report gate failure | controlled test or simulated alert | named human owner |  | Pending |  |
| Security/governance event | controlled test or simulated alert | Security Owner |  | Pending |  |

## 4. Audit, Error, Workflow, and Correlation Log Review

| Log area | Required review | Result | Evidence reference |
|---|---|---|---|
| Audit logs | controlled actions generate immutable audit entries | Pending |  |
| Error logs | application errors route to operational review | Pending |  |
| Workflow events | n8n orchestration events are visible without direct DB writes | Pending |  |
| Correlation IDs | AIM, n8n, AI, and report-export events can be correlated where available | Pending |  |
| Redaction | secrets, signed URLs, raw object keys, and credentials are not logged in clear text | Pending |  |

## 5. n8n Boundary Monitoring

n8n remains orchestration-only. Monitoring evidence must show workflow success/failure and retry status while preserving that n8n calls AIM APIs only and has no direct PostgreSQL write access.

## 6. Human Acceptance

AI/n8n/service actors cannot accept observability evidence, accept alert-route evidence, waive missing log evidence, or approve monitoring readiness.

| Role | Name | Decision | Date | Comment |
|---|---|---|---|---|
| IT Admin / DevOps |  | Pending |  |  |
| Security Owner |  | Pending |  |  |
| Lead Engineer |  | Pending |  |  |
| Operations / Hypercare Owner |  | Pending |  |  |
