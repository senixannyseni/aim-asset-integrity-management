# UAT — RC3-E Admin Governance Console / RBAC & System Settings Visibility

## Purpose

Verify that RC3-E exposes admin governance visibility and safe controls without exposing secrets, weakening RBAC, or introducing out-of-scope dashboard/n8n/NDT/hypercare features.

## Preconditions

- User has a valid AIM login with `admin_governance.view`.
- For mutation tests, user also has `admin_governance.manage_roles` and/or `admin_governance.manage_settings`.
- RC3-B, RC3-C, and RC3-D tests remain green.

## UAT script

1. Login as authorized admin governance user.
2. Open `/admin-governance`.
3. Confirm user list loads and does not display password hashes, refresh tokens, MFA secrets, API keys, or credentials.
4. Confirm role list and permission list are visible.
5. Confirm role-permission mapping is visible.
6. Confirm user-role assignment list is visible.
7. Confirm system settings are shown with secret/sensitive settings redacted or blocked.
8. Attempt admin governance access as an unauthorized user and confirm `FORBIDDEN`.
9. Attempt admin governance access as `ai_agent` or n8n/service-style actor and confirm `ADMIN_SERVICE_ACTOR_BLOCKED` or equivalent forbidden response.
10. Assign or remove a user role with a meaningful reason and confirm an `ADMIN_USER_ROLE_ASSIGNED` or `ADMIN_USER_ROLE_REMOVED` audit event is written.
11. Attempt self-escalation and confirm `ADMIN_SELF_ESCALATION_BLOCKED`.
12. Attempt removal of the last admin-capable role and confirm `LAST_ADMIN_REMOVAL_BLOCKED`.
13. Update an allowlisted non-secret system setting with a meaningful reason and confirm `ADMIN_SYSTEM_SETTING_UPDATED` audit event is written.
14. Attempt updating an unknown or secret setting and confirm `ADMIN_SYSTEM_SETTING_UPDATE_BLOCKED`.
    - attempt secret setting update and confirm blocked
15. Confirm no audit log edit/delete/purge/suppress controls exist.
    - confirm no audit log edit/delete controls exist
16. Confirm no dashboard KPI cards, n8n console, NDT visualization, or hypercare dashboard controls exist.
17. Confirm n8n boundary remains API-only and cannot directly administer RBAC or settings.

## Expected result

RC3-E passes when admin governance visibility is RBAC-controlled, sensitive values are redacted, allowed changes are reasoned/audited, blocked changes fail closed, and no out-of-scope features are present.
