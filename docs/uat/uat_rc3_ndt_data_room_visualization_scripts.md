# UAT — RC3-H NDT Data Room / Visualization Governance

## Purpose

Verify that RC3-H provides RBAC-controlled, read-only NDT data room visibility without exposing secrets, performing engineering calculations, or adding mutation controls.

## Preconditions

- RC3-B through RC3-G are merged and green.
- User has a valid AIM login with `ndt_data_room.view`.
- Sample NDT measurements, evidence links, inspection records, and audit records exist or the relevant sections may show zero counts.

## UAT script

1. Login as authorized NDT data room viewer.
2. Open `/ndt-data-room`.
3. Confirm NDT method summary appears.
4. Confirm component coverage summary appears.
5. Confirm CML/TML/Grid coverage summary appears where data exists.
6. Confirm evidence linkage status appears.
7. Confirm measurements missing evidence are visible if data exists.
8. Confirm latest measurements appear if data exists.
9. Confirm no secrets/signed URLs/tokens/credentials/object keys are displayed.
10. Confirm unauthorized user is blocked with `FORBIDDEN`.
11. Confirm ai_agent/n8n_service does not receive NDT governance action access.
12. Confirm page is read-only.
13. Confirm no approve/reject/correct/promote/calculate/report issue/delete/admin/n8n mutation controls exist.
14. Confirm no API 579/API 581/FFS/RBI calculation implementation is introduced.
15. Confirm n8n boundary remains API-only and cannot write NDT data room state directly to PostgreSQL.
    - confirm NDT method summary appears
    - confirm component coverage summary appears
    - confirm evidence linkage status appears
    - confirm no secrets/signed URLs/tokens/credentials/object keys are displayed
    - confirm no approve/reject/correct/promote/calculate/report issue/delete/admin/n8n mutation controls exist
    - confirm no API 579/API 581/FFS/RBI calculation implementation is introduced
    - confirm n8n boundary remains API-only and cannot write NDT data room state directly to PostgreSQL

## Expected result

RC3-H passes when the NDT data room is read-only, RBAC-controlled, summarizes existing AIM NDT/measurement state only, redacts sensitive information, provides safe links to existing workspaces, and does not introduce calculation, approval, promotion, report issue, evidence mutation, admin mutation, n8n execution, or hypercare controls.
