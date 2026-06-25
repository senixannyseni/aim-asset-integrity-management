# Phase 2.3 Hypercare and Post-UAT Monitoring Checklist

**Status:** Template / pending activation  
**Scope:** Post-UAT and release-candidate monitoring only. This does not implement new product functionality.

## 1. Hypercare Duration

Recommended initial hypercare duration: 5 business days after UAT Cycle 1 sign-off or release-candidate approval.

| Field | Value |
|---|---|
| Hypercare start | `<date>` |
| Hypercare end | `<date>` |
| Daily check time | `<time>` |
| Escalation channel | `<channel>` |
| Evidence package location | `<path/reference>` |

## 2. Owner Roles

| Area | Owner role |
|---|---|
| Overall coordination | UAT Lead / Product Owner |
| Engineering governance | Lead Engineer |
| Report approval and issue gates | Approver |
| Deployment and rollback | IT Admin / DevOps |
| Security checks | Security Owner if applicable |
| Defect triage | UAT Lead |

## 3. Daily Checks

| Check | Owner | Evidence/reference | Status |
|---|---|---|---|
| API health check | IT Admin / DevOps |  | Pending |
| Error log checks | IT Admin / DevOps |  | Pending |
| Workflow event checks | IT Admin / DevOps |  | Pending |
| Audit log spot checks | Lead Engineer / IT Admin |  | Pending |
| Evidence access checks | Engineer / IT Admin |  | Pending |
| Report gate checks | Approver / Lead Engineer |  | Pending |
| Work order closure checks | Lead Engineer |  | Pending |
| Backup/restore checks | IT Admin / DevOps |  | Pending |
| Open defect review | UAT Lead |  | Pending |

## 4. Error Log Checks

Review:

- new critical/high errors;
- repeated workflow failures;
- report gate blocked events;
- extraction failure events;
- work order closure blocked events;
- unresolved error logs older than agreed SLA.

Escalate immediately if a critical or governance-related error appears.

## 5. Workflow Event Checks

Confirm:

- workflow events are created through AIM APIs;
- failed workflow events have matching error logs;
- retry/recovery actions do not duplicate approvals, promotions, report issue, or work order creation;
- n8n does not show direct PostgreSQL write behavior.

## 6. Audit Log Spot Checks

Spot-check audit logs for:

- approval;
- rejection;
- correction;
- staging promotion;
- calculation run/review/approval;
- integrity decision approval/rejection;
- report issue blocked/issued;
- internal work order create/update/close;
- evidence link and evidence access where applicable.

## 7. Evidence Access Checks

Confirm:

- evidence access is permission-gated;
- signed/download URL behavior uses non-production configuration during UAT;
- evidence linkage exists for required engineering records;
- no confidential evidence file is added to the UAT evidence package.

## 8. Report Gate Checks

Confirm:

- report issue remains blocked when required data, evidence, calculation, review, approval, or workflow-error gates are missing;
- issue action requires authorized human approver;
- AI/n8n/service users cannot issue reports;
- report issue comment/reason behavior is preserved.

## 9. Work Order Closure Checks

Confirm:

- internal work order fallback remains internal only;
- work order close requires completion note;
- closure evidence is required when configured;
- no external SAP/Maximo/CMMS integration is enabled by this phase.

## 10. Backup / Restore Checks

Confirm:

- backup procedure was executed or rehearsed;
- restore procedure has been verified in non-production where feasible;
- rollback instructions remain available;
- migration and seed logs are retained in the evidence package.

## 11. Incident Escalation

Escalate immediately when:

- AI/n8n approval bypass is observed;
- report issue gate fails open;
- evidence linkage can be bypassed;
- audit log is missing for a controlled action;
- direct n8n DB write access is suspected;
- secrets or production credentials are detected;
- blocker/critical defect appears.

## 12. Rollback Trigger

Rollback must be considered when:

- a governance defect affects final engineering data integrity;
- report issue can occur without required gates;
- calculation governance can be bypassed;
- data migration causes unacceptable corruption or loss;
- security owner identifies exposed secret or production credential;
- critical defect cannot be mitigated within agreed window.

## 13. Post-UAT Lessons Learned

Capture:

- what passed cleanly;
- what failed or was blocked;
- governance controls that need clarification;
- documentation gaps;
- test data gaps;
- deployment or rollback lessons;
- recommended next sprint actions.

## 14. Hypercare Exit Criteria

Hypercare can close when:

- no blocker/critical/governance defect remains unresolved;
- daily checks show stable behavior;
- evidence package and sign-off register are complete or formally deferred;
- rollback plan remains valid;
- Product Owner and Lead Engineer accept closure status.


## RC3-A / RC3-B alignment note

RC3-A and RC3-B are now implemented in this repository state. Correct health endpoints are `GET /health` and `GET /health/db`. Correct authentication endpoints are `POST /api/v1/auth/login` and `GET /api/v1/auth/me`. RBAC demo endpoints and demo CORS headers are local/development/test only when `AUTH_ALLOW_LOCAL_DEMO=true`; they are unavailable in production-like environments.

RC3-B implements evidence object-storage upload/download and report artifact object-storage export. Original evidence files and generated report artifacts are stored in private S3-compatible object storage; PostgreSQL stores metadata, checksums, object keys, upload sessions, status, and audit linkage. Legacy metadata-only evidence upload is retained only for compatibility and is not gate-eligible until object storage verification is completed through the RC3-B flow.

Final production closure remains human-gated after hypercare completion; AI and n8n cannot approve production closure or final engineering actions.
