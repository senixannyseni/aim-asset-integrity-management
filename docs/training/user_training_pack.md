# AIM Phase 2.0 User Training and Operating Pack

**Purpose:** Provide practical role-based training for controlled UAT/release preparation after Phase 1 Governance Closure.  
**Audience:** Admin, Inspector, Engineer, Lead Engineer, Approver, IT Admin, Management.  
**Scope:** Training only. This pack does not implement frontend UI and does not change backend governance behavior.

## 1. Core Messages for All Users

1. AIM is the system of record.
2. n8n is orchestration only; it must not write final engineering data.
3. AI is extraction/staging assistance only.
4. AI confidence is not engineering approval.
5. Human engineering review is mandatory before staging data is promoted.
6. Evidence linkage is mandatory for engineering claims.
7. Calculations require explicit approved formula version.
8. Calculation output must retain: **Engineering review required before final use.**
9. Report issue is blocked until required gates pass.
10. Internal work orders are the MVP fallback before external CMMS/SAP/Maximo integration.
11. Audit logs are expected for every controlled action.
12. Do not use real client or confidential data in UAT unless formally approved and protected.

## 2. Admin Training

### Responsibilities

- Manage users and roles.
- Review permission assignments.
- Maintain master/configuration data where allowed.
- Support UAT user setup.
- Coordinate with IT Admin for environment readiness.

### What Admin Can Do

- Create or manage users where permission allows.
- Assign roles according to approved access matrix.
- View system configuration where permitted.
- Help prepare UAT accounts.

### What Admin Must Not Do

- Admin must not approve engineering data unless also assigned a proper engineering/approval role.
- Admin must not bypass evidence, calculation, integrity decision, or report issue gates.
- Admin must not grant broad permissions without documented approval.

### Standard Operating Steps

1. Confirm user role request is approved.
2. Create/enable user.
3. Assign role.
4. Ask user to log in and call `/auth/me` or equivalent UI profile.
5. Confirm user sees only allowed modules/actions.
6. Review audit entry for role assignment where implemented.

### Key Controls

- Segregation of duty still applies.
- Service users must be restricted.
- AI and n8n service users must not receive approval/issue/final-action permissions.

## 3. Inspector Training

### Responsibilities

- Create or prepare inspection context.
- Upload/register evidence metadata.
- Link evidence to inspection/asset/context.
- Submit evidence or inspection data for review.

### Standard Evidence Workflow

1. Confirm asset and inspection context.
2. Prepare evidence file using supported extension.
3. Register evidence metadata in AIM.
4. Confirm checksum, MIME type, size, method, component, and source file name.
5. Link evidence to asset/inspection/finding/NDT context.
6. Confirm evidence status and audit record.

### What Inspector Must Not Do

- Do not upload unsupported or unsafe files.
- Do not use real confidential evidence in UAT.
- Do not treat AI extraction as final engineering data.
- Do not bypass Engineer review.
- Do not delete evidence that is linked to engineering records.

### Key Controls

- Unsupported file types are rejected.
- Evidence linkage is required before downstream engineering approval/issue.
- Evidence access/download may create audit logs.

## 4. Engineer Training

### Responsibilities

- Review AI extraction fields.
- Compare extracted values with source evidence.
- Approve, correct, or reject fields.
- Create manual override with reason when correcting.
- Promote staging data only after gates pass.
- Run and review calculations using approved formula versions.
- Create draft integrity decisions.

### AI Extraction Review Steps

1. Open extraction job/staging record.
2. Confirm asset tag, inspection ID, method, component, evidence file, and source reference.
3. Review confidence score and validation flags.
4. Compare each extracted value against evidence.
5. Choose action:
   - approve if evidence matches,
   - correct if value is wrong but evidence supports correction,
   - reject if field cannot be trusted,
   - request additional evidence if source is incomplete.
6. Provide required reason/comment for correction or rejection.
7. Confirm manual override is created when correcting.
8. Promote only when review and evidence gates pass.

### Calculation Steps

1. Confirm reviewed/promoted input data.
2. Confirm evidence linkage.
3. Select explicit approved formula version.
4. Run calculation.
5. Review input snapshot, formula version snapshot, output snapshot, warnings, blockers, and disclaimer.
6. Resolve missing evidence, unit mismatch, zero/negative/missing data warnings according to engineering process.
7. Submit for review/approval if required.

### What Engineer Must Not Do

- Do not approve without checking evidence.
- Do not promote missing evidence.
- Do not rely solely on AI confidence.
- Do not run calculations with silent/default formula selection.
- Do not invent or add API/ASME formulas.
- Do not issue final reports unless assigned Approver role and gates pass.

## 5. Lead Engineer Training

### Responsibilities

- Resolve escalations.
- Review sensitive corrections.
- Review calculation/integrity decision readiness.
- Monitor blocked gates and critical errors.
- Ensure engineering governance is not bypassed.

### Escalation Scenarios

Escalate when:

- asset tag mismatch cannot be resolved,
- duplicate report or inspection may overwrite history,
- thickness value materially affects status,
- evidence conflicts between sources,
- reviewer correction changes integrity status,
- formula/version or validation rule appears wrong,
- report issue gate is blocked by critical unresolved issue.

### Lead Engineer Checklist

1. Review evidence lineage.
2. Review manual override reasons.
3. Review calculation warnings and blockers.
4. Confirm formula version is approved.
5. Confirm integrity decision references reviewed data/calculation/evidence.
6. Confirm no AI/n8n/service user approved final engineering action.
7. Confirm audit events exist for critical actions.

## 6. Approver Training

### Responsibilities

- Review final report readiness.
- Verify report issue gates.
- Issue report only when all gates pass.
- Provide required issue/approval comment.
- Reject or return with reason when gates or evidence are insufficient.

### Report Issue Steps

1. Open report record.
2. Confirm report is approved and ready for issue.
3. Review gate checklist:
   - required data complete,
   - evidence linked,
   - NDT/reviewed data where applicable,
   - calculation completed/reviewed/approved,
   - integrity decision created/approved,
   - report approved,
   - unresolved critical warnings absent,
   - workflow errors resolved,
   - approver/issuer comment present.
4. If any gate fails, do not issue; return to responsible role.
5. Enter issue comment.
6. Issue report.
7. Confirm audit log exists.

### What Approver Must Not Do

- Do not issue report with failed gates.
- Do not issue report without required comment.
- Do not treat AI output or unreviewed calculation as final.
- Do not approve your own work if segregation-of-duty applies.

## 7. IT Admin Training

### Responsibilities

- Monitor workflow events.
- Monitor error logs.
- Configure integration secrets through secure environment management.
- Verify object storage connectivity.
- Verify n8n boundary.
- Support deployment and rollback.

### Daily/Release Checks

1. Confirm API health.
2. Confirm database connectivity.
3. Confirm object storage connectivity.
4. Confirm signed URL behavior.
5. Confirm workflow event creation.
6. Confirm error log creation.
7. Confirm no n8n PostgreSQL credentials are configured.
8. Confirm demo/local auth disabled outside local/test/development.
9. Confirm AI/n8n service users remain restricted.
10. Confirm backup exists before migration/release.

### Incident Handling

- Workflow failure: ensure `/api/error-logs` and `/api/workflow-events` are created.
- Migration failure: stop, restore backup if needed, record incident.
- Permission issue: verify user role/permission seed and refresh session.
- Evidence access issue: verify permission, storage metadata, signed URL config.
- Report gate issue: do not bypass; route to responsible role.

## 8. Management Training

### Responsibilities

- Read dashboard and status indicators.
- Understand report/work-order visibility.
- Interpret governance state without performing restricted actions.

### Key Concepts

- Draft: not final.
- Pending review: human action required.
- Blocked: gate or validation issue prevents progression.
- Approved: authorized human approval completed.
- Issued: formal report issued after gates pass.
- Closed: work order/workflow closed after required evidence/comment.

### Management Restrictions

- Management should not directly alter engineering data unless assigned the correct operational role.
- Management dashboard counts must reflect backend source-of-truth records, not spreadsheet/manual estimates.

## 9. Common Errors and Corrective Actions

| Error / Situation | Meaning | Corrective Action |
|---|---|---|
| `REPORT_GATES_NOT_SATISFIED` | Report issue gate failed. | Review failed gates and route to responsible role. |
| `REPORT_ISSUE_COMMENT_REQUIRED` | Human issuer comment missing. | Add meaningful issue comment. |
| `REPORT_ISSUE_BLOCKED` | Report issue was blocked and audited. | Resolve gate failures; do not bypass. |
| `MISSING_EVIDENCE_REFERENCE` | Evidence link/reference missing. | Add or correct evidence link. |
| `UNIT_MISMATCH` | Unit is unclear or not allowed for final use. | Engineer resolves unit and records reason. |
| `AI_ATTEMPTED_APPROVAL_OR_DECISION` | AI output attempted forbidden final action. | Reject payload and investigate. |
| `EXPLICIT_FORMULA_VERSION_REQUIRED` | Calculation missing approved formula version. | Select explicit approved formula version. |
| Work order close blocked | Completion note/evidence missing. | Add required note/evidence link. |

## 10. Training Completion Record

| Role | Participant | Training Date | Completed Topics | Signature / Evidence |
|---|---|---|---|---|
| Admin |  |  |  |  |
| Inspector |  |  |  |  |
| Engineer |  |  |  |  |
| Lead Engineer |  |  |  |  |
| Approver |  |  |  |  |
| IT Admin |  |  |  |  |
| Management |  |  |  |  |
