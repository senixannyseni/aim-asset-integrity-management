# RC3 UAT Master Execution Index

## Purpose

This master index is the final RC3 execution control for UAT. It ties each scoped RC3 package to the UAT evidence expected before release-candidate acceptance and preserves the AIM governance boundary: AIM is the system of record, n8n is API-only orchestration, AI output is staging-only until reviewed, evidence linkage is mandatory, and audit logs remain immutable/read-only.

## Execution Control

| RC3 Package | UAT Script / Evidence | Minimum Acceptance Evidence | Status |
|---|---|---|---|
| RC3-B object storage UAT | `docs/uat/uat_rc3_object_storage_scripts.md` | Evidence object-storage upload/download and report artifact export verified with metadata, checksum, object key, audit, and gate linkage. | Ready for execution |
| RC3-C AI staging promotion UAT | `docs/uat/uat_rc3_ai_staging_promotion_scripts.md` | AI extraction enters staging, engineer review/correct/reject is enforced, promotion requires human review and evidence linkage. | Ready for execution |
| RC3-D audit log visibility UAT | `docs/uat/uat_rc3_audit_log_governance_visibility_scripts.md` | Audit log list/detail are RBAC-controlled and read-only with sensitive metadata redaction. | Ready for execution |
| RC3-E admin governance UAT | `docs/uat/uat_rc3_admin_governance_console_scripts.md` | Admin user/role/permission/settings visibility and safe allowlisted changes are controlled, reasoned, and audited. | Ready for execution |
| RC3-F governance dashboard UAT | `docs/uat/uat_rc3_governance_dashboard_readiness_scripts.md` | Read-only governance dashboard summarizes evidence, AI review, promotion, report, audit/governance, work order, and readiness categories. | Ready for execution |
| RC3-G n8n workflow console UAT | `docs/uat/uat_rc3_n8n_workflow_console_scripts.md` | Read-only workflow console shows tasks, pending follow-ups, notifications, failures/errors, recent workflow events, and API-only n8n boundary reminders. | Ready for execution |
| RC3-H NDT data room UAT | `docs/uat/uat_rc3_ndt_data_room_visualization_scripts.md` | Read-only NDT method/component/CML/TML/Grid/evidence-linkage readiness visualization is available without FFS/RBI/API 579/API 581 calculation implementation. | Ready for execution |
| RC3-I hypercare/go-live readiness UAT | `docs/uat/uat_rc3_hypercare_golive_readiness_scripts.md` | Read-only go-live readiness dashboard summarizes evidence, AI review, staging, calculation/review, report gate, NDT, workflow/notification, audit/admin, and UAT documentation readiness. | Ready for execution |

## Final End-to-End UAT Scenario

The final end-to-end UAT scenario must be executed at least once using representative sample data and screenshots/log evidence:

1. Evidence upload is completed and object-storage metadata is verified.
2. AI staging job is triggered from verified evidence.
3. Engineer review is performed for extracted fields, including at least one correction or rejection when applicable.
4. Promotion is performed only after required review and evidence gates pass.
5. Calculation/review gate is checked using approved deterministic formula/version controls only.
6. Report issue gate is checked and either blocked with clear reason or allowed only when evidence, data, calculation, review, approval, SoD, and workflow/error gates pass.
7. Work order follow-up is created or verified through the internal AIM fallback path where the decision requires action.
8. Audit trail is inspected for evidence upload, AI review, manual override if applicable, promotion, gate checks, report issue/block, and work order events.
9. Dashboard/readiness visibility is verified across `/dashboard`, `/workflow-console`, `/ndt-data-room`, and `/golive-readiness`.

Canonical path:

```text
evidence upload → AI staging → engineer review → promotion → calculation/review gate → report issue gate → work order follow-up → audit trail → dashboard/readiness visibility
```

## Required Go/No-Go UAT Evidence

- All RC3-B through RC3-I UAT scripts are executed or explicitly waived with owner approval.
- All blocker defects are resolved or accepted with written risk owner approval.
- No AI/n8n/service actor approval or final engineering decision path is observed.
- No direct n8n PostgreSQL write path is observed.
- No API 579/API 581/FFS/RBI calculation implementation is introduced by RC3-J.
- Release candidate closure checklist is signed by Product Owner, Lead Engineer, IT Admin, and Operations/Hypercare Owner.
