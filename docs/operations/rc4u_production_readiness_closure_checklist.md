# RC4-U Production Readiness Closure Checklist

## Purpose

Confirm that the AIM Tank Integrity MVP can be promoted from release candidate to production go-live after RC4-U.

## Checklist

| Area | Check | Evidence required | Status |
|---|---|---|---|
| Environment | Production environment variables configured | Redacted environment validation checklist | Pending evidence |
| Database | Migrations applied successfully | Migration log or CI/CD run output | Pending evidence |
| Object storage | Evidence bucket/container reachable | Upload/download metadata verification without exposing signed URLs | Pending evidence |
| Report artifact storage | Report export storage reachable | Export metadata verification | Pending evidence |
| Authentication | JWT login/refresh/me verified | Smoke test result | Pending evidence |
| RBAC | Service actors blocked from finalization paths | Smoke test result | Pending evidence |
| Audit logs | Key actions create audit entries | Audit log screenshot/export | Pending evidence |
| Backups | Backup job configured | Backup job proof | Pending evidence |
| Restore | Restore procedure reviewed or tested | Restore test record or signoff | Pending evidence |
| Monitoring | Runtime logs/health checks observed | Health check and log screenshot | Pending evidence |
| Security | Security baseline accepted | Security signoff | Pending evidence |
| UAT | Final UAT evidence pack accepted | UAT signoff | Pending evidence |

## Go-live rule

Production launch should not proceed until all critical/high blockers are closed or explicitly accepted in the final go/no-go decision.
