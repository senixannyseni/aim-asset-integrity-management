# UAT — RC3-F Governance Dashboard / Readiness Overview

## Purpose

Verify that RC3-F provides RBAC-controlled, read-only governance dashboard visibility without exposing secrets, performing engineering calculations, or adding mutation controls.

## Preconditions

- RC3-B, RC3-C, RC3-D, and RC3-E are merged and green.
- User has a valid AIM login with `dashboard.view`.
- Sample evidence, AI extraction, report, audit, and work-order records exist or the relevant sections may show zero counts.

## UAT script

1. Login as authorized dashboard viewer.
2. Open `/dashboard`.
3. Confirm evidence readiness summary appears.
4. Confirm AI extraction review queue summary appears.
5. Confirm staging promotion readiness summary appears.
6. Confirm calculation/review readiness summary appears.
7. Confirm report issue readiness/gate summary appears.
8. Confirm work order follow-up summary appears if data exists.
9. Confirm audit/governance warning summary appears if RC3-D audit log data exists.
10. Confirm no secrets/signed URLs/tokens/credentials are displayed.
11. Confirm unauthorized user is blocked with `FORBIDDEN`.
12. Confirm ai_agent/n8n_service does not receive dashboard governance action access.
13. Confirm dashboard is read-only.
14. Confirm no approve/reject/correct/promote/report issue/delete/admin mutation controls exist.
15. Confirm no n8n console, NDT visualization, or hypercare dashboard controls exist.
16. Confirm n8n boundary remains API-only and cannot write dashboard state directly to PostgreSQL.
    - confirm evidence readiness summary appears
    - confirm no approve/reject/correct/promote/report issue/delete/admin mutation controls exist
    - confirm n8n boundary remains API-only and cannot write dashboard state directly to PostgreSQL

## Expected result

RC3-F passes when the dashboard is read-only, RBAC-controlled, summarizes existing AIM state only, redacts sensitive information, and provides safe links to existing workspaces without introducing new mutation or out-of-scope controls.
