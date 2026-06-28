# RC4-N Integrity Decision Detail and Decision Readiness UAT

## Objective

Confirm that integrity decisions are operationally readable and traceable before report or work-order downstream use.

## Test cases

1. Open `/integrity-decisions` and verify each decision row links to `/integrity-decisions/[decisionId]`.
2. Open a decision detail page and verify status, readiness cards, readiness gates, linked evidence, decision traceability, and audit timeline render without raw JSON-only UX.
3. Call `GET /api/v1/integrity-decisions/{decisionId}/readiness` and verify it returns `ready_for_downstream_use`, `blocking_gates`, `linked_evidence`, `linked_context`, and `audit_events`.
4. Verify the readiness endpoint is read-only: it must not approve a decision, write audit logs, issue reports, create work orders, or mutate evidence.
5. Verify missing direct evidence is shown as the `direct_evidence_linked` gate and the existing approval endpoint still blocks with `INTEGRITY_DECISION_EVIDENCE_REQUIRED`.
6. Verify only users with `integrity_decision.approve` can use the detail approval button; backend still blocks AI agents and non-senior roles.
7. Verify direct evidence linking requires `evidence.link` and uses `linked_entity_type = integrity_decision`.

## Acceptance criteria

- Decision detail page is no longer raw JSON-only.
- Readiness preview is visible and read-only.
- Backend approval remains authoritative.
- AI/n8n/service actors cannot approve or finalize integrity decisions.
- No formula, object-storage, report issue, work-order closure, or schema behavior is changed.
