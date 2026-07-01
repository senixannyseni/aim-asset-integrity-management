# P5-6 Integration Inventory and Boundary Record

**Record:** P5-6 Integration Inventory and Boundary Record  
**Evidence IDs:** P5-INT-001, P5-INT-002, P5-INT-003, P5-INT-004  
**Status:** Template/evidence-control record; actual evidence must be attached by named humans

## 1. Integration Inventory

| Integration | Direction | Environment | Owner | Credential owner | Evidence location | Status |
|---|---|---|---|---|---|---|
| n8n workflow orchestration | n8n trigger/routes to AIM API | TBD | DevOps / Operations | DevOps | TBD | Pending evidence |
| AIM object-storage handoff | AIM API to object storage | TBD | DevOps | Security Owner | TBD | Pending evidence |
| Report artifact export storage | AIM report export to object storage | TBD | Lead Engineer / DevOps | DevOps | TBD | Pending evidence |
| Notification / webhook routing | AIM/n8n to approved notification channel | TBD | Operations | DevOps | TBD | Pending evidence |
| External CMMS | AIM work-order export or future cutover | Not live until approved | Product Owner | External integration owner | TBD | Future readiness only |

## 2. AIM API Contract Boundary Review

AIM remains the system of record. External tools and n8n must call approved AIM APIs and must not write final engineering data directly to PostgreSQL, object-storage metadata, report issue records, work-order closure records, calculation approval records, or integrity decision records.

Required evidence:

- approved endpoint list;
- allowed method and payload list;
- permission boundary;
- audit-event mapping;
- denied-action evidence for prohibited actions;
- owner for contract drift review.

## 3. n8n Workflow Boundary Review

n8n remains orchestration-only and calls AIM APIs only. n8n must not own final engineering data, final calculations, integrity decisions, report issue approval, evidence acceptance, work-order closure, accepted-risk approval, or production go-live authorization.

Required evidence:

- workflow catalog reference;
- workflow trigger/source list;
- target AIM API endpoint list;
- credential owner and rotation owner;
- no direct PostgreSQL write access evidence;
- no direct PostgreSQL credentials evidence;
- manual recovery owner for failed workflow handoffs.

## 4. Object-Storage Handoff Boundary

Object-storage handoffs must preserve evidence linkage and auditability. Signed URLs and raw object keys must not be stored as durable UI state or pasted into committed evidence records.

Required evidence:

- bucket or storage class summary using redacted fixtures only;
- artifact path pattern;
- checksum policy;
- signed URL expiry policy;
- upload/download audit event mapping;
- report export artifact linkage rule.

## 5. Human Review

| Review item | Human owner | Result | Evidence link | Date |
|---|---|---|---|---|
| Integration inventory complete | Product Owner | TBD | TBD | TBD |
| AIM API boundary accepted | Lead Engineer | TBD | TBD | TBD |
| n8n orchestration-only boundary accepted | Security Owner / DevOps | TBD | TBD | TBD |
| Object-storage handoff boundary accepted | Security Owner | TBD | TBD | TBD |

AI/n8n/service actors cannot accept integration evidence. AI/n8n/service actors cannot approve integration readiness. n8n remains orchestration-only.
