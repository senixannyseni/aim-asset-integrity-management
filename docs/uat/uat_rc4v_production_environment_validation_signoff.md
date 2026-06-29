# UAT RC4-V Production Environment Validation + Release Candidate Signoff

## Objective

Validate that the release candidate has evidence for deployment verification, smoke testing, backup/restore, monitoring, security review, rollback, and human go/no-go signoff.

## Test Steps

1. Log in as a user with `golive_readiness.view`.
2. Open `/production-validation`.
3. Confirm production validation status, completion estimates, readiness gates, production evidence pack, smoke test matrix, final human signoff roles, safe navigation, and read-only controls boundary are visible.
4. Call `GET /api/v1/production-validation/readiness`.
5. Confirm AI/n8n/service actors are blocked from production validation visibility/finalization.
6. Confirm there are no approve/reject, formula execution, report issue, work-order closure, evidence mutation, AI promotion, n8n execution, or go-live signoff mutation controls.

## Expected Result

The dashboard is read-only and shows target-environment evidence still required before unconditional go-live.
