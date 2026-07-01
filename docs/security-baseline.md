# AIM Tank Integrity Security Baseline

Status: RC3-A/RC3-B security baseline update. RC3-A hardening covers repository hygiene, environment alignment, root route handling, and production-safe RBAC demo route gating. RC3-B adds evidence object-storage upload/download and report export artifact object storage.

## Current authentication model

DB-backed JWT/RBAC is implemented for UAT/prod-like validation. Correct endpoints are `POST /api/v1/auth/login` and `GET /api/v1/auth/me`. Demo header authentication is local-development only.

The current sprint implementation accepts temporary headers such as:

- `x-aim-demo-roles`
- `x-aim-demo-user-id`
- `x-aim-demo-email`

These headers are a local development shim for rapid sprint validation. They must not be used for UAT, production-like testing, or production deployments. RC3-A gates demo routes and demo CORS headers so they are mounted only in local/development/test when `AUTH_ALLOW_LOCAL_DEMO=true`.

## Required production authentication model

AIM now uses JWT/session-style authentication issued by the AIM auth service for the MVP. Production hardening must continue to enforce:

- strong `AUTH_JWT_SECRET` in production-like environments;
- `AUTH_TOKEN_ISSUER` alignment across sign/verify paths;
- server-side user identity validation;
- DB-backed role and permission resolution using `users`, `roles`, `permissions`, `user_roles`, and `role_permissions`;
- tenant/org scoping if multi-tenant deployment is enabled;
- explicit audit logging for authentication-sensitive approval actions.

## AI governance

AI agents must never approve or finalize engineering decisions. The `ai_agent` role must not receive approval/finalization permissions for:

- NDT approval
- Formula approval
- Calculation approval
- FFS close/final disposition
- Report approval/issue
- Integrity decision approval
- Work-order closure

AI output, when implemented, must remain staging-only until human review and controlled promotion.

## Object storage security

Evidence files must remain traceable through `evidence_files` and `evidence_links`. RC3-B implements private object-storage upload/download through AIM-controlled signed URLs. Production use must include:

- signed URL generation for read/open actions;
- signed URL TTL configuration;
- upload size limits;
- malware scanning or quarantine workflow;
- checksum verification using declared SHA-256 values where provided, object metadata when available, and blocked completion when expected checksums cannot be verified;
- storage path isolation by asset/inspection/evidence code;
- audit logs for upload URL creation, upload completion, blocked access, signed URL issuance, link, open, metadata update, report export, report-export download URL, and deletion approval. Raw signed URL query strings must never be stored unredacted.

## Error handling baseline

API error responses must avoid exposing raw internal error messages in production mode. Detailed stack traces and raw error messages are allowed only in local development/test environments.

## n8n boundary

n8n must call AIM APIs only. n8n must not write directly to PostgreSQL or mutate final AIM system-of-record tables outside approved APIs.


## Evidence linkage boundary

Evidence links must not cross asset boundaries for implemented asset-owned entities. The API must validate that `evidence_files.asset_id` matches the linked entity asset before creating links to asset, inspection event, NDT measurement, calculation run, FFS case, or RBI case records.

Critical NDT approval may use direct or linked evidence only when the evidence belongs to the same asset as the NDT measurement. Cross-asset evidence must be rejected with `CROSS_ASSET_EVIDENCE_LINK_BLOCKED`.

FFS and RBI routes must preserve same-asset evidence validation and maintain calculation run, source entity, and evidence traceability for cases created from calculation warnings.

## OpenAPI route scope

Health endpoints are `GET /health` and `GET /health/db`. RBAC demo endpoints are local-development/internal readiness routes and are unavailable in production-like environments. They are intentionally excluded from the production engineering workflow OpenAPI contract and are documented through the `x-internal-routes-excluded` extension.


## Sprint 9 Engineering Review and Approval Workflow

Implemented governance workflow for engineering reviews and senior engineer approval records. Review statuses are draft, submitted_for_review, returned_for_revision, reviewed, submitted_for_approval, approved, rejected, and locked. Engineer roles may review data and calculation results; senior_engineer/admin approval is required for final approval, rejection, override approval, and locking. AI agents cannot approve, reject, override, or finalize engineering decisions. Locked calculation/review/approval records are immutable; revisions must be created as new records.

Implemented tables/fields include engineering_reviews and approval_records extensions for calculation_run_id, asset_id, checklist_json, comments_json, override_json, reason, affected_field, original_value_json, override_value_json, evidence_links, revision_no, approval_status/review_status, approver/reviewer metadata, timestamps, locked_flag, and audit trail linkage.

Implemented APIs include GET/POST /api/v1/engineering/reviews, GET/PATCH/COMMENT /api/v1/engineering/reviews/{reviewId}, GET/POST /api/v1/approval-records, POST /api/v1/approval-records/{approvalId}/approve, POST /api/v1/approval-records/{approvalId}/reject, and GET /api/v1/engineering/calculations/{runId} for full calculation audit detail.

No API/API-ASME formulas, full API 579/API 581 quantitative calculation, external CMMS integration, or 3D processing are implemented. Current MVP includes AI extraction/staging, report generation/issue gates, and internal AIM work order fallback while AIM remains the system of record and n8n remains API-only orchestration.


## Sprint 10 Report Generation Security Notes

Generated DOCX/PDF/JSON report export payloads are stored in controlled object storage by RC3-B. AIM stores report export metadata, content hashes, object keys, download status, and audit events in PostgreSQL. Downloads are served through audited short-lived signed URLs. Report approval/issue remains restricted to verified senior engineer/admin/approver identities. Demo-header auth remains local-development only.


## UAT Cycle 1 Release Hardening

Integrity decision approval requires direct evidence linkage. Report issue requires per-entity evidence links to the report, calculation run, and approved integrity decision. Prior `REPORT_ISSUE_GATE_BLOCKED` logs remain auditable and are resolved after successful issue. AI and n8n/service users remain blocked from final approvals and report issue.

## RC2 Frontend Auth Hardening Addendum

Frontend API calls must use JWT bearer tokens by default. The supported login token path is `data.accessToken` from `/api/v1/auth/login`. The frontend demo headers `x-aim-demo-roles` and `x-aim-demo-email` are disabled unless `NEXT_PUBLIC_AIM_DEV_HEADERS_ENABLED=true` is explicitly set for local development.

UAT/prod-like validation must not rely on demo headers. AI agents, n8n/service users, and other non-human actors must not approve or finalize engineering data, calculations, integrity decisions, issued reports, or work orders. n8n remains orchestration-only and must not write final engineering data directly to PostgreSQL.


## RC3-A environment and route hardening

The environment contract uses `AUTH_TOKEN_ISSUER`, `AUTH_ACCESS_TOKEN_TTL_SECONDS`, `AUTH_REFRESH_TOKEN_TTL_SECONDS`, `AUTH_ALLOW_LOCAL_DEMO`, `AUTH_LOCAL_DEMO_PASSWORD`, and `AUTH_REQUIRE_STRONG_SECRET_IN_PRODUCTION`. Obsolete documentation-only names such as `AUTH_JWT_ISSUER`, `AUTH_JWT_AUDIENCE`, and `AUTH_SESSION_COOKIE_NAME` must not be used unless code is explicitly updated to support them.

Object storage configuration is active for RC3-B with `OBJECT_STORAGE_ACCESS_KEY_ID`, `OBJECT_STORAGE_SECRET_ACCESS_KEY`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_REGION`, `OBJECT_STORAGE_FORCE_PATH_STYLE`, `OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS`, `EVIDENCE_MAX_FILE_SIZE_BYTES`, `EVIDENCE_ALLOWED_MIME_TYPES`, and `EVIDENCE_ALLOWED_EXTENSIONS`. Binary evidence upload/download and report export artifact storage are implemented through AIM APIs and object-storage signed URLs.
