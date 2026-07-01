# P5-2 Environment Configuration Evidence Record

**Package:** P5-2 Deployment and Environment Hardening  
**Evidence IDs:** `P5-ENV-003`, `P5-ENV-004`, `P5-ENV-005`, `P5-ENV-006`, `P5-ENV-008`, `P5-ENV-009`

## 1. Evidence Safety Reminder

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, database connection strings with passwords, private keys, or confidential client evidence into this record. Use fixtures such as `<redacted>` and store sensitive proof in the approved secure evidence location.

## 2. Environment Identification

| Field | Value |
|---|---|
| Environment name | `<production / pilot / staging>` |
| Release tag | `<tag>` |
| Commit SHA | `<commit-sha>` |
| Deployment owner | `<name / role>` |
| Review date | `<date>` |
| Evidence location | `<secure evidence reference>` |

## 3. Environment Variable Inventory

| Variable | Required | Source | Redacted value present | Reviewer note |
|---|---:|---|---:|---|
| `NODE_ENV` | Yes | runtime environment | Yes / No | must be production-like where applicable |
| `DATABASE_URL` | Yes | secret manager / secure env | Yes / No | do not paste real value |
| `AUTH_JWT_SECRET` | Yes | secret manager / secure env | Yes / No | do not paste real value |
| `REFRESH_TOKEN_SECRET` | Conditional | secret manager / secure env | Yes / No | do not paste real value |
| `CORS_ORIGIN` | Yes | environment config | Yes / No | approved frontend origin only |
| `OBJECT_STORAGE_ENDPOINT` | Conditional | environment config | Yes / No | approved endpoint only |
| `OBJECT_STORAGE_BUCKET` | Conditional | environment config | Yes / No | private bucket required |
| `OBJECT_STORAGE_ACCESS_KEY_ID` | Conditional | secret manager / secure env | Yes / No | do not paste real value |
| `OBJECT_STORAGE_SECRET_ACCESS_KEY` | Conditional | secret manager / secure env | Yes / No | do not paste real value |
| `SIGNED_URL_EXPIRY_SECONDS` | Conditional | environment config | Yes / No | short-lived only |
| `N8N_WEBHOOK_SECRET` | Conditional | secret manager / secure env | Yes / No | no direct DB credentials |
| `NEXT_PUBLIC_API_BASE_URL` | Conditional | frontend env | Yes / No | approved API origin only |
| `NEXT_PUBLIC_AIM_LEGACY_TOKEN_STORAGE` | Optional | frontend env | Yes / No | default should remain false unless approved |

## 4. `.env.example` Parity Review

| Check | Result | Evidence reference | Reviewer |
|---|---|---|---|
| All required deployment variables represented in `.env.example` or deployment runbook | Pending |  |  |
| No real secrets committed | Pending |  |  |
| No production credentials committed | Pending |  |  |
| Legacy token storage opt-in reviewed | Pending |  |  |

## 5. PostgreSQL Configuration Review

| Check | Result | Evidence reference | Reviewer |
|---|---|---|---|
| Application DB role is least-privilege | Pending |  |  |
| Migration role is controlled or separated where applicable | Pending |  |  |
| Backup location and schedule are documented | Pending |  |  |
| n8n has no direct PostgreSQL write access | Pending |  |  |
| no direct n8n PostgreSQL writes are configured or permitted | Pending |  |  |

## 6. Object Storage Configuration Review

| Check | Result | Evidence reference | Reviewer |
|---|---|---|---|
| Bucket/private access policy verified | Pending |  |  |
| Signed URL TTL verified | Pending |  |  |
| Raw object keys are not exposed as durable UI state | Pending |  |  |
| Checksum policy verified | Pending |  |  |
| Evidence/report artifact path convention verified | Pending |  |  |

## 7. Human Signoff

| Role | Name | Decision | Date | Comment |
|---|---|---|---|---|
| DevOps |  | Pending |  |  |
| Security Owner |  | Pending |  |  |
| Lead Engineer |  | Pending |  |  |

AI/n8n/service actors cannot approve environment configuration evidence or waive missing deployment controls.
