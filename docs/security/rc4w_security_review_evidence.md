# RC4-W Security Review Evidence

Purpose: capture production security review evidence before unconditional go-live. Do not paste secrets, JWTs, passwords, signed URLs, object keys, private credentials, or vulnerability exploit details into this evidence file.

## Required Evidence

| Area | Evidence Required | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
| Secrets and environment configuration | Redacted confirmation of JWT, database, object storage, CORS, and app environment configuration | Security Lead / Platform Lead | Pending evidence | Do not expose values |
| RBAC and service actor boundary verification | Role/permission matrix, denied-action screenshots/logs, and AI/n8n/service actor blocking evidence | Security Lead | Pending evidence | AI/n8n/service actors cannot approve/finalize |
| Audit log redaction | Evidence that audit logs redact signed URLs, secrets, credentials, and sensitive evidence references | Engineering Lead | Pending evidence | Link to redacted sample only |
| Vulnerability scan | Summary of dependency, container, infrastructure, and application scan status | Security Lead | Pending evidence | Critical/high disposition required |
| Dependency/license review | License and dependency risk review summary | Security Lead | Pending evidence | Attach approved tool output or summary |
| Security headers and CORS | Production domain verification for security headers and CORS allowlist | Platform Lead | Pending evidence | Helmet/CORS verified |

## Residual Risk Disposition

Each open issue must be classified as closed, accepted with mitigation, deferred with owner/date, or go-live blocking.
