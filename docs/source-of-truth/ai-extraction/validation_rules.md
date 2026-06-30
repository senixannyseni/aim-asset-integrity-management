# AI Extraction Validation Rules

## Pre-Implementation Governance Check

### Assumptions
- AIM is the system of record for extraction jobs, extracted fields, staging records, review decisions, manual overrides, and audit logs.
- n8n may trigger extraction and route review reminders, but n8n must call AIM backend APIs only.
- AI extraction extracts and structures data only.
- AI output is not final engineering data.
- AI output must be written only to `extraction_fields` and `staging_records`.
- Engineer review is mandatory before extracted values can be promoted into final engineering tables.

### Impacted Documents
- `01_PRD/AIM_MVP_PRD.md`
- `03_Database/data_dictionary.md`
- `04_API/openapi.yaml`
- `05_n8n/n8n_workflow_catalog.md`
- `06_Evidence/evidence_governance.md`
- `06_AI_Extraction/AI_Extraction_Control_Pack/*`

### Impacted Tables
- `extraction_jobs`
- `extraction_fields`
- `staging_records`
- `manual_overrides`
- `data_quality_checks`
- `evidence_files`
- `evidence_links`
- `audit_logs`
- `workflow_events`
- `error_logs`

### Impacted Endpoints
- `POST /api/extraction-jobs`
- `GET /api/extraction-jobs/{id}`
- `POST /api/extraction-fields/{id}/approve`
- `POST /api/extraction-fields/{id}/reject`
- `POST /api/staging-records/{id}/promote`
- `POST /api/evidence-links`
- `POST /api/workflow-events`
- `POST /api/error-logs`

### Required Permissions
- `ai_extraction.create`
- `ai_extraction.read`
- `staging.review`
- `staging.promote`
- `manual_override.create`
- `evidence.read`
- `evidence.link`
- `audit.read`

### Required Audit Events
- `extraction_job.created`
- `extraction_job.started`
- `extraction_job.completed`
- `extraction_job.failed`
- `extraction_field.created`
- `extraction_field.flagged`
- `extraction_field.approved_by_engineer`
- `extraction_field.rejected_by_engineer`
- `staging_record.created`
- `staging_record.promoted`
- `manual_override.created`
- `data_quality_check.failed`
- `workflow_event.received`
- `error_log.created`

### Required Validation Rules
This document defines the minimum required validation rules for MVP AI extraction.

### Required Test Cases
At minimum, tests must cover missing required fields, asset mismatch, duplicate report number, unit mismatch, suspicious thickness value, missing evidence, invalid date, invalid standard/reference text, low confidence routing, and manual override with reason.

### Migration / Documentation Updates
Any schema or workflow behavior change must update this control pack, OpenAPI examples, and related database documentation.

---

## 1. Validation Rule Summary

| Rule ID | Rule Name | Severity | Applies To | Resulting Action |
|---|---|---:|---|---|
| VAL-001 | Required fields missing | Critical | all schemas | mark field `invalid`; block promotion |
| VAL-002 | Asset tag mismatch | Critical | all schemas | block job completion; route to Engineer |
| VAL-003 | Duplicate report number | High | tank/API653, UT, MFL | create data quality warning; require review |
| VAL-004 | Unit mismatch | High | UT, thickness, dimensions | mark `needs_review`; block calculation input |
| VAL-005 | Suspicious thickness value | High | UT thickness | mark `needs_review`; require evidence check |
| VAL-006 | Missing evidence reference | Critical | all extracted fields | mark `invalid`; block promotion |
| VAL-007 | Invalid date | High | inspection date, report date | mark `needs_review`; require correction |
| VAL-008 | Invalid standard/reference text | Medium | standard/reference fields | mark `needs_review`; do not infer standard |
| VAL-009 | Low confidence field | Medium/High | all fields | require Engineer review |
| VAL-010 | Unsupported file type | Critical | intake | reject extraction job |
| VAL-011 | AI attempts approval/decision | Critical | all extraction outputs | reject payload; create security/error log |

---

## 2. Required Fields Missing

### Description
The extracted payload must include all schema-required fields. Missing required fields must not be silently filled by AI.

### Examples
- Missing `asset_tag`
- Missing `inspection_id`
- Missing `evidence_code`
- Missing `source_file_name`
- Missing `confidence_score`
- Missing `field_status`

### System Behavior
- Set field or record status to `invalid`.
- Create `data_quality_checks` record.
- Block promotion to final tables.
- Generate audit event `data_quality_check.failed`.
- Notify Engineer or Lead Engineer if the record is part of a review queue.

---

## 3. Asset Tag Mismatch

### Description
The extracted `asset_tag` must match the AIM asset context supplied to the extraction job.

### Validation Logic
- Compare extracted `asset_tag` against the asset record linked to the extraction job.
- Normalize whitespace and case for comparison.
- Do not auto-correct mismatched tags.

### System Behavior
- Flag the job as `requires_review`.
- Block staging promotion.
- Require Engineer to confirm whether the evidence belongs to the selected asset.
- If corrected, create `manual_overrides` record with reason.

---

## 4. Duplicate Report Number

### Description
The same report number should not create duplicate inspection or extraction records for the same asset unless explicitly marked as a revision.

### System Behavior
- Check `report_number` against existing extraction jobs and inspections.
- If duplicate exists:
  - mark as `needs_review`,
  - require reviewer to classify as `duplicate`, `revision`, or `new_record_after_manual_check`,
  - retain all evidence lineage.

---

## 5. Unit Mismatch

### Description
MVP thickness and shell course measurements must use millimeters (`mm`) unless a documented conversion is performed by deterministic backend logic.

### Forbidden
- AI must not silently convert values without a conversion flag.
- AI must not infer missing unit if source evidence is unclear.

### System Behavior
- If unit is not `mm` or unclear:
  - set `field_status = needs_review`,
  - add validation flag `UNIT_MISMATCH`,
  - block calculation input until Engineer resolves the unit.

---

## 6. Suspicious Thickness Value

### Description
Thickness values must be checked for plausible numeric range and engineering context.

### MVP Heuristics
The MVP may flag, but not decide, suspicious values such as:
- non-numeric thickness,
- negative thickness,
- zero thickness,
- extreme value outside configured site threshold,
- current thickness far higher than previous thickness,
- current thickness below minimum required thickness.

### System Behavior
- Set `field_status = needs_review`.
- Add validation flag `SUSPICIOUS_THICKNESS_VALUE`.
- Require Engineer review before staging promotion.

---

## 7. Missing Evidence Reference

### Description
Every extracted field must include source evidence sufficient for traceability.

### Minimum Evidence Source Fields
- `evidence_code`
- `source_file_name`
- page/figure/table/cell reference when applicable

### System Behavior
- Missing evidence reference is critical.
- Block staging promotion.
- Block calculation, integrity decision, and report issue where the value is required.

---

## 8. Invalid Date

### Description
Dates must be valid ISO date values once normalized.

### Examples
- `2026-02-31`
- `12/16/23` without clear locale
- text like `last inspection` without date

### System Behavior
- Set `field_status = needs_review`.
- Require reviewer correction.
- Create `manual_overrides` record if corrected.

---

## 9. Invalid Standard / Reference Text

### Description
AI may extract high-level reference text such as `API 653` or `API 650`, but must not reproduce clauses or invent standard requirements.

### Forbidden
- Quoting or paraphrasing copyrighted clauses as system truth.
- Inferring formula requirements from standards not supplied in the formula registry.
- Treating extracted reference text as an approved engineering basis.

### System Behavior
- If unclear or excessive quoted text appears, flag as `INVALID_STANDARD_REFERENCE_TEXT`.
- Route for Engineer review.
- Store only high-level reference metadata required for traceability.

---

## 10. Promotion Gate

A staging record can be promoted only if:
1. Required fields are complete.
2. Evidence reference exists.
3. Confidence rule is satisfied or Engineer has reviewed.
4. Manual override reason exists for all corrections.
5. Audit event is created.
6. User has `staging.promote` permission.
7. The promotion target is allowed by data dictionary mapping.

---

## Delivery Notes

### What Changed
This document defines AI extraction validation gates for the MVP.

### AIM / n8n Boundary Confirmation
n8n may trigger validation and reminders, but all validation decisions, statuses, persistence, and audit logs are handled through AIM backend APIs.

### Run / Test Commands
```bash
npm run test:ai-extraction
npm run test:staging-review
npm run test:audit
npm run test:rbac
```

### Documentation Updates
Update this file whenever schemas, confidence thresholds, staging behavior, or review rules change.
