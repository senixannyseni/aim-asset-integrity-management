# P5-3 Incident Response and Escalation Record

**Package:** P5-3 Observability and Incident Response  
**Evidence IDs:** `P5-OBS-004`, `P5-OBS-007`, `P5-OBS-008`, `P5-OBS-009`, `P5-OBS-011`, `P5-OBS-012`

## 1. Incident Severity and Triage Matrix

| Severity | Example condition | First responder | Escalation owner | Target response | Evidence required |
|---|---|---|---|---|---|
| Blocker | production unavailable, report issue gate broken, evidence loss risk | Operations / IT Admin | Product Owner / Lead Engineer | Immediate | incident record, timeline, mitigation, retest |
| Critical | security/governance boundary breach, n8n direct DB write, unauthorized approval path | Security Owner | Product Owner / Lead Engineer | Immediate | security record, denied-action proof, corrective action |
| High | repeated job failure, monitoring blind spot, rollback uncertainty | Operations / DevOps | Operations Owner | Same day | alert evidence, owner, target closure |
| Medium | degraded workflow or non-blocking operational defect | Operations | Operations Owner | Next review cycle | triage notes and backlog item |
| Low | documentation or evidence reference cleanup | Assigned owner | Operations Owner | Planned | update reference |

## 2. Escalation Matrix

| Incident area | Primary owner | Backup owner | Escalation path | Communication channel |
|---|---|---|---|---|
| Backend/API | Lead Engineer | DevOps | Product Owner | `<channel>` |
| Frontend | Lead Engineer | DevOps | Product Owner | `<channel>` |
| PostgreSQL | DBA / DevOps | IT Admin | Product Owner | `<channel>` |
| Object storage/evidence | IT Admin | Security Owner | Product Owner | `<channel>` |
| n8n orchestration | IT Admin | Operations | Product Owner | `<channel>` |
| AI extraction/staging | Lead Engineer | Security Owner | Product Owner | `<channel>` |
| Security/RBAC/service actor | Security Owner | Lead Engineer | Product Owner | `<channel>` |
| Report issue/work-order gate | Lead Engineer | Operations | Product Owner | `<channel>` |

## 3. Incident Response Tabletop

| Scenario | Required test | Result | Gaps | Evidence reference |
|---|---|---|---|---|
| API outage | route alert, assign owner, record timeline | Pending |  |  |
| PostgreSQL connectivity issue | route alert, confirm no data corruption, check rollback path | Pending |  |  |
| Object-storage evidence failure | block metadata finalization, route to owner | Pending |  |  |
| n8n workflow failure | confirm AIM record is not corrupted and retry is visible | Pending |  |  |
| AI extraction failure | confirm manual data entry remains available | Pending |  |  |
| Unauthorized approval attempt | confirm denial, audit event, and escalation | Pending |  |  |
| Report issue gate failure | confirm report cannot issue and incident is triaged | Pending |  |  |

The incident response tabletop must include at least one governance scenario and one availability scenario before P5-3 can be closed.

## 4. Incident Closure Criteria

An incident may close only when all required items are complete:

- severity assigned;
- named owner assigned;
- impact and timeline recorded;
- mitigation or corrective action recorded;
- retest or verification evidence attached;
- residual risk accepted by a named human if still open;
- closure approved by named human owner.

AI/n8n/service actors cannot close incidents, accept missing incident evidence, accept residual operational risk, or sign incident closure.

## 5. Human Incident Response Signoff

| Role | Name | Decision | Date | Comment |
|---|---|---|---|---|
| Operations / Hypercare Owner |  | Pending |  |  |
| IT Admin / DevOps |  | Pending |  |  |
| Security Owner |  | Pending |  |  |
| Lead Engineer |  | Pending |  |  |
| Product Owner |  | Pending |  |  |
