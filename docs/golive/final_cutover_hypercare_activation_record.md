# Final Cutover and Hypercare Activation Record

**Record:** Final Cutover and Hypercare Activation Record  
**Evidence focus:** `GOLIVE-006`, `GOLIVE-010`, `GOLIVE-012`  
**Status:** Template/evidence-control record

## 1. Cutover Authorization

| Control | Required evidence | Owner | Status |
|---|---|---|---|
| Cutover window | Approved production-wide go-live window | Release Manager | Pending |
| Release artifact | Final release tag, commit SHA, artifact checksum | DevOps | Pending |
| Deployment command path | Approved deployment instructions or pipeline reference | DevOps | Pending |
| Rollback command path | Approved rollback instructions, owner, and trigger criteria | DevOps / Operations | Pending |
| Communication plan | Stakeholder notification route and escalation contacts | Release Manager / Operations | Pending |
| Go/no-go bridge | Meeting link/channel, participants, decision cadence | Release Manager | Pending |

## 2. Hypercare Activation

| Hypercare control | Required evidence | Owner | Status |
|---|---|---|---|
| Hypercare owner | Named primary and backup owner | Operations / Hypercare Owner | Pending |
| Monitoring dashboard | Dashboard reference and active health indicators | Operations | Pending |
| Alert routing | Alert route, severity mapping, escalation proof | Operations / Security Owner | Pending |
| Incident triage | Severity policy, response targets, incident log location | Operations | Pending |
| Defect triage | Defect queue, owner, SLA, and escalation route | Product Owner / Lead Engineer | Pending |
| Business support | User support route and known-issue communication | Product Owner | Pending |

## 3. Activation Rules

- Hypercare must be active before production-wide go-live is authorized.
- Rollback owner and rollback trigger criteria must be confirmed before cutover begins.
- Incident response and communication routes must be tested or explicitly risk-accepted by named humans.
- AI/n8n/service actors cannot authorize cutover, close go-live incidents, approve hypercare activation, or sign final production authorization.
- n8n remains orchestration-only and must not write directly to PostgreSQL.
- AIM remains the system of record.

## 4. Cutover Decision Log

| Time | Event | Decision / action | Owner | Evidence reference |
|---|---|---|---|---|
| `<time>` | Start go/no-go bridge | Pending | Release Manager | `<reference>` |
| `<time>` | Pre-cutover checks complete | Pending | DevOps | `<reference>` |
| `<time>` | Cutover authorized | Pending | Authorized Go-Live Approver | `<reference>` |
| `<time>` | Smoke checks complete | Pending | Lead Engineer / DevOps | `<reference>` |
| `<time>` | Hypercare active | Pending | Operations | `<reference>` |
| `<time>` | Final confirmation | Pending | Product Owner | `<reference>` |


## 5. Exact Human-Only Cutover Markers

AI/n8n/service actors cannot approve hypercare activation.
AI/n8n/service actors cannot close go-live incidents.
AI/n8n/service actors cannot authorize cutover.
