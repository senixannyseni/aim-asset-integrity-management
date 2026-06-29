# P5-1 RBAC and Service Actor Review Record

**Package:** P5-1 Security and Secrets Hardening  
**Evidence IDs:** P5-SEC-004, P5-SEC-005, P5-SEC-012

## 1. Review Scope

This record verifies that human roles, AI actors, n8n workflows, service accounts, and integration actors remain inside the approved AIM authority model.

## 2. Authority Boundary Assertions

| Boundary | Required result | Evidence reference | Status |
|---|---|---|---|
| AI extraction actor | Cannot approve, promote, finalize, issue reports, close work orders, accept evidence, accept risk, or sign go-live | `<reference>` | Pending |
| n8n workflow actor | Cannot write directly to PostgreSQL and cannot approve/finalize/sign | `<reference>` | Pending |
| Service actor | Cannot bypass RBAC, segregation-of-duty, evidence, calculation, report, work-order, or release gates | `<reference>` | Pending |
| Engineer role | Can review/correct within scope but cannot bypass required gates | `<reference>` | Pending |
| Approver role | Can approve only with required gates, comments, evidence, and SoD controls | `<reference>` | Pending |
| Security Owner | Can review security evidence but cannot be replaced by automation | `<reference>` | Pending |
| Product Owner | Can make release decision only after evidence is attached or risk-accepted | `<reference>` | Pending |


## 2A. n8n Orchestration Boundary

n8n remains orchestration-only. It may trigger, route, remind, notify, or call approved AIM APIs, but it must not write directly to PostgreSQL, approve engineering data, promote staged records, finalize calculations, issue reports, close work orders, accept security evidence, accept residual risk, or authorize production go-live.

## 3. Permission Review Table

| Role/actor | Permission set reviewed | Highest-risk permission | Allowed? | Evidence/notes |
|---|---|---|---|---|
| `<role/actor>` | `<permission list/source>` | `<permission>` | `<yes/no>` | `<notes>` |

## 4. Denied-Action Evidence

Attach or reference test/API/UI evidence proving denied actions for AI/n8n/service actors:

- approve engineering data;
- promote staging records to final tables;
- approve formula versions;
- finalize calculations;
- issue reports;
- close work orders;
- accept security evidence;
- accept residual risk;
- authorize production go-live;
- sign final release handoff.

## 5. Direct Database Write Review

| Integration/workflow | Direct PostgreSQL write access? | Approved path | Evidence | Reviewer |
|---|---:|---|---|---|
| n8n | No | AIM API only | `<reference>` | `<reviewer>` |
| AI extraction | No final-table writes | staging API/controlled promotion only | `<reference>` | `<reviewer>` |
| External CMMS/SAP/Maximo | Not implemented in MVP | future controlled API boundary only | `<reference>` | `<reviewer>` |

## 6. Human Signoff

| Role | Name | Decision | Date | Comments |
|---|---|---|---|---|
| Security Owner |  | Pending |  |  |
| Lead Engineer |  | Pending |  |  |
| IT Admin / DevOps |  | Pending |  |  |
| Product Owner |  | Pending |  |  |

AI/n8n/service actors cannot approve the RBAC/service actor review, accept residual permission risk, or sign this record.
