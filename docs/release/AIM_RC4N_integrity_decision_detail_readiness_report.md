# AIM RC4-N Integrity Decision Detail and Decision Readiness Report

## Scope

RC4-N adds product-facing integrity decision detail and read-only decision-readiness visibility after RC4-M.

Implemented controls:

- `/integrity-decisions/[decisionId]` now renders a usable detail workflow instead of raw JSON only.
- `GET /api/v1/integrity-decisions/{decisionId}/readiness` provides a read-only readiness preview.
- Readiness gates cover approved calculation linkage, calculation review, direct decision evidence, human review/approval traceability, decision approval, source traceability, and AI/n8n finalization boundaries.
- Detail page displays linked evidence, decision readiness gates, source/downstream traceability, and audit timeline.
- Detail page supports permission-aware direct evidence linking and senior-human approval actions while backend RBAC remains authoritative.

## Explicit exclusions

RC4-N does not add formulas, API 579/API 581 quantitative logic, report issue automation, work-order creation automation, AI/n8n finalization, object-storage changes, schema migrations, or direct n8n/database access.

## Governance note

The readiness endpoint does not insert, update, approve, issue, close, promote, or finalize records. It is a visibility layer only. Existing approval, report, work-order, and evidence-link endpoints remain authoritative.
