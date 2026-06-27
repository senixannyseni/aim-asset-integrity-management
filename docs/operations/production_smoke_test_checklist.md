# Production Smoke Test Checklist

## Purpose

Run this checklist after deployment and before go/no-go release-candidate acceptance.

## Core Smoke Tests

- [ ] Login succeeds for authorized user.
- [ ] Login fails safely for unauthorized/invalid credentials.
- [ ] RBAC menu visibility is correct for Admin, Engineer, Inspector, Approver, Management, and IT Admin roles.
- [ ] No unauthorized mutation controls visible for read-only roles.
- [ ] Evidence upload/download metadata view is reachable and object storage metadata/checksum fields are visible where permitted.
- [ ] AI staging review visibility is reachable and AI data remains staging/review-only.
- [ ] Engineer review route is reachable for authorized Engineer/Lead Engineer.
- [ ] Report issue gate blocked/allowed behavior is visible and gate failure does not issue reports.
- [ ] Audit log view is reachable for authorized users and read-only.
- [ ] Admin governance view is reachable for authorized admins and controlled.
- [ ] Governance dashboard is reachable and read-only.
- [ ] Workflow console is reachable and read-only.
- [ ] NDT data room is reachable and read-only.
- [ ] Go-live readiness page is reachable and read-only.

## Governance Smoke Tests

- [ ] AI/n8n/service actors cannot approve, reject, correct, promote, issue, calculate, or finalize engineering decisions.
- [ ] n8n must not write directly to PostgreSQL.
- [ ] Evidence linkage warnings/blockers display when required evidence is missing.
- [ ] Audit logs are not editable/deletable through UI/API.
- [ ] Secrets, object keys, signed URLs, raw evidence, and raw report contents are not exposed in unauthorized views.

## Post-Smoke Decision

- [ ] No critical smoke test failed.
- [ ] Any warning is logged in release notes or hypercare tracker.
- [ ] Product Owner, Lead Engineer, IT Admin, and Operations/Hypercare Owner confirm go/no-go recommendation.

## RC3-J smoke test validation anchors

- login
- RBAC menu visibility
- go-live readiness
- NDT data room
- workflow console
- governance dashboard
- audit log
- admin governance
- no unauthorized mutation controls visible
