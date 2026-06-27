# Environment Validation Checklist

## Purpose

Validate that the target AIM environment is correctly configured before go-live or release-candidate smoke testing.

## Application URLs

- [ ] API base URL is configured and reachable.
- [ ] Frontend base URL is configured and reachable.
- [ ] CORS policy only permits approved frontend origins.
- [ ] HTTPS/TLS termination is configured for production-like environments.

## PostgreSQL

- [ ] PostgreSQL connection string is present and points to the correct environment.
- [ ] Database user has required application privileges only.
- [ ] Migration user, if separate, is controlled.
- [ ] PostgreSQL backup location and schedule are known.
- [ ] n8n must not write directly to PostgreSQL.
- [ ] No n8n PostgreSQL credentials are provisioned for final engineering data operations.

## Object Storage

- [ ] Object storage bucket/endpoint is configured.
- [ ] Bucket is private by default.
- [ ] Object storage signed URL policy is configured with short-lived URLs.
- [ ] Object key conventions are aligned with evidence/report artifact governance.
- [ ] File size/MIME policy is configured.
- [ ] Checksum policy is enabled for evidence/report artifacts.

## Security and Session

- [ ] JWT secret presence verified through secret manager or secure environment variable.
- [ ] Refresh/session behavior configured.
- [ ] Password/session policy reviewed.
- [ ] Secret values are not logged.
- [ ] Sensitive metadata redaction is enabled in relevant read-only visibility pages.

## Workflow and Audit

- [ ] Audit logging enabled.
- [ ] Error logging enabled.
- [ ] Workflow event logging enabled.
- [ ] n8n API-only integration boundary verified.
- [ ] n8n must not write directly to PostgreSQL.
- [ ] n8n may only call AIM backend APIs for orchestration, notifications, and workflow/error event reporting.

## Go/No-Go Environment Evidence

- [ ] Screenshots/logs for API and frontend health checks retained.
- [ ] Database migration state exported or captured.
- [ ] Object storage test object and checksum verification retained.
- [ ] RBAC verification retained.
- [ ] n8n no-direct-DB-write confirmation retained.

## Explicit n8n PostgreSQL Boundary Confirmation

- [ ] no direct n8n PostgreSQL writes are configured or permitted.

## RC3-J environment validation anchors

- API base URL
- frontend base URL
- PostgreSQL connection
- object storage bucket/endpoint
- object storage signed URL policy
- JWT secret presence
- CORS policy
- file size/MIME policy
- audit logging enabled
- n8n must not write directly to PostgreSQL
- no direct n8n PostgreSQL writes
