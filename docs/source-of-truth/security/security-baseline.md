# AIM+n8n MVP Security Baseline

**Document ID:** AIM-SEC-BASELINE-MVP-001  
**Location:** `docs/security-baseline.md`  
**Status:** Implementation-ready baseline  
**Owner:** IT Admin / Security Owner  
**Applies to:** AIM backend API, frontend, PostgreSQL, object storage, n8n workflow integration, evidence access, approval gates, audit logs  
**Last Updated:** 2026-06-11

---

## 0. Pre-Implementation Governance Check

### Assumptions

1. AIM is the system of record for users, roles, permissions, assets, inspections, evidence metadata, staging records, calculations, integrity decisions, reports, work orders, workflow events, and audit logs.
2. PostgreSQL stores final structured engineering data.
3. Object storage stores original evidence files.
4. n8n is workflow orchestration only and must call AIM backend APIs only.
5. n8n must not write directly to PostgreSQL and must not store final engineering data.
6. AI extraction output goes only to `extraction_fields` and `staging_records` before human review.
7. Human review and approval are mandatory for engineering data promotion, calculation approval, integrity decision approval, report issue, and work order actions.
8. Security requirements in this document are minimum MVP controls; production deployment may require additional enterprise controls such as SSO, SIEM integration, WAF, endpoint detection, DLP, and full vulnerability management.

### Impacted Documents

- `01_PRD/AIM_MVP_PRD.md`
- `03_Database/data_dictionary.md`
- `04_API/openapi.yaml`
- `05_n8n/n8n_workflow_catalog.md`
- `05_n8n/error_handling.md`
- `06_Evidence/evidence_governance.md`
- `06_AI_Extraction/AI_Extraction_Control_Pack/human_review_sop.md`
- `07_Calculation/engineering_basis.md`
- `08_Frontend/page_specs.md`
- `08_Frontend/component_inventory.md`
- `08_Frontend/design_system.md`
- `docs/security-baseline.md`

### Impacted Tables

- `users`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`
- `evidence_files`
- `evidence_links`
- `extraction_jobs`
- `extraction_fields`
- `staging_records`
- `manual_overrides`
- `calculation_runs`
- `calculation_inputs`
- `calculation_outputs`
- `integrity_decisions`
- `reports`
- `report_versions`
- `workflow_events`
- `workflow_tasks`
- `notification_logs`
- `error_logs`
- `audit_logs`
- `system_settings`

### Impacted Endpoints

- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/refresh`
- `/api/auth/me`
- `/api/users`
- `/api/roles`
- `/api/permissions`
- `/api/assets`
- `/api/assets/{asset_id}/approve`
- `/api/evidence`
- `/api/evidence/{evidence_id}`
- `/api/evidence/{evidence_id}/download-url`
- `/api/evidence-links`
- `/api/inspections`
- `/api/extraction-jobs`
- `/api/extraction-fields/{field_id}/review`
- `/api/staging-records/{staging_record_id}/promote`
- `/api/ndt/measurements`
- `/api/calculations/run`
- `/api/calculations/{calculation_run_id}/approve`
- `/api/integrity-decisions`
- `/api/integrity-decisions/{decision_id}/approve`
- `/api/reports/generate`
- `/api/reports/{report_id}/issue`
- `/api/work-orders`
- `/api/workflow-events`
- `/api/error-logs`
- `/api/audit-logs`

### Required Permissions

- `auth.login`
- `user.read`, `user.create`, `user.update`, `user.disable`
- `role.read`, `role.manage`
- `asset.read`, `asset.create`, `asset.update`, `asset.approve`
- `inspection.read`, `inspection.create`, `inspection.update`, `inspection.submit`
- `evidence.read`, `evidence.upload`, `evidence.link`, `evidence.update_metadata`, `evidence.delete_request`, `evidence.delete_approve`
- `extraction.read`, `extraction.create`, `extraction.review`, `extraction.promote`
- `ndt.read`, `ndt.create`, `ndt.update`, `ndt.approve`
- `calculation.read`, `calculation.run`, `calculation.review`, `calculation.approve`
- `integrity.read`, `integrity.create`, `integrity.review`, `integrity.approve`
- `report.read`, `report.generate`, `report.review`, `report.approve`, `report.issue`
- `work_order.read`, `work_order.create`, `work_order.update`, `work_order.close`
- `workflow_event.create`, `workflow_event.read`
- `error_log.create`, `error_log.read`, `error_log.resolve`
- `audit.read`
- `system_settings.read`, `system_settings.update`

### Required Audit Events

Every security-sensitive operation must write an immutable audit event, including:

- login success/failure
- logout
- token refresh
- password change/reset
- role assignment changed
- permission changed
- user disabled/enabled
- approval endpoint accessed
- asset approved/rejected
- evidence uploaded/viewed/downloaded/linked/metadata corrected/delete requested/delete approved/delete rejected
- extraction field approved/rejected/corrected
- staging record promoted/rejected
- NDT record created/corrected/approved
- calculation run created/reviewed/approved/rejected
- integrity decision created/reviewed/approved/rejected
- report generated/approved/issued/rejected
- work order created/updated/closed
- n8n workflow event received
- error log created/resolved
- security policy violation

### Required Validation Rules

- Authentication required for all non-public endpoints.
- Permission check required for every endpoint.
- Approval endpoints require explicit approver role and cannot be called by the same user who created/submitted the item where segregation of duty applies.
- Evidence file access requires metadata permission and object access must use short-lived signed URLs.
- Upload must validate extension, MIME type, size, checksum, and required metadata.
- Request payloads must be validated against schemas before business logic execution.
- Error responses must not expose stack traces, database details, secrets, object storage paths, or internal network details.
- All write operations must create audit logs.
- All n8n-triggered operations must pass through AIM backend APIs and create `/api/workflow-events` entries.

### Required Test Cases

- Successful login and logout.
- Failed login lockout/rate-limit behavior.
- Unauthorized request blocked.
- Authenticated but unauthorized request blocked.
- Role assignment applies expected permissions.
- Approval endpoint blocked without correct role.
- Same-user submit-and-approve blocked where segregation applies.
- Evidence download blocked without permission.
- Evidence signed URL expires.
- Invalid file extension rejected.
- MIME mismatch rejected.
- Oversized upload rejected.
- Malware scanning placeholder event recorded.
- Invalid request schema rejected.
- Error response does not leak internal details.
- Audit log generated for every approval, rejection, correction, calculation, report issue, and work order action.
- n8n workflow failure creates `/api/error-logs`.

### Migration / Documentation Updates

- Ensure permissions exist in seed data.
- Ensure audit event enums include all events listed in this document.
- Ensure user table supports password hash metadata and disabled/locked status.
- Ensure evidence metadata supports checksum, MIME type, size, storage key, preview key, version, retention status, and delete approval status.
- Ensure documentation and OpenAPI stay aligned with permission names and error schema.

---

## 1. Authentication Approach

### 1.1 MVP Authentication Model

AIM MVP must use server-side authentication through the AIM backend. All frontend requests must call the AIM API over HTTPS. The backend validates credentials, creates an authenticated session or token pair, and enforces RBAC on every protected endpoint.

### 1.2 Supported Authentication Modes

For MVP, the default approach is:

| Mode | MVP Status | Notes |
|---|---:|---|
| Email + password | Required | Primary MVP login method. |
| JWT access token | Required | Used for API authorization. |
| Refresh token or server session | Required | Used to renew short-lived access. |
| SSO / SAML / OIDC | Future | Enterprise extension. |
| MFA | Recommended placeholder | Can be added before enterprise go-live. |

### 1.3 Login Flow

1. User submits email and password to `/api/auth/login`.
2. Backend validates user status, password, lockout state, and role assignment.
3. Backend returns authenticated session metadata and token/session credential.
4. Backend writes `auth.login_success` or `auth.login_failed` audit event.
5. Frontend stores the token/session according to the chosen JWT/session policy below.

### 1.4 Account Status Controls

Users must have account status values such as:

- `active`
- `disabled`
- `locked`
- `pending_activation`

Disabled, locked, and pending users must not access protected endpoints.

---

## 2. Password Hashing Requirement

### 2.1 Hashing Algorithm

Passwords must never be stored in plaintext. Passwords must be hashed using a modern adaptive password hashing algorithm:

| Requirement | Baseline |
|---|---|
| Preferred algorithm | Argon2id |
| Acceptable fallback | bcrypt with strong cost factor |
| Salt | Unique per password |
| Pepper | Recommended via secret manager, not database |
| Plaintext logging | Strictly prohibited |
| Password exposure in API response | Strictly prohibited |

### 2.2 Password Policy

Minimum password policy for MVP:

- Minimum 12 characters.
- Must not match common password list.
- Must not contain email username or obvious organization name.
- Password reset tokens must be single-use and time-limited.
- Password change must revoke active refresh tokens or sessions.

### 2.3 Password Storage Fields

Recommended user security metadata:

| Field | Purpose |
|---|---|
| `password_hash` | Adaptive hash only. |
| `password_hash_algorithm` | Example: `argon2id`. |
| `password_changed_at` | Token/session invalidation control. |
| `failed_login_count` | Lockout/rate-limit support. |
| `locked_until` | Temporary lockout. |
| `last_login_at` | Security monitoring. |

---

## 3. JWT / Session Policy

### 3.1 Token Policy

| Control | Requirement |
|---|---|
| Access token lifetime | Short-lived, recommended 15 minutes. |
| Refresh token lifetime | Recommended 7 days for MVP, configurable. |
| Token signing | Strong asymmetric or HMAC secret from secret manager. |
| Token claims | Minimal claims only. |
| Permission source | Server must verify against current RBAC state, not blindly trust stale token claims. |
| Token revocation | Required on logout, password change, user disable, role critical change. |

### 3.2 Recommended JWT Claims

Access token claims should be minimal:

```json
{
  "sub": "usr_001",
  "email": "engineer@example.com",
  "roles": ["Engineer"],
  "iat": 1760000000,
  "exp": 1760000900,
  "jti": "jwt_unique_id"
}
```

Do not include sensitive data, password metadata, object storage keys, or full permission lists if permission changes must take effect immediately.

### 3.3 Browser Storage

Recommended MVP approach:

- Prefer secure, HTTP-only, SameSite cookies for refresh/session tokens.
- Access tokens may be kept in memory where practical.
- Avoid storing long-lived tokens in localStorage.
- Set `Secure`, `HttpOnly`, and `SameSite=Lax` or `Strict` according to deployment flow.

### 3.4 Session Invalidation

Sessions/tokens must be invalidated when:

- User logs out.
- Password changes.
- User is disabled.
- Critical role or permission is removed.
- Suspicious activity is detected.

---

## 4. RBAC Model

### 4.1 RBAC Principles

AIM uses role-based access control with explicit permissions. Roles aggregate permissions, and users receive permissions through assigned roles.

Core tables:

- `users`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`

### 4.2 Standard Roles

| Role | Description |
|---|---|
| Admin | Configures master data, users, roles, and application settings. |
| Inspector | Creates inspections, uploads evidence, enters field/NDT data. |
| Engineer | Reviews AI extraction, validates staging records, runs/reviews calculations, prepares technical recommendations. |
| Lead Engineer | Approves engineering data promotion, calculation outputs, and integrity recommendations. |
| Approver | Issues formal approvals for reports, integrity decisions, and controlled actions. |
| Management | Reads dashboard, KPIs, reports, and high-level status. |
| IT Admin | Manages technical configuration, security settings, logs, integration monitoring, and system operations. |

### 4.3 Segregation of Duty

Segregation of duty must be enforced for controlled actions:

- A user who created or submitted a controlled item should not be the sole approver of the same item.
- Engineer review is mandatory before extracted data promotion.
- AI cannot approve, issue, or finalize engineering data.
- n8n cannot approve or write final engineering data.

Controlled actions include:

- asset approval
- extraction field approval/rejection
- staging record promotion
- calculation approval
- integrity decision approval
- report approval/issue
- evidence deletion approval
- work order closure approval where required

---

## 5. Permission Matrix by Module

Legend:

- `R` = read
- `C` = create
- `U` = update/correct
- `A` = approve/reject
- `I` = issue/finalize
- `D` = delete request/approve where allowed
- `-` = no default access

| Module | Admin | Inspector | Engineer | Lead Engineer | Approver | Management | IT Admin |
|---|---:|---:|---:|---:|---:|---:|---:|
| Auth / Own Profile | R/U | R/U | R/U | R/U | R/U | R/U | R/U |
| Users | C/R/U/D | - | - | - | - | - | R/U |
| Roles & Permissions | C/R/U/D | - | - | - | - | - | C/R/U/D |
| Assets | C/R/U/A | R | R/U | R/U/A | R/A | R | R |
| Asset Components | C/R/U | R | R/U | R/U/A | R | R | R |
| Inspections | R | C/R/U | R/U | R/U/A | R/A | R | R |
| Inspection Findings | R | C/R/U | R/U | R/U/A | R/A | R | R |
| Evidence Files | R/U/D | C/R/U | R/U | R/U/A/D | R/A/D | R | R/U/D |
| Evidence Links | R/U | C/R/U | C/R/U | C/R/U/A | R | R | R/U |
| AI Extraction Jobs | R | C/R | C/R/U | R/A | R | R | R/U |
| Extraction Fields | R | R | R/U/A | R/U/A | R | R | R |
| Staging Review | R | R | R/U | R/U/A | R/A | R | R |
| NDT Measurements | R | C/R/U | R/U | R/U/A | R | R | R |
| CML/TML Points | R | C/R/U | R/U | R/U/A | R | R | R |
| Calculations | R | R | C/R/U | R/U/A | R/A | R | R |
| Formula Versions | R | - | R | R/A | R | R | C/R/U |
| Integrity Decisions | R | R | C/R/U | R/U/A | R/A | R | R |
| Reports | R | R | C/R/U | R/U/A | R/A/I | R | R |
| Report Templates | C/R/U | - | R | R/U | R/A | R | R/U |
| Dashboard | R | R | R | R | R | R | R |
| Work Orders | R | C/R/U | C/R/U | R/U/A | R/A | R | R/U |
| Workflow Events | R | - | R | R | R | R | C/R/U |
| Error Logs | R | - | R | R | R | - | C/R/U |
| Audit Logs | R | - | R limited | R | R | R limited | R |
| System Settings | C/R/U | - | - | - | - | - | C/R/U |

### 5.1 Permission Naming Convention

Permissions should use this format:

```text
<module>.<action>
```

Examples:

- `asset.read`
- `asset.create`
- `asset.approve`
- `evidence.upload`
- `evidence.link`
- `calculation.run`
- `calculation.approve`
- `report.issue`
- `audit.read`

---

## 6. Approval Endpoint Protection

### 6.1 Approval Endpoint Rules

Approval endpoints must be protected by all of the following:

1. Authenticated user.
2. Explicit approval permission.
3. Active account status.
4. Segregation-of-duty check.
5. Required prerequisite gates satisfied.
6. Required evidence links present.
7. Required review records present.
8. Immutable audit event written.

### 6.2 Approval Endpoint Examples

| Endpoint | Required Permission | Required Audit Event |
|---|---|---|
| `POST /api/assets/{asset_id}/approve` | `asset.approve` | `asset.approved` or `asset.rejected` |
| `POST /api/extraction-fields/{field_id}/review` | `extraction.review` | `extraction_field.reviewed` |
| `POST /api/staging-records/{id}/promote` | `extraction.promote` | `staging_record.promoted` |
| `POST /api/calculations/{id}/approve` | `calculation.approve` | `calculation.approved` |
| `POST /api/integrity-decisions/{id}/approve` | `integrity.approve` | `integrity_decision.approved` |
| `POST /api/reports/{id}/issue` | `report.issue` | `report.issued` |
| `POST /api/evidence/{id}/delete-approve` | `evidence.delete_approve` | `evidence.delete_approved` |

### 6.3 Approval Payload Requirements

Approval/rejection payloads must include:

- `decision`: `approved` or `rejected`
- `comment`: required for rejection, recommended for approval
- `reviewed_by` or derived authenticated user ID
- `reviewed_at` or server timestamp
- `prior_status`
- `new_status`
- `correlation_id`

### 6.4 Forbidden Approval Behavior

The system must block:

- AI approval.
- n8n approval.
- unauthenticated approval.
- approval without explicit permission.
- approval by disabled user.
- self-approval where segregation applies.
- approval when evidence, calculation, review, or data quality gates are incomplete.

---

## 7. Evidence File Access Control

### 7.1 Evidence Storage Model

Evidence files are stored in object storage using this path convention:

```text
/evidence/{asset_tag}/{inspection_id}/{evidence_code}/{filename}
```

AIM stores metadata, checksum, access controls, evidence linkage, lineage, and audit history in PostgreSQL.

### 7.2 Access Rules

Evidence access must be authorized through AIM backend APIs. The frontend must not access object storage directly using permanent public URLs.

Required controls:

- Evidence object buckets must not be public.
- Download/preview should use short-lived signed URLs generated by AIM backend.
- Signed URL generation must check `evidence.read` and object-level access conditions.
- Every download/preview should write an audit event where required by policy.
- Evidence linked to sensitive reports or decisions must preserve lineage and access records.

### 7.3 Evidence Access Levels

| Access Type | Required Permission | Notes |
|---|---|---|
| Metadata read | `evidence.read` | Reads database metadata only. |
| Preview thumbnail | `evidence.read` | Uses preview object if available. |
| Full file download | `evidence.read` plus module context | Must use signed URL. |
| Upload | `evidence.upload` | Requires metadata validation. |
| Link to record | `evidence.link` | Required for findings/NDT/calculation/report. |
| Metadata correction | `evidence.update_metadata` | Requires correction reason. |
| Delete request | `evidence.delete_request` | Soft delete request only. |
| Delete approval | `evidence.delete_approve` | Controlled approval. |

### 7.4 Evidence Deletion Restriction

Evidence must not be hard-deleted if linked to:

- inspection findings
- NDT measurements
- calculation inputs/outputs
- integrity decisions
- issued reports
- work orders
- audit records

Allowed deletion behavior is restricted to soft-delete, retention hold, or superseded version marking, subject to approval.

---

## 8. File Upload Security

### 8.1 Allowed Extensions

Allowed evidence file extensions:

- `.pdf`
- `.xlsx`
- `.csv`
- `.jpg`
- `.jpeg`
- `.png`
- `.dwg`
- `.dxf`
- `.stl`
- `.zip`

Extensions must be case-insensitive but normalized to lowercase in stored metadata.

### 8.2 MIME Validation

Backend must validate MIME type and compare it with the file extension.

| Extension | Expected MIME Examples |
|---|---|
| `.pdf` | `application/pdf` |
| `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `.csv` | `text/csv`, `application/csv` |
| `.jpg`, `.jpeg` | `image/jpeg` |
| `.png` | `image/png` |
| `.dwg` | `application/acad`, `application/x-acad`, `image/vnd.dwg`, vendor-specific fallback |
| `.dxf` | `image/vnd.dxf`, `application/dxf`, vendor-specific fallback |
| `.stl` | `model/stl`, `application/sla`, `application/vnd.ms-pki.stl`, vendor-specific fallback |
| `.zip` | `application/zip`, `application/x-zip-compressed` |

MIME validation must not rely only on client-provided headers. Server-side file signature detection is required where feasible.

### 8.3 Maximum File Size

Recommended MVP file size limits:

| File Type | Max Size |
|---|---:|
| PDF | 100 MB |
| XLSX | 50 MB |
| CSV | 50 MB |
| JPG/PNG | 25 MB |
| DWG/DXF/STL | 250 MB |
| ZIP | 500 MB |

The maximum size must be configurable through `system_settings`.

### 8.4 Malware Scanning Placeholder

MVP must include a malware scanning placeholder even if actual scanning is not implemented yet.

Minimum behavior:

1. Uploaded file receives status `pending_scan`.
2. Backend creates evidence metadata record.
3. File is not available for full download until scan state is `clean` or explicitly bypassed by IT Admin policy.
4. Scan result values:
   - `pending_scan`
   - `clean`
   - `infected`
   - `scan_failed`
   - `scan_bypassed`
5. Scan failure or infected result creates an error log and security audit event.

### 8.5 Upload Validation Flow

1. Validate authenticated user and `evidence.upload` permission.
2. Validate asset and inspection references.
3. Validate required evidence metadata.
4. Validate extension.
5. Validate MIME/signature.
6. Validate file size.
7. Compute checksum.
8. Check duplicate checksum for same asset/inspection where applicable.
9. Store object in object storage.
10. Store metadata in AIM PostgreSQL.
11. Create `evidence.uploaded` audit event.
12. Post workflow event if n8n orchestration is involved.

---

## 9. API Security

### 9.1 HTTPS Requirement

All deployed API traffic must use HTTPS. Non-HTTPS traffic must be blocked or redirected at the ingress/load balancer level.

### 9.2 CORS

CORS must be restrictive.

Minimum rules:

- Allow only known frontend origins.
- Do not use wildcard origin in production.
- Allow only required methods.
- Allow only required headers.
- Credentials allowed only when using secure cookie/session design.

Example allowed methods:

```text
GET, POST, PUT, PATCH, DELETE, OPTIONS
```

Example allowed headers:

```text
Authorization, Content-Type, X-Correlation-ID, X-Request-ID
```

### 9.3 Rate Limiting Placeholder

MVP must include rate limiting configuration placeholders for:

| Endpoint Category | Recommended Baseline |
|---|---|
| Login | Strict rate limit per IP and account. |
| Token refresh | Moderate rate limit. |
| File upload | Size and frequency limit. |
| Approval endpoints | Low frequency limit and anomaly alert. |
| Report generation | Queue or rate limit. |
| n8n workflow events | Per integration credential limit. |
| Error log creation | Burst control to avoid log flooding. |

### 9.4 Request Validation

All API requests must validate:

- JSON schema shape.
- Required fields.
- Data types.
- Allowed enum values.
- String length.
- Date format.
- Numeric range.
- Foreign key existence.
- Permission and workflow status preconditions.

Invalid requests must return a consistent error response.

### 9.5 Error Response Hygiene

API error responses must not expose:

- stack traces
- SQL queries
- database table internals beyond public error codes
- secrets or tokens
- object storage keys where not required
- local file paths
- internal IP addresses or hostnames
- third-party credentials
- AI provider raw error details where sensitive

Recommended error format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [
      {
        "field": "asset_tag",
        "reason": "Required field is missing."
      }
    ],
    "correlation_id": "corr_20260611_001"
  }
}
```

### 9.6 Correlation IDs

All API requests should include or generate:

- `X-Correlation-ID`
- `X-Request-ID`

These identifiers must be written to audit logs, error logs, workflow events, and application logs.

---

## 10. Secrets Management

### 10.1 Secret Storage

Secrets must not be committed to repository files, frontend code, OpenAPI examples, payload examples, or documentation.

Secrets include:

- database passwords
- JWT signing secrets/private keys
- object storage access keys
- n8n credentials
- AI provider API keys
- SMTP credentials
- webhook secrets
- encryption keys
- password pepper

### 10.2 Required Secret Handling

| Control | Requirement |
|---|---|
| Local development | `.env` file excluded by `.gitignore`. |
| Staging/production | Use secret manager or protected deployment variables. |
| Rotation | Define rotation procedure for leaked/expired credentials. |
| Access | Least privilege per service. |
| Logging | Never log secrets. |
| Frontend exposure | Never expose backend secrets in frontend bundles. |

### 10.3 n8n Credentials

n8n must authenticate to AIM using a dedicated integration credential with limited permissions, such as:

- `workflow_event.create`
- `error_log.create`
- selected orchestration trigger permissions only

n8n must not use Admin credentials.

### 10.4 Webhook Secrets

Inbound workflow/webhook calls must use one or more of:

- signed webhook secret
- API token scoped to workflow event creation
- IP allowlist where practical
- timestamp and replay protection where practical

---

## 11. Audit Log Requirement

### 11.1 Audit Principles

Audit logs must be immutable from the application user interface. Corrections must be appended, not overwritten.

Audit logs must capture:

- who performed the action
- what action was performed
- when it happened
- which entity was affected
- prior status/value where applicable
- new status/value where applicable
- reason/comment where required
- source application or workflow
- IP/user agent where available
- correlation ID

### 11.2 Required Audit Fields

Recommended fields for `audit_logs`:

| Field | Description |
|---|---|
| `audit_id` | Unique audit identifier. |
| `event_type` | Controlled event enum. |
| `entity_type` | Example: `asset`, `evidence_file`, `calculation_run`. |
| `entity_id` | Target record identifier. |
| `actor_user_id` | User who performed action. |
| `actor_role` | Role context at time of action. |
| `source_system` | `AIM`, `n8n`, `AI_PROVIDER`, `SYSTEM`. |
| `prior_value` | Redacted JSON where applicable. |
| `new_value` | Redacted JSON where applicable. |
| `reason` | Required for rejection/correction/deletion. |
| `correlation_id` | Cross-system trace ID. |
| `ip_address` | Where available. |
| `user_agent` | Where available. |
| `created_at` | Server timestamp. |

### 11.3 Mandatory Audit Coverage

Audit logs are mandatory for:

- authentication events
- role/permission changes
- evidence upload, link, metadata update, delete request, delete approval
- AI extraction review and correction
- staging promotion
- manual overrides
- NDT correction/approval
- calculation run, review, approval, rejection
- integrity decision creation, approval, rejection
- report generation, approval, issue, rejection
- work order creation, update, close
- workflow event creation
- error log creation/resolution
- security exceptions

---

## 12. Security Testing Checklist

### 12.1 Authentication Tests

- [ ] Valid login succeeds.
- [ ] Invalid password fails with generic error.
- [ ] Disabled user cannot login.
- [ ] Locked user cannot login.
- [ ] Password hash is not exposed in any API response.
- [ ] Password reset token is single-use and time-limited.
- [ ] Logout invalidates refresh/session credential.
- [ ] Password change invalidates prior refresh/session credential.

### 12.2 JWT / Session Tests

- [ ] Expired access token is rejected.
- [ ] Invalid signature token is rejected.
- [ ] Token for disabled user is rejected.
- [ ] Role change takes effect without requiring unsafe stale permission trust.
- [ ] Refresh token reuse/replay is detected or safely handled.

### 12.3 RBAC Tests

- [ ] User without permission cannot access module.
- [ ] User with read-only permission cannot perform write action.
- [ ] Inspector cannot approve calculation.
- [ ] Engineer cannot issue report unless explicitly granted.
- [ ] Management cannot modify engineering records.
- [ ] n8n credential cannot approve or directly mutate final engineering data.
- [ ] IT Admin cannot bypass engineering approval without explicit business role.

### 12.4 Approval Protection Tests

- [ ] Approval endpoint requires authentication.
- [ ] Approval endpoint requires explicit permission.
- [ ] Self-approval is blocked where segregation applies.
- [ ] Approval is blocked when evidence is missing.
- [ ] Report issue is blocked when calculation approval is missing.
- [ ] Approval rejection requires reason/comment.
- [ ] Approval action writes audit event.

### 12.5 Evidence Access Tests

- [ ] Evidence bucket is not publicly accessible.
- [ ] Evidence download requires AIM authorization.
- [ ] Signed URL expires.
- [ ] Unauthorized user cannot preview/download evidence.
- [ ] Evidence metadata correction requires reason.
- [ ] Linked evidence cannot be hard-deleted.
- [ ] Evidence deletion requires approval.
- [ ] Evidence access writes audit event where required.

### 12.6 File Upload Tests

- [ ] Allowed extension accepted.
- [ ] Disallowed extension rejected.
- [ ] MIME mismatch rejected.
- [ ] Oversized file rejected.
- [ ] Required metadata missing rejected.
- [ ] Duplicate checksum warning or block applied according to policy.
- [ ] Malware scan placeholder status created.
- [ ] Infected/scan_failed status blocks download or triggers configured policy.

### 12.7 API Security Tests

- [ ] CORS allows only approved origins.
- [ ] Wildcard CORS is disabled in production.
- [ ] Rate limiting placeholder/config exists.
- [ ] Request schema validation blocks malformed input.
- [ ] Error response does not expose stack traces or SQL.
- [ ] Correlation ID appears in response, logs, audit, and workflow events.

### 12.8 Audit Tests

- [ ] Every controlled write creates audit log.
- [ ] Audit log cannot be edited through normal application UI.
- [ ] Audit log captures actor, role, entity, event type, timestamp, and correlation ID.
- [ ] Correction/rejection/deletion captures reason.
- [ ] n8n workflow event and failure logs are traceable.

### 12.9 Secrets Tests

- [ ] No `.env` committed.
- [ ] No secrets in frontend bundle.
- [ ] No secrets in logs.
- [ ] No secrets in OpenAPI/payload examples.
- [ ] n8n credentials are scoped and not Admin-level.
- [ ] Rotation procedure documented.

---

## 13. Minimum Go-Live Security Checklist

The AIM MVP must not go live until the following minimum controls are complete.

### 13.1 Identity and Access

- [ ] Authentication implemented through AIM backend.
- [ ] Passwords hashed with Argon2id or approved fallback.
- [ ] JWT/session policy implemented with short-lived access.
- [ ] Refresh/session invalidation implemented.
- [ ] RBAC permissions seeded.
- [ ] Admin, Inspector, Engineer, Lead Engineer, Approver, Management, and IT Admin roles configured.
- [ ] Permission checks enforced on all protected endpoints.
- [ ] Approval endpoints protected by explicit permissions and segregation checks.

### 13.2 Evidence Security

- [ ] Object storage bucket is private.
- [ ] Evidence metadata stored in AIM PostgreSQL.
- [ ] Evidence files accessed using signed URLs.
- [ ] Upload extension validation implemented.
- [ ] MIME validation implemented.
- [ ] Max file size validation implemented.
- [ ] Checksum generated and stored.
- [ ] Malware scanning placeholder implemented.
- [ ] Evidence deletion restricted and approval-based.

### 13.3 API and Backend Security

- [ ] HTTPS enforced.
- [ ] CORS restricted to approved origins.
- [ ] Request validation implemented.
- [ ] Error response hygiene implemented.
- [ ] Rate limiting placeholder/config implemented.
- [ ] Correlation ID propagation implemented.
- [ ] Secrets stored outside code repository.
- [ ] n8n uses scoped integration credentials only.

### 13.4 Audit and Compliance

- [ ] Audit logs generated for all approval, rejection, correction, calculation, report issue, and work order actions.
- [ ] Workflow events posted for all n8n workflows.
- [ ] Error logs created for every workflow failure.
- [ ] Audit log viewer restricted by role.
- [ ] Manual overrides require reason.
- [ ] AI output cannot bypass staging/review.
- [ ] n8n cannot write directly to PostgreSQL.

### 13.5 Engineering Governance

- [ ] Calculation engine uses approved formula registry only.
- [ ] No proprietary standard formulas are invented or reproduced.
- [ ] Calculations are deterministic, versioned, testable, and auditable.
- [ ] Reports cannot be issued unless required data, evidence, calculation, review, and approval gates are complete.
- [ ] Internal work order fallback is available before external CMMS integration.

---

## 14. Delivery Notes

### What Changed

This document establishes the minimum security baseline for the AIM+n8n MVP, including authentication, password hashing, JWT/session handling, RBAC, module permissions, approval protection, evidence access, file upload controls, API security, secrets management, audit requirements, testing checklist, and go-live checklist.

### AIM / n8n Boundary Confirmation

- AIM remains the system of record.
- PostgreSQL stores final structured engineering data.
- Object storage stores original evidence files.
- n8n is workflow orchestration only.
- n8n must call AIM backend APIs only.
- n8n must post workflow events to `/api/workflow-events`.
- Every n8n failure must create an error log through `/api/error-logs`.
- n8n must not write directly to PostgreSQL.
- AI extraction must not approve engineering data or issue final decisions.

### Suggested Run / Test Commands

```bash
npm run lint
npm run typecheck
npm run test:auth
npm run test:rbac
npm run test:approval-gates
npm run test:evidence-security
npm run test:file-upload
npm run test:api-security
npm run test:audit
npm run test:workflow
```

Alternative backend/security test examples:

```bash
pytest tests/security/test_auth.py
pytest tests/security/test_rbac.py
pytest tests/security/test_approval_gates.py
pytest tests/security/test_evidence_access.py
pytest tests/security/test_file_upload.py
pytest tests/security/test_audit_logs.py
```

### Documentation Updates

When behavior changes, update:

- `04_API/openapi.yaml` for auth, permission, and error schemas.
- `03_Database/data_dictionary.md` for user, role, permission, evidence, audit, and security metadata fields.
- `08_Frontend/page_specs.md` for permission visibility and error states.
- `05_n8n/n8n_workflow_catalog.md` for workflow credential and event behavior.
- `06_Evidence/evidence_governance.md` for evidence security and retention rules.
