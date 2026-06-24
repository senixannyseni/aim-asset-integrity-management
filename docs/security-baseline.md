# AIM Tank Integrity Security Baseline

Status: Sprint 7 governance and security hardening baseline.

## Current local-development authentication

Demo header authentication is local-development only.

The current sprint implementation accepts temporary headers such as:

- `x-aim-demo-roles`
- `x-aim-demo-user-id`
- `x-aim-demo-email`

These headers are a local development shim for rapid sprint validation. They must not be used for UAT, production-like testing, or production deployments.

## Required future authentication model

Before UAT/release candidate, AIM must replace demo headers with verified authentication and authorization:

- JWT/session-based authentication issued by a trusted identity provider or AIM auth service.
- Server-side user identity validation.
- DB-backed role and permission resolution using `users`, `roles`, `permissions`, `user_roles`, and `role_permissions`.
- Tenant/org scoping if multi-tenant deployment is enabled.
- Explicit audit logging for authentication-sensitive approval actions.

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

Evidence files must remain traceable through `evidence_files` and `evidence_links`. Before production use, object storage access must include:

- signed URL generation for read/open actions;
- signed URL TTL configuration;
- upload size limits;
- malware scanning or quarantine workflow;
- checksum verification;
- storage path isolation by asset/inspection/evidence code;
- audit logs for upload, link, open, metadata update, and deletion approval.

## Error handling baseline

API error responses must avoid exposing raw internal error messages in production mode. Detailed stack traces and raw error messages are allowed only in local development/test environments.

## n8n boundary

n8n must call AIM APIs only. n8n must not write directly to PostgreSQL or mutate final AIM system-of-record tables outside approved APIs.


## Evidence linkage boundary

Evidence links must not cross asset boundaries for implemented asset-owned entities. The API must validate that `evidence_files.asset_id` matches the linked entity asset before creating links to asset, inspection event, NDT measurement, calculation run, FFS case, or RBI case records.

Critical NDT approval may use direct or linked evidence only when the evidence belongs to the same asset as the NDT measurement. Cross-asset evidence must be rejected with `CROSS_ASSET_EVIDENCE_LINK_BLOCKED`.

FFS and RBI routes must preserve same-asset evidence validation and maintain calculation run, source entity, and evidence traceability for cases created from calculation warnings.

## OpenAPI route scope

Health and RBAC demo endpoints are local-development/internal readiness routes. They are intentionally excluded from the production engineering workflow OpenAPI contract and are documented through the `x-internal-routes-excluded` extension.


## Sprint 9 Engineering Review and Approval Workflow

Implemented governance workflow for engineering reviews and senior engineer approval records. Review statuses are draft, submitted_for_review, returned_for_revision, reviewed, submitted_for_approval, approved, rejected, and locked. Engineer roles may review data and calculation results; senior_engineer/admin approval is required for final approval, rejection, override approval, and locking. AI agents cannot approve, reject, override, or finalize engineering decisions. Locked calculation/review/approval records are immutable; revisions must be created as new records.

Implemented tables/fields include engineering_reviews and approval_records extensions for calculation_run_id, asset_id, checklist_json, comments_json, override_json, reason, affected_field, original_value_json, override_value_json, evidence_links, revision_no, approval_status/review_status, approver/reviewer metadata, timestamps, locked_flag, and audit trail linkage.

Implemented APIs include GET/POST /api/v1/engineering/reviews, GET/PATCH/COMMENT /api/v1/engineering/reviews/{reviewId}, GET/POST /api/v1/approval-records, POST /api/v1/approval-records/{approvalId}/approve, POST /api/v1/approval-records/{approvalId}/reject, and GET /api/v1/engineering/calculations/{runId} for full calculation audit detail.

No API/API-ASME formulas, full API 579/API 581 quantitative calculation, external CMMS integration, or 3D processing are implemented. Current MVP includes AI extraction/staging, report generation/issue gates, and internal AIM work order fallback while AIM remains the system of record and n8n remains API-only orchestration.


## Sprint 10 Report Generation Security Notes

Generated DOCX/PDF payloads use object-storage compatible paths. Production deployments must upload these artifacts to controlled object storage, serve them via signed URLs, scan generated outputs for malware, and restrict report approval/issue to verified senior engineer/admin identities. Demo-header auth remains local-development only.


## UAT Cycle 1 Release Hardening

Integrity decision approval requires direct evidence linkage. Report issue requires per-entity evidence links to the report, calculation run, and approved integrity decision. Prior `REPORT_ISSUE_GATE_BLOCKED` logs remain auditable and are resolved after successful issue. AI and n8n/service users remain blocked from final approvals and report issue.

## RC2 Frontend Auth Hardening Addendum

Frontend API calls must use JWT bearer tokens by default. The supported login token path is `data.accessToken` from `/api/v1/auth/login`. The frontend demo headers `x-aim-demo-roles` and `x-aim-demo-email` are disabled unless `NEXT_PUBLIC_AIM_DEMO_HEADERS_ENABLED=true` is explicitly set for local development.

UAT/prod-like validation must not rely on demo headers. AI agents, n8n/service users, and other non-human actors must not approve or finalize engineering data, calculations, integrity decisions, issued reports, or work orders. n8n remains orchestration-only and must not write final engineering data directly to PostgreSQL.
