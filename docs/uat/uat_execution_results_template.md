# UAT Execution Results Template

## 1. UAT Cycle Summary

| Field | Value |
|---|---|
| UAT Cycle |  |
| Environment | local / UAT / staging rehearsal |
| Build / Commit / Tag |  |
| Test Start Date |  |
| Test End Date |  |
| UAT Lead |  |
| Product Owner |  |
| Lead Engineer |  |
| IT Admin / DevOps |  |
| Overall Result | pass / fail / blocked / not run |
| Go/No-Go Recommendation | go / conditional go / no-go |

## 2. Test Case Execution Register

| Test Case ID | Role Used | Tester | Result | Defect ID | Screenshot / Evidence Link | Audit Log Reference | Workflow / Error Log Reference | Reviewer Sign-Off | Retest Result | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| UAT-AUTH-001 | Admin |  | pass/fail/blocked/not run |  |  |  |  |  |  | Login / auth smoke test. |
| UAT-EVID-001 | Inspector |  | pass/fail/blocked/not run |  |  |  |  |  |  | Evidence metadata and signed URL. |
| UAT-AI-001 | Engineer |  | pass/fail/blocked/not run |  |  |  |  |  |  | AI extraction staging-only. |
| UAT-REVIEW-002 | Engineer |  | pass/fail/blocked/not run |  |  |  |  |  |  | Manual override with reason. |
| UAT-CALC-001 | Engineer |  | pass/fail/blocked/not run |  |  |  |  |  |  | Explicit approved formula version. |
| UAT-DEC-001 | Lead Engineer |  | pass/fail/blocked/not run |  |  |  |  |  |  | Integrity decision review. |
| UAT-REPORT-001 | Approver |  | pass/fail/blocked/not run |  |  |  |  |  |  | Report issue gates. |
| UAT-WO-001 | Lead Engineer |  | pass/fail/blocked/not run |  |  |  |  |  |  | Internal work order fallback. |
| UAT-N8N-001 | IT Admin |  | pass/fail/blocked/not run |  |  |  |  |  |  | Workflow event and error log. |
| UAT-AUDIT-001 | Approver / IT Admin |  | pass/fail/blocked/not run |  |  |  |  |  |  | Audit log verification. |

Allowed result values: `pass`, `fail`, `blocked`, `not run`.

## 3. Summary Counts

| Metric | Count |
|---|---:|
| Total cases planned |  |
| Passed |  |
| Failed |  |
| Blocked cases |  |
| Not run |  |
| Critical defects |  |
| Major defects |  |
| Governance defects |  |
| Retests pending |  |
| Retests passed |  |

## 4. Blocked Cases

| Test Case ID | Block Reason | Owner | Target Resolution Date | Workaround Allowed? | Governance Impact |
|---|---|---|---|---|---|
|  |  |  |  | yes/no |  |

## 5. Critical Defects

| Defect ID | Severity | Category | Description | Owner | Status | Retest Result |
|---|---|---|---|---|---|---|
|  | blocker/critical/major/minor/cosmetic | governance/data/environment/test data |  |  | open/fixed/retested/closed |  |

## 6. Governance Defects

A governance defect must be escalated immediately when it affects AI staging, evidence linkage, calculation review, report issue gates, work order closure gates, n8n boundary, RBAC, or audit logs.

| Defect ID | Governance Control Affected | Evidence / Screenshot | Audit Log Reference | Workflow / Error Log Reference | Decision |
|---|---|---|---|---|---|
|  |  |  |  |  | fix before go-live / accepted risk / not applicable |

## 7. Go/No-Go Recommendation

| Decision Area | Status | Notes |
|---|---|---|
| Governance readiness | pass/fail/blocked |  |
| Technical readiness | pass/fail/blocked |  |
| Security readiness | pass/fail/blocked |  |
| UAT readiness | pass/fail/blocked |  |
| Operational readiness | pass/fail/blocked |  |
| Overall go/no-go recommendation | go/conditional go/no-go |  |

## 8. Sign-Off

| Role | Name | Decision | Date | Signature / Approval Reference |
|---|---|---|---|---|
| Product Owner |  | approve/reject/conditional |  |  |
| Lead Engineer |  | approve/reject/conditional |  |  |
| Approver |  | approve/reject/conditional |  |  |
| IT Admin / DevOps |  | approve/reject/conditional |  |  |
| UAT Lead |  | approve/reject/conditional |  |  |
