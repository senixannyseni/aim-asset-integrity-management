# Production Deployment Checklist

## Purpose

Use this checklist before, during, and after RC3 release-candidate deployment. It is an operational control checklist only and does not change application behavior.

## Pre-Deployment

- [ ] Confirm release tag and commit hash.
- [ ] Confirm environment variables validation is complete.
- [ ] Confirm API base URL and frontend base URL are correct.
- [ ] Confirm PostgreSQL connection string points to the intended environment.
- [ ] Confirm database migration check: pending migrations reviewed, execution window approved, rollback approach documented.
- [ ] Confirm seed/reference data check: roles, permissions, system settings, sample/UAT data as applicable.
- [ ] Confirm object storage configuration check: bucket, endpoint, region, credentials source, private access policy, signed URL expiration policy, object key conventions, checksum behavior.
- [ ] Confirm JWT/session/security check: JWT secret present, token/session policy configured, CORS policy restricted, HTTPS enabled, secure cookies/session behavior verified where applicable.
- [ ] Confirm RBAC/role permission check: admin, inspector, engineer, lead engineer, approver, management, IT admin, service roles, AI/n8n restrictions.
- [ ] Confirm audit logging enabled for controlled actions.
- [ ] Confirm backup before deployment: PostgreSQL backup completed and object storage artifact backup/export verification planned.

## Deployment

- [ ] Put deployment window into change calendar.
- [ ] Notify Product Owner, Lead Engineer, IT Admin, Operations/Hypercare Owner.
- [ ] Stop or drain affected services as required.
- [ ] Deploy backend service.
- [ ] Deploy frontend service.
- [ ] Run database migrations.
- [ ] Run seed/reference data updates only when required and approved.
- [ ] Restart services.
- [ ] Verify health endpoints and application startup logs.

## Deployment Smoke Tests

- [ ] Login succeeds for authorized user.
- [ ] RBAC menu visibility is correct.
- [ ] Evidence upload/download metadata flow is reachable.
- [ ] AI staging review visibility is reachable.
- [ ] Report issue gate blocked/allowed behavior is testable.
- [ ] Audit logging and audit log view are reachable.
- [ ] Admin governance, governance dashboard, workflow console, NDT data room, and go-live readiness pages are reachable according to permission.

## Post-Deployment Verification

- [ ] PostgreSQL migration state verified.
- [ ] Object storage read/write/signed URL policy verified.
- [ ] Audit log creation verified for controlled action or safe test event.
- [ ] n8n API-only integration boundary confirmed; n8n must not write directly to PostgreSQL.
- [ ] Error logs and workflow events are monitored for deployment anomalies.
- [ ] User access and role assignment validated.

## Rollback Decision Point

Rollback or pause deployment if PostgreSQL migration fails, object storage verification fails, RBAC exposes unauthorized mutation, report gates fail open, audit logging fails, or n8n direct DB write access is detected.
