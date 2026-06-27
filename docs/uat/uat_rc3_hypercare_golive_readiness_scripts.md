# UAT — RC3-I Hypercare / Go-Live Readiness Dashboard

## Purpose

Verify that RC3-I provides RBAC-controlled, read-only hypercare and go-live readiness visibility without exposing secrets, performing engineering calculations, or adding mutation/override controls.

## Preconditions

- RC3-B through RC3-H are merged and green.
- User has a valid AIM login with `golive_readiness.view`.
- Sample evidence, AI extraction, staging, calculation, report, NDT, workflow, audit, notification, and UAT records/documents exist or the relevant sections may show zero counts / `not_available`.

## UAT script

1. Login as authorized go-live readiness viewer.
2. Open `/golive-readiness`.
3. Confirm overall readiness status appears.
4. Confirm evidence readiness gate appears.
5. Confirm AI review readiness gate appears.
6. Confirm staging promotion readiness gate appears.
7. Confirm calculation/review readiness gate appears.
8. Confirm report issue gate readiness appears.
9. Confirm NDT readiness gate appears.
10. Confirm workflow/notification readiness gate appears.
11. Confirm audit/admin governance readiness appears.
12. Confirm UAT documentation readiness appears.
13. Confirm recent blockers/warnings appear if data exists.
14. Confirm no secrets/signed URLs/tokens/credentials/object keys/webhook secrets are displayed.
15. Confirm unauthorized user is blocked.
16. Confirm ai_agent/n8n_service does not receive go-live readiness action access.
17. Confirm page is read-only.
18. Confirm no approve/reject/correct/promote/calculate/report issue/delete/admin/n8n mutation controls exist.
19. Confirm no close hypercare issue or override readiness status controls exist.
20. Confirm no API 579/API 581/FFS/RBI calculation implementation is introduced.
21. Confirm n8n boundary remains API-only and cannot write go-live readiness state directly to PostgreSQL.

## Expected result

RC3-I passes when the go-live readiness dashboard is read-only, RBAC-controlled, summarizes existing AIM readiness state only, redacts sensitive information, and provides safe links to existing workspaces without introducing approval, promotion, report issue, calculation, admin, n8n execution, hypercare closure, or readiness override controls.

- confirm overall readiness status appears
- confirm evidence readiness gate appears
- confirm AI review readiness gate appears
- confirm staging promotion readiness gate appears
- confirm calculation/review readiness gate appears
- confirm report issue gate readiness appears
- confirm NDT readiness gate appears
- confirm workflow/notification readiness gate appears
- confirm audit/admin governance readiness appears
- confirm UAT documentation readiness appears
- confirm no approve/reject/correct/promote/calculate/report issue/delete/admin/n8n mutation controls exist
- confirm no API 579/API 581/FFS/RBI calculation implementation is introduced
- confirm n8n boundary remains API-only and cannot write go-live readiness state directly to PostgreSQL
- confirm no secrets/signed URLs/tokens/credentials/object keys/webhook secrets are displayed