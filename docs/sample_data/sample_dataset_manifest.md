# AIM Phase 2.0 Sample Dataset Manifest

**Purpose:** Define a synthetic-only dataset for UAT, deployment rehearsal, and training.  
**Scope:** Manifest only. This file does not insert data and does not bypass AIM governance gates.  
**Classification:** UAT / sample / synthetic only.

## 0. Synthetic Data Warning

This dataset must not contain:

- real client names,
- real asset owner data,
- real inspection reports,
- real evidence files,
- production credentials,
- object storage secrets,
- production object storage keys,
- confidential engineering data,
- proprietary API/ASME formulas.

All emails use the reserved example domain `example.test`. All identifiers are deterministic UAT placeholders.

## 1. Dataset Principles

- AIM remains the system of record.
- The sample dataset must not claim that unreviewed AI output is final engineering data.
- Staging data must remain staging until engineer review and promotion gates pass.
- Evidence links must be present for promoted/calculation/report/decision/work-order paths.
- Calculation fixtures must use only existing approved MVP/test-fixture formula metadata already present in the repository.
- Internal work orders are AIM fallback records only; external CMMS/SAP/Maximo integration is out of scope.

## 2. Organization / Tenant Context

| Field | Value |
|---|---|
| organization_code | `AIM-UAT-ORG` |
| organization_name | `AIM UAT Synthetic Organization` |
| tenant_status | `active` |
| Notes | Use only if organization/tenant table exists. Otherwise use default/local organization context. |

## 3. UAT Users and Roles

| Role | Email | Display Name | Purpose |
|---|---|---|---|
| Admin | `admin.uat@example.test` | Admin UAT | User, role, and configuration workflows. |
| Inspector | `inspector.uat@example.test` | Inspector UAT | Inspection and evidence intake. |
| Engineer | `engineer.uat@example.test` | Engineer UAT | AI review, manual override, calculation run/review. |
| Lead Engineer | `lead.engineer.uat@example.test` | Lead Engineer UAT | Escalation, engineering review, calculation/integrity readiness. |
| Approver | `approver.uat@example.test` | Approver UAT | Report issue and formal approvals. |
| IT Admin | `it.admin.uat@example.test` | IT Admin UAT | Deployment, workflow events, error logs, audit support. |
| Management | `management.uat@example.test` | Management UAT | Dashboard/read-only visibility. |
| ai_agent | `ai.agent.uat@example.test` | AI Agent UAT | Restricted AI service user; must not approve/promote/issue/finalize. |
| n8n_service | `n8n.service.uat@example.test` | n8n Service UAT | Restricted workflow service user; must not approve/promote/issue/finalize. |

## 4. Atmospheric Storage Tank Asset

| Field | Value |
|---|---|
| asset_tag | `AIM-UAT-T-001` |
| asset_name | `UAT Atmospheric Storage Tank 001` |
| asset_type | `atmospheric_storage_tank` |
| site_name | `UAT Tank Farm` |
| area | `UAT Area A` |
| service_fluid | `Synthetic Diesel Service` |
| asset_status | `active` |
| design_code_reference | `API 650` as high-level metadata only; do not reproduce clauses. |
| material | `UAT Material Placeholder` |
| Notes | Use only as synthetic metadata for workflow validation. |

## 5. Inspection Record

| Field | Value |
|---|---|
| inspection_code | `AIM-UAT-INS-001` |
| asset_tag | `AIM-UAT-T-001` |
| inspection_type | `UT_thickness` |
| inspection_status | `engineering_review` |
| inspection_start_date | `2026-01-10` |
| inspection_end_date | `2026-01-12` |
| lead_inspector | `inspector.uat@example.test` |
| assigned_engineer | `engineer.uat@example.test` |

## 6. Evidence Metadata Placeholders

No actual files are included by this manifest. Use small dummy files in local/UAT object storage only.

| Evidence Code | Placeholder File Name | File Type | MIME | Intended Link |
|---|---|---|---|---|
| `EVD-UAT-001` | `AIM-UAT-T-001_INS-001_INSPECTION_REPORT.pdf` | `.pdf` | `application/pdf` | extraction source, report attachment |
| `EVD-UAT-002` | `AIM-UAT-T-001_INS-001_UT_READINGS.csv` | `.csv` | `text/csv` | NDT source, calculation input |
| `EVD-UAT-003` | `AIM-UAT-T-001_INS-001_PHOTO_SHELL.png` | `.png` | `image/png` | finding/decision support |
| `EVD-UAT-004` | `AIM-UAT-T-001_INS-001_WORK_ORDER_CLOSE.jpg` | `.jpg` | `image/jpeg` | work order closure support |

Required metadata fields:

- `asset_id`
- `inspection_id`
- `method`
- `component`
- `inspection_date`
- `source_file_name`
- `file_type`
- `mime_type`
- `file_size_bytes`
- `checksum`
- `storage_uri`
- `malware_scan_status` placeholder value such as `pending`, `not_configured`, or `passed` depending on implementation.

## 7. Evidence Links

| Evidence Link Code | Evidence Code | Entity Type | Link Type | Purpose |
|---|---|---|---|---|
| `EVL-UAT-001` | `EVD-UAT-001` | `extraction_job` | `extraction_source` | AI extraction source. |
| `EVL-UAT-002` | `EVD-UAT-002` | `calculation_input` | `calculation_input` | Calculation input evidence. |
| `EVL-UAT-003` | `EVD-UAT-001` | `report` | `report_attachment` | Report issue gate. |
| `EVL-UAT-004` | `EVD-UAT-003` | `integrity_decision` | `integrity_decision_support` | Decision support. |
| `EVL-UAT-005` | `EVD-UAT-004` | `internal_work_order` | `audit_support` | Work order closure evidence. |

## 8. Extraction Job and Fields

| Field | Value |
|---|---|
| extraction_job_code | `EXJ-UAT-001` |
| inspection_code | `AIM-UAT-INS-001` |
| source_evidence | `EVD-UAT-001` |
| job_status | `requires_manual_review` |
| staging_only_flag | `true` |

### Extraction Fields

| Field Key | AI Value | Confidence | Field Status | Validation Flags | Review Scenario |
|---|---:|---:|---|---|---|
| `asset_tag` | `AIM-UAT-T-001` | 0.98 | `ai_extracted` | `[]` | High confidence; still requires human promotion. |
| `shell_course_1_current_thickness_mm` | 7.20 | 0.72 | `needs_review` | `["LOW_CONFIDENCE"]` | Engineer must verify. |
| `shell_course_1_previous_thickness_mm` | null | null | `invalid` | `["REQUIRED_FIELD_MISSING"]` | Blocks promotion/calculation until corrected. |
| `shell_course_1_unit` | `inch` | 0.82 | `needs_review` | `["UNIT_MISMATCH"]` | Must be resolved before final use. |
| `report_number` | `RPT-UAT-001` | 0.91 | `ai_extracted` | `[]` | Duplicate check required if existing. |
| `field_missing_source` | 8.00 | 0.88 | `invalid` | `["MISSING_EVIDENCE_REFERENCE"]` | Blocks promotion. |

## 9. Staging Record

| Field | Value |
|---|---|
| staging_record_code | `STG-UAT-001` |
| target_table_name | `thickness_readings` or equivalent current target. |
| review_status | `pending_review` |
| promotion_status | `blocked_until_review_and_evidence` |
| required_action | Engineer review and evidence linkage completion. |

## 10. Manual Override Example

The sample correction is represented by the `manual_overrides` entity and must require a correction reason, original value, corrected value, reviewer identity, timestamp, and evidence reference.

| Field | Value |
|---|---|
| override_code | `OVR-UAT-001` |
| staging_record_code | `STG-UAT-001` |
| field_key | `shell_course_1_current_thickness_mm` |
| original_value | `7.20` |
| corrected_value | `7.80` |
| reason_code | `evidence_table_value` |
| evidence_link | `EVL-UAT-002` |
| reviewer | `engineer.uat@example.test` |
| Expected audit | `manual_override.created` |

## 11. Data Quality Check Example

| Field | Value |
|---|---|
| quality_check_code | `DQC-UAT-001` |
| check_type | `UNIT_MISMATCH` |
| check_status | `failed` |
| severity | `high` |
| target | `shell_course_1_unit` |
| blocking | `true` |

## 12. Formula Version Fixture Reference

| Field | Value |
|---|---|
| formula_code | Existing MVP corrosion-rate/remaining-life fixture from repository formula registry. |
| version_no | Existing approved fixture version only. |
| status | `approved` |
| Scope | UAT calculation only; no API/ASME formula expansion. |
| Disclaimer | `Engineering review required before final use.` |

## 13. Calculation Validation Case References

The UAT should reference the validation workbook/test cases already represented in Phase 1 tests:

1. Normal corrosion rate.
2. Thickness below minimum.
3. Zero corrosion rate.
4. Negative corrosion rate.
5. Missing previous thickness.
6. Missing evidence.
7. Remaining life below threshold.
8. Unit mismatch warning.

## 14. Calculation Run Sample Preconditions

| Field | Value |
|---|---|
| calculation_run_code | `CALC-UAT-001` |
| formula_version | explicit approved MVP/test fixture version |
| asset_tag | `AIM-UAT-T-001` |
| inspection_code | `AIM-UAT-INS-001` |
| input_evidence_link | `EVL-UAT-002` |
| run_status | `completed_pending_review` or equivalent |
| review_status | `pending_review` |
| final_use_status | blocked until reviewed/approved |

## 15. Integrity Decision Sample

| Field | Value |
|---|---|
| decision_code | `DEC-UAT-001` |
| asset_tag | `AIM-UAT-T-001` |
| inspection_code | `AIM-UAT-INS-001` |
| calculation_run_code | `CALC-UAT-001` |
| decision_status | `draft` then `approved` after human approval |
| evidence_link | `EVL-UAT-004` |
| required_comment | yes |

## 16. Report Lifecycle Sample

| Field | Value |
|---|---|
| report_code | `RPT-UAT-001` |
| report_status | `draft` -> `approved` -> `issued` only after gates pass |
| required_gate_tokens | `required_data_complete`, `evidence_linked`, `calculation_completed`, `calculation_reviewed`, `calculation_approved`, `integrity_decision_created`, `integrity_decision_approved`, `report_approved`, `workflow_errors_resolved`, `approver_comment_present` |
| blocked_tokens | `REPORT_ISSUE_COMMENT_REQUIRED`, `REPORT_ISSUE_BLOCKED`, `REPORT_GATES_NOT_SATISFIED` |
| evidence_link | `EVL-UAT-003` |

## 17. Internal Work Order Sample

| Field | Value |
|---|---|
| work_order_code | `WO-UAT-001` |
| source | approved decision or issued report |
| asset_tag | `AIM-UAT-T-001` |
| inspection_code | `AIM-UAT-INS-001` |
| work_order_status | `open` -> `in_progress` -> `closed` |
| external_cmms_reference | null |
| closure_note | required |
| closure_evidence_link | `EVL-UAT-005` when required |

## 18. Workflow Event and Error Log Samples

| Sample | Value |
|---|---|
| workflow_event_code | `WFE-UAT-001` |
| workflow_id | `WF-001` or `WF-002` |
| source_system | `n8n` |
| status | `started`, `succeeded`, `failed` |
| error_log_code | `ERR-UAT-001` |
| error_code | `N8N_PAYLOAD_INVALID`, `N8N_AIM_API_TIMEOUT`, `AI-F-003`, or `REPORT_ISSUE_GATE_BLOCKED` |
| severity | `medium`, `high`, or `critical` based on scenario |

## 19. Optional SQL Seed Guidance

If `db/seeds/0002_uat_sample_data.sql` is created later, it must:

1. Be explicitly labeled UAT/sample only.
2. Be idempotent where practical.
3. Use only synthetic UUIDs and values.
4. Use `example.test` emails only.
5. Contain no secrets or production object storage paths.
6. Avoid bypassing review/gate logic.
7. Avoid external CMMS integration data beyond null/optional placeholder fields.
8. Not change schema.
9. Be run only in local/UAT databases, never production.

Phase 2.0 does not require SQL seed creation unless current migrations/seeds are verified locally and the project owner approves sample data insertion.
