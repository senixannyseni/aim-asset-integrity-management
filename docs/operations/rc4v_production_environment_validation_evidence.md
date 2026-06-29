# RC4-V Production Environment Validation Evidence

Purpose: capture target-environment proof before final AIM Tank Integrity go-live.

Do not paste secrets, JWTs, passwords, signed URLs, object keys, or private credentials into this evidence pack. Store screenshots/log extracts only after redaction.

## Required Evidence

| Area | Evidence to attach | Owner | Result |
|---|---|---|---|
| Release tag / commit verification | Git tag, commit SHA, deployment artifact ID | Engineering Lead | Pending target-environment evidence |
| API build artifact | API version/build checksum or deployment ID | Platform/DevOps Lead | Pending target-environment evidence |
| Web build artifact | Frontend build ID or deployment ID | Platform/DevOps Lead | Pending target-environment evidence |
| Environment configuration | Redacted config checklist for CORS, JWT, DB, object storage, app URL | Platform/DevOps Lead | Pending target-environment evidence |
| Database migration | Migration status screenshot/log | Engineering Lead | Pending target-environment evidence |
| Object storage runtime | Evidence upload/download verification without exposing signed URLs or object keys | Platform/DevOps Lead | Pending target-environment evidence |
| Audit log | Audit visibility and redaction verification | Security Lead | Pending target-environment evidence |

## Acceptance Rule

Production validation is not unconditional until every row has evidence attached and reviewed by the required human owner.
