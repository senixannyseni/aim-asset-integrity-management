# AIM+n8n Architecture Boundary

## AIM Responsibilities

- Source of truth for structured engineering data.
- Stores metadata, calculation records, reviews, approvals, audit logs, and report state.
- Exposes backend APIs for all state changes.

## PostgreSQL Responsibilities

- Final structured engineering records.
- Staging/extraction records.
- Formula registry and calculation run audit trail.
- RBAC, reviews, approvals, and audit logs.

## Object Storage Responsibilities

- Original evidence files.
- File previews and thumbnails when implemented.

## n8n Responsibilities

- Trigger, routing, reminder, notification, approval routing, integration orchestration, and audit event submission through AIM APIs.
- Must not store final engineering data.
- Must not write directly to PostgreSQL.
- Must not approve engineering records.

## AI Responsibilities

- Assist extraction and drafting only.
- Output to extraction/staging tables only.
- Must never approve engineering data, calculations, integrity decisions, or reports.
