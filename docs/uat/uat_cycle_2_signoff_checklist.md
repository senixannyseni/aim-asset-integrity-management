# UAT Cycle 2 Signoff Checklist

Use PASS / FAIL / N/A and attach evidence file references.

| Control | Expected Result | PASS / FAIL | Evidence |
|---|---|---|---|
| JWT login uses `$login.data.accessToken` | Bearer token is available and used |  |  |
| Demo headers disabled by default | No demo headers unless local flag enabled |  |  |
| AI cannot approve extraction/calculation/integrity/report/work order actions | 403 denial |  |  |
| n8n remains orchestration-only | No direct PostgreSQL write by n8n |  |  |
| NDT invalid `manual_uat` extraction_source | Controlled 400 validation |  |  |
| FFS UUID calculation lookup | No UUID/text DB error |  |  |
| FFS text run_id lookup | No UUID/text DB error |  |  |
| RBI UUID calculation lookup | No UUID/text DB error |  |  |
| RBI text run_id lookup | No UUID/text DB error |  |  |
| Integrity decision approval without evidence | 409 blocked |  |  |
| Integrity decision approval with direct evidence | Approved |  |  |
| Report issue missing report evidence | 409 blocked |  |  |
| Report issue missing calculation_run evidence | 409 blocked |  |  |
| Report issue missing integrity_decision evidence | 409 blocked |  |  |
| Report issue with all per-entity evidence | Issued and locked |  |  |
| External CMMS reference | Rejected as out of MVP scope |  |  |
| Internal AIM work order fallback | Created |  |  |
| Engineer work order close | Denied without permission |  |  |
| Senior/admin work order close | Closed with audit log |  |  |

## Signoff Decision

- PASS
- PASS_WITH_LOCAL_FIXES
- FAIL

## Residual Risks

Document any remaining items before go/no-go. AI must not approve final engineering actions. External CMMS remains out of scope.
