# AIM Evidence Governance

**Document path:** `06_Evidence/evidence_governance.md`  
**Project:** AIM+n8n MVP  
**Document owner:** Lead Engineer / IT Admin  
**Applies to:** Atmospheric storage tank MVP evidence repository  
**Status:** Implementation-ready baseline  
**Last updated:** 2026-06-11

---

## 0. AIM+n8n Boundary Rules

This evidence governance document must be implemented under the following non-negotiable AIM+n8n architecture rules:

1. AIM is the system of record for evidence metadata, evidence linkage, data lineage, and audit history.
2. Original evidence files are stored in object storage, not directly in PostgreSQL.
3. PostgreSQL stores structured evidence metadata, evidence links, checksums, lineage, status, and audit references.
4. n8n may trigger intake, routing, reminders, notifications, approval steps, and audit/workflow events only through AIM backend APIs.
5. n8n must not write final engineering data directly to PostgreSQL.
6. AI extraction may read approved evidence references and produce extraction outputs to staging only.
7. Evidence linkage is mandatory before findings, NDT measurements, calculations, integrity decisions, and reports can be approved or issued.
8. Every evidence upload, link, correction, version change, deletion request, approval, rejection, access denial, and workflow failure must create an audit log.

---

## 1. Evidence Governance Objective

The objective of evidence governance is to ensure that every engineering claim in AIM can be traced to original, controlled, reviewable, and auditable evidence.

Evidence governance must support:

- reliable storage of original inspection and NDT evidence files;
- consistent evidence identification and folder organization;
- mandatory metadata capture;
- linkage from evidence to engineering records;
- traceability from report output back to source files;
- controlled access by role;
- immutable audit history;
- controlled versioning and correction;
- deletion restriction with explicit approval;
- readiness for engineering review, calculation validation, integrity decision, and report issuance.

Evidence governance exists to prevent unsupported engineering decisions, uncontrolled file replacement, broken lineage, and AI-only approval of extracted engineering data.

---

## 2. Evidence ID Convention

All evidence records must use the following convention:

```text
EVD-{YYYY}-{running_number}
```

Example:

```text
EVD-2026-000001
EVD-2026-000002
EVD-2026-000123
```

### 2.1 Rules

| Rule | Requirement |
|---|---|
| Prefix | Must always be `EVD` |
| Year | Must use four-digit calendar year of evidence registration in AIM |
| Running number | Must be zero-padded and sequential within the year |
| Uniqueness | Must be globally unique across AIM |
| Mutability | Evidence ID must never change after creation |
| Reuse | Retired/deleted evidence IDs must not be reused |
| Source of generation | AIM backend must generate the Evidence ID |

### 2.2 Validation

A valid evidence code must match:

```regex
^EVD-[0-9]{4}-[0-9]{6}$
```

---

## 3. Object Storage Folder Convention

Original evidence files must be stored in object storage using this convention:

```text
/evidence/{asset_tag}/{inspection_id}/{evidence_code}/{filename}
```

Example:

```text
/evidence/TANK-T-02/INS-2026-000045/EVD-2026-000001/TANK-T-02_UT_SHELL_COURSE_1.pdf
```

### 3.1 Folder Field Rules

| Path Segment | Rule | Example |
|---|---|---|
| `/evidence` | Root folder for all controlled evidence | `/evidence` |
| `{asset_tag}` | Must match AIM asset tag | `TANK-T-02` |
| `{inspection_id}` | Must match AIM inspection ID | `INS-2026-000045` |
| `{evidence_code}` | Must match AIM-generated Evidence ID | `EVD-2026-000001` |
| `{filename}` | Sanitized original or controlled file name | `UT_SHELL_COURSE_1.pdf` |

### 3.2 Filename Rules

Filenames must:

- preserve meaningful source identity where possible;
- avoid unsafe characters;
- not contain secrets, passwords, or personal sensitive data;
- include a controlled extension from the supported file type list;
- remain consistent with the stored checksum.

Recommended filename format:

```text
{asset_tag}_{inspection_id}_{method}_{component}_{version}.{extension}
```

Example:

```text
TANK-T-02_INS-2026-000045_UT_SHELL_COURSE-1_v01.pdf
```

---

## 4. Supported File Types

The MVP supports the following evidence file types:

| File Type | Extension | Typical Use |
|---|---|---|
| PDF | `.pdf` | Inspection reports, certificate pages, calculation attachments |
| Excel workbook | `.xlsx` | UT thickness tables, source worksheets, inspection exports |
| CSV | `.csv` | Structured NDT readings, imported grids, tabular exports |
| JPEG image | `.jpg`, `.jpeg` | Site photos, defect photos, equipment photos |
| PNG image | `.png` | Screenshots, NDT maps, figures, annotated images |
| AutoCAD drawing | `.dwg` | Drawings, layout references, tank drawings |
| Drawing exchange | `.dxf` | Drawing exchange files |
| STL model | `.stl` | 3D reference object or scan-derived mesh placeholder |
| ZIP archive | `.zip` | Controlled bundle of related evidence files |

### 4.1 Rejected File Types

Unsupported files must be rejected at upload metadata validation. The rejection must create:

- one `error_logs` record;
- one `audit_logs` record;
- one `workflow_events` failure event if upload was orchestrated by n8n.

### 4.2 ZIP Archive Rule

ZIP files are allowed only as controlled evidence bundles. AIM must record:

- ZIP evidence metadata;
- checksum of ZIP file;
- optional manifest if available;
- extracted file listing when inspected by backend service;
- whether the ZIP is treated as a source bundle or convenience package.

ZIP contents must not bypass supported file type and security validation.

---

## 5. Required Metadata

Every evidence file must have the following metadata before it can be linked to engineering records.

| Metadata Field | Required | Description | Example |
|---|---:|---|---|
| `evidence_code` | Yes | AIM-generated evidence ID | `EVD-2026-000001` |
| `asset_id` | Yes | Linked AIM asset ID | `AST-2026-000001` |
| `inspection_id` | Yes | Linked inspection ID | `INS-2026-000045` |
| `method` | Yes | Inspection/NDT method or evidence source type | `UT_THICKNESS` |
| `component` | Yes | Asset component represented by evidence | `SHELL_COURSE_1` |
| `cml_tml_grid_reference` | Conditional | CML/TML/Grid reference when applicable | `CML-SH-01` |
| `inspection_date` | Yes | Date evidence was collected or inspection was performed | `2026-05-20` |
| `source_file_name` | Yes | Original submitted file name | `UT Shell Course 1.pdf` |
| `page_figure_table_reference` | Conditional | Source page, figure, table, worksheet, or coordinate reference | `Page 12 Table 3` |
| `uploaded_by` | Yes | User who uploaded or registered evidence | `user_inspector_001` |
| `checksum` | Yes | File checksum computed by AIM backend | `sha256:7f83b165...` |

### 5.1 Additional Recommended Metadata

| Metadata Field | Required | Description | Example |
|---|---:|---|---|
| `file_type` | Yes | Controlled file extension/type | `PDF` |
| `mime_type` | Yes | Detected MIME type | `application/pdf` |
| `file_size_bytes` | Yes | Object size in bytes | `3482342` |
| `storage_uri` | Yes | Object storage URI/path | `/evidence/TANK-T-02/...` |
| `version_no` | Yes | Evidence version number | `1` |
| `status` | Yes | Evidence lifecycle status | `active` |
| `created_at` | Yes | AIM creation timestamp | `2026-06-11T09:15:00+07:00` |
| `created_by` | Yes | User who created metadata record | `user_inspector_001` |
| `updated_at` | No | Last metadata update timestamp | `2026-06-11T10:00:00+07:00` |
| `updated_by` | No | Last metadata updater | `user_engineer_001` |

---

## 6. Evidence Linkage Rules

Evidence linkage is mandatory for engineering records. An engineering record without evidence linkage must remain incomplete, draft, blocked, or pending review depending on module workflow.

### 6.1 Records That Require Evidence Links

Evidence must be linked to:

| AIM Record Type | Evidence Requirement |
|---|---|
| `inspection_findings` | Required before finding can be approved |
| `ndt_measurements` | Required before measurement can be reviewed or promoted |
| `thickness_readings` | Required when reading is derived from uploaded file or inspection source |
| `calculation_inputs` | Required before calculation run can be approved |
| `calculation_outputs` | Required if output is used in integrity decision or report |
| `integrity_decisions` | Required before decision can be approved |
| `reports` | Required before report can be issued |
| `manual_overrides` | Required for correction justification |
| `staging_records` | Required when AI extraction is derived from evidence |

### 6.2 Linkage Fields

Each evidence linkage record should include:

| Field | Description | Example |
|---|---|---|
| `evidence_link_id` | Unique linkage ID | `EVL-2026-000011` |
| `evidence_id` | Evidence record ID | `EVD-2026-000001` |
| `linked_table` | Target table name | `ndt_measurements` |
| `linked_record_id` | Target record ID | `NDT-2026-000020` |
| `link_type` | Relationship type | `source`, `supporting`, `calculation_input`, `report_attachment` |
| `page_reference` | Page reference when applicable | `Page 12` |
| `figure_reference` | Figure reference when applicable | `Figure 4` |
| `table_reference` | Table reference when applicable | `Table 3` |
| `cell_or_coordinate_reference` | Cell, grid, CML/TML, or drawing coordinate | `CML-SH-01` |
| `linked_by` | User creating linkage | `user_engineer_001` |
| `linked_at` | Link creation timestamp | `2026-06-11T09:30:00+07:00` |

### 6.3 Link Types

Allowed `link_type` values:

- `source`
- `supporting`
- `extraction_source`
- `manual_override_support`
- `ndt_source`
- `calculation_input`
- `calculation_output_support`
- `integrity_decision_support`
- `report_attachment`
- `audit_support`

### 6.4 Blocking Rules

AIM must block the following actions when required evidence is missing:

| Action | Blocking Rule |
|---|---|
| Approve extraction field | Block if source evidence link is missing |
| Promote staging record | Block if evidence lineage is missing |
| Approve NDT measurement | Block if source or supporting evidence missing |
| Approve calculation | Block if calculation input evidence missing |
| Approve integrity decision | Block if decision support evidence missing |
| Issue report | Block if report evidence completeness checklist is incomplete |

---

## 7. Evidence Retention Rules

Evidence retention must support engineering accountability, regulatory review, client review, and future asset history.

### 7.1 MVP Retention Baseline

| Evidence Category | Minimum Retention Rule |
|---|---|
| Inspection reports and certificates | Retain for asset life plus project-defined archive period |
| NDT source files | Retain for asset life plus project-defined archive period |
| Calculation support evidence | Retain for asset life plus project-defined archive period |
| Integrity decision evidence | Retain for asset life plus project-defined archive period |
| Issued report attachments | Retain permanently unless legal retention policy allows archival |
| Rejected/invalid uploads | Retain metadata and error log; file retention configurable by IT Admin |
| Superseded evidence versions | Retain; do not overwrite or delete without approval workflow |

### 7.2 Retention Ownership

- Lead Engineer owns engineering retention rules.
- IT Admin owns storage policy implementation.
- Approver owns deletion approval for controlled evidence.
- Management may define client or contract-specific retention extensions.

### 7.3 Archival

Archival must preserve:

- Evidence ID;
- object storage URI or archive URI;
- checksum;
- metadata;
- evidence links;
- audit logs;
- lineage references.

---

## 8. Evidence Versioning Rules

Evidence files must not be overwritten in place.

### 8.1 Version Creation

A new evidence version must be created when:

- a corrected file is uploaded;
- a higher-resolution image replaces a lower-quality file;
- a revised source worksheet is submitted;
- file metadata correction changes engineering interpretation;
- a file is reprocessed due to checksum or upload error;
- an evidence bundle is reissued.

### 8.2 Version Fields

Each version must track:

| Field | Description | Example |
|---|---|---|
| `evidence_code` | Stable evidence identifier | `EVD-2026-000001` |
| `version_no` | Sequential version number | `2` |
| `supersedes_version_no` | Previous version, if any | `1` |
| `version_reason` | Reason for version creation | `Corrected UT worksheet uploaded` |
| `uploaded_by` | User who uploaded version | `user_inspector_001` |
| `reviewed_by` | Reviewer of version, if applicable | `user_engineer_001` |
| `checksum` | New checksum | `sha256:ab12...` |
| `storage_uri` | Version-specific URI | `/evidence/.../v02.xlsx` |

### 8.3 Active Version Rule

Only one version should be marked as `active` for normal downstream use. Superseded versions remain accessible for audit and lineage but must not be used for new calculation or report issuance unless explicitly selected by an authorized reviewer with an audit log.

---

## 9. Evidence Access Control Rules

Evidence access must be role-based and permission-controlled.

### 9.1 Role Access Matrix

| Role | Upload | Read | Link | Update Metadata | Create Version | Request Delete | Approve Delete | View Audit |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Admin | Yes | Yes | Yes | Yes | Yes | Yes | Conditional | Yes |
| Inspector | Yes | Yes | Yes | Limited | Yes | No | No | Limited |
| Engineer | Yes | Yes | Yes | Yes | Yes | Yes | No | Yes |
| Lead Engineer | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Approver | Read-only | Yes | Review | Review | Review | Yes | Yes | Yes |
| Management | No | Summary/issued report only | No | No | No | No | No | Limited |
| IT Admin | Technical upload/admin | Technical read | No engineering link approval | Technical metadata only | Technical version support | Technical request | No engineering approval | Technical audit |

### 9.2 Permission Names

Recommended permissions:

- `evidence.upload`
- `evidence.read`
- `evidence.link`
- `evidence.update_metadata`
- `evidence.version_create`
- `evidence.delete_request`
- `evidence.delete_approve`
- `evidence.audit_read`
- `evidence.preview_read`
- `evidence.download`

### 9.3 Access Denial

Every denied access attempt for controlled evidence must create an audit log with:

- user ID;
- attempted evidence ID;
- requested action;
- denial reason;
- timestamp;
- request context.

---

## 10. Thumbnail / Preview Rule

AIM should generate or store safe previews to support fast review without requiring full file download.

### 10.1 Preview Requirements

| File Type | Preview Requirement |
|---|---|
| PDF | First page thumbnail and page-level preview where possible |
| XLSX | Worksheet list and limited read-only preview where safe |
| CSV | First rows preview with encoding detection |
| JPG/PNG | Image thumbnail and full read-only preview |
| DWG/DXF | Metadata preview; drawing preview if converter is available |
| STL | Basic 3D model preview if viewer is available; otherwise metadata preview |
| ZIP | Manifest/file list preview, not automatic trust of contents |

### 10.2 Preview Restrictions

Preview generation must not:

- alter the original evidence file;
- replace the evidence file;
- bypass access controls;
- become the authoritative evidence source;
- create final engineering data without review.

Preview outputs should be stored separately from original files and linked as derived preview artifacts.

---

## 11. Audit Requirements

Evidence actions are audit-sensitive.

### 11.1 Mandatory Audit Events

AIM must write audit logs for:

- evidence metadata created;
- file upload completed;
- checksum generated;
- checksum mismatch detected;
- evidence linked to record;
- evidence link removed or changed;
- metadata corrected;
- manual correction submitted;
- manual correction approved/rejected;
- new evidence version created;
- evidence status changed;
- evidence deletion requested;
- deletion approved/rejected;
- access denied;
- evidence download by restricted role;
- report issue gate blocked due to missing evidence;
- calculation approval blocked due to missing evidence;
- workflow failure related to evidence intake or linkage.

### 11.2 Audit Payload Minimum

Each audit event should include:

| Field | Description |
|---|---|
| `audit_event_id` | Unique audit event ID |
| `event_type` | Controlled audit event type |
| `actor_user_id` | User or service identity |
| `actor_role` | Role at time of action |
| `target_table` | Table being acted upon |
| `target_record_id` | Record ID affected |
| `evidence_id` | Evidence ID where applicable |
| `before_value` | Before state for changes |
| `after_value` | After state for changes |
| `reason` | Required for correction/deletion/rejection |
| `timestamp` | Event timestamp |
| `request_id` | API request or workflow correlation ID |

---

## 12. Data Lineage Requirement

AIM must maintain traceability from final engineering outputs back to original evidence.

### 12.1 Required Lineage Chain

The following lineage must be reconstructable:

```text
Object Storage File
  -> evidence_files
  -> evidence_links
  -> extraction_jobs / extraction_fields / staging_records
  -> manual_overrides if any
  -> ndt_measurements / thickness_readings
  -> calculation_inputs / calculation_outputs
  -> integrity_decisions
  -> reports / report_versions
  -> audit_logs
```

### 12.2 Lineage Rules

1. AI-extracted data must reference the source `evidence_id` and extraction job.
2. Promoted staging records must preserve source evidence lineage.
3. Manual overrides must preserve both original AI/staging value and corrected human-reviewed value.
4. Calculation inputs must trace to either final structured data or directly linked evidence.
5. Integrity decisions must trace to calculation outputs and supporting evidence.
6. Issued reports must include evidence references sufficient for reviewer traceability.
7. n8n workflow events must include correlation IDs but must not become the system of record for final engineering data.

---

## 13. Manual Correction and Metadata Update Rule

Evidence metadata correction is allowed only through controlled AIM backend workflows.

### 13.1 Correction Use Cases

Manual correction may be used for:

- wrong component tag;
- incorrect inspection date;
- missing page/table reference;
- incorrect CML/TML/Grid reference;
- source filename typo;
- method classification correction;
- evidence link correction;
- asset or inspection association correction.

### 13.2 Correction Requirements

Every metadata correction must include:

- corrected field name;
- previous value;
- new value;
- correction reason;
- corrected by;
- reviewer if required;
- timestamp;
- audit log;
- effect on downstream links/calculations/reports.

### 13.3 Downstream Impact Review

If metadata correction affects calculation, integrity decision, or issued report, AIM must:

1. flag impacted downstream records;
2. create a workflow task for Engineer or Lead Engineer review;
3. prevent new report issuance until impact review is completed;
4. write audit logs for the correction and its downstream review outcome.

---

## 14. Deletion Restriction and Approval Requirement

Evidence deletion is restricted. In normal operation, evidence should be soft-deleted, archived, or marked inactive rather than physically removed.

### 14.1 Deletion Rules

| Scenario | Allowed Action |
|---|---|
| Evidence linked to approved finding | Deletion blocked unless exceptional approval is granted |
| Evidence linked to approved calculation | Deletion blocked |
| Evidence linked to issued report | Physical deletion blocked; archive/retain required |
| Duplicate upload not linked downstream | Soft delete allowed with approval |
| Malware/quarantine event | Quarantine allowed; metadata and audit retained |
| Incorrect upload before linkage | Soft delete allowed with reason and audit |

### 14.2 Approval Requirement

Deletion requires:

- deletion request by authorized user;
- reason for deletion;
- impact analysis on linked records;
- approval by Lead Engineer or Approver, depending on evidence status;
- IT Admin execution for storage-level action if physical delete is allowed;
- audit log before and after action.

### 14.3 Physical Delete Restriction

Physical deletion must be disabled for evidence linked to:

- approved inspection findings;
- approved NDT measurements;
- approved calculation runs;
- approved integrity decisions;
- issued reports;
- active audit/legal hold.

---

## 15. Evidence Completeness Checklist

This checklist must be satisfied before the related engineering object can be approved or issued.

### 15.1 Evidence File Checklist

| # | Checklist Item | Required |
|---:|---|---:|
| 1 | Evidence ID follows `EVD-{YYYY}-{running_number}` | Yes |
| 2 | File type is supported | Yes |
| 3 | Object storage path follows convention | Yes |
| 4 | Checksum is generated and stored | Yes |
| 5 | File size and MIME type are captured | Yes |
| 6 | Asset ID is linked | Yes |
| 7 | Inspection ID is linked | Yes |
| 8 | Method is provided | Yes |
| 9 | Component is provided | Yes |
| 10 | Inspection date is provided | Yes |
| 11 | Source filename is recorded | Yes |
| 12 | Uploaded by is recorded | Yes |
| 13 | Page/figure/table reference is provided when applicable | Conditional |
| 14 | CML/TML/Grid reference is provided when applicable | Conditional |
| 15 | Preview or thumbnail is generated where supported | Recommended |

### 15.2 Evidence Linkage Checklist

| # | Checklist Item | Required |
|---:|---|---:|
| 1 | Evidence is linked to target engineering record | Yes |
| 2 | Link type is selected from allowed values | Yes |
| 3 | Linkage was created by authorized user | Yes |
| 4 | Link has page/table/coordinate reference when applicable | Conditional |
| 5 | Link is included in data lineage chain | Yes |
| 6 | Link action wrote an audit log | Yes |

### 15.3 Calculation and Decision Gate Checklist

| # | Gate | Evidence Requirement |
|---:|---|---|
| 1 | NDT measurement review | Source evidence linked |
| 2 | Calculation run | Inputs linked to approved source data/evidence |
| 3 | Calculation approval | Calculation output and input lineage complete |
| 4 | Integrity decision approval | Calculation and decision evidence complete |
| 5 | Report generation | Required evidence package complete |
| 6 | Report issue | All evidence, review, calculation, and approval gates complete |

---

## 16. Exception Handling

Evidence exceptions must be handled through AIM-controlled workflows.

### 16.1 Exception Types

| Exception | Required Handling |
|---|---|
| Missing evidence metadata | Block linkage and create validation error |
| Unsupported file type | Reject upload and create error log |
| Checksum mismatch | Quarantine file and create error log |
| Duplicate checksum | Flag duplicate and require reviewer decision |
| Missing source reference | Allow draft only; block approval |
| Evidence link conflict | Require Engineer or Lead Engineer resolution |
| Object storage failure | Retry via backend; n8n may orchestrate notification only |
| Preview generation failure | Do not block evidence record; log warning unless preview is mandatory |

### 16.2 n8n Failure Rule

If a workflow involving evidence fails, n8n must:

1. call `/api/error-logs`;
2. call `/api/workflow-events` with failure status;
3. route notification to the configured recipient;
4. not write directly to PostgreSQL;
5. not bypass the AIM backend validation layer.

---

## 17. Implementation Notes for Developers

### 17.1 Required Backend Behaviors

AIM backend must enforce:

- evidence ID generation;
- file extension and MIME validation;
- checksum generation;
- object path convention;
- metadata completeness;
- RBAC for upload/read/link/update/delete;
- audit logging;
- soft deletion and deletion approval workflow;
- evidence lineage queries;
- report/calculation/integrity gate checks.

### 17.2 Suggested API Behaviors

Evidence upload should be implemented as a controlled multi-step process:

1. client requests upload metadata registration;
2. AIM validates metadata and file type;
3. AIM creates evidence record in pending/uploading status;
4. AIM generates object storage target path or pre-signed upload instruction;
5. client uploads file to object storage through controlled mechanism;
6. AIM verifies checksum and file metadata;
7. AIM marks evidence active or quarantined;
8. AIM writes audit log and workflow event if applicable.

### 17.3 Suggested Test Cases

| Test Case | Expected Result |
|---|---|
| Upload supported PDF with complete metadata | Evidence active and audit logged |
| Upload unsupported executable file | Upload rejected; error log created |
| Upload with missing asset ID | Validation error; no active evidence |
| Upload duplicate checksum | Duplicate warning; reviewer decision required |
| Link evidence to NDT measurement | Link created; audit log written |
| Approve calculation without evidence | Approval blocked |
| Correct metadata after report generated | Downstream impact review created |
| Request delete linked to issued report | Physical delete blocked |
| n8n workflow failure during file intake | `/api/error-logs` and `/api/workflow-events` called |

---

## 18. Delivery Notes

### What Changed

This document defines the AIM evidence governance rules for the MVP, including identification, object storage convention, supported file types, metadata, linkage, retention, versioning, access control, preview, audit, lineage, correction, deletion, and completeness gates.

### AIM / n8n Boundary Confirmation

AIM remains the system of record for evidence metadata, links, lineage, and audit. Object storage stores original evidence files. n8n must call AIM backend APIs only and must not write final engineering data directly to PostgreSQL.

### Run / Test Commands

Recommended test commands after implementation:

```bash
npm run test:evidence
npm run test:rbac
npm run test:audit
npm run test:workflow
npm run test:report-gates
```

Recommended API contract check:

```bash
npx @redocly/cli lint 04_API/openapi.yaml
```

### Documentation Updates

This document should be referenced by:

- `01_PRD/AIM_MVP_PRD.md`
- `03_Database/data_dictionary.md`
- `04_API/openapi.yaml`
- `05_n8n/n8n_workflow_catalog.md`
- `07_Calculation/engineering_basis.md`
- report issuance gate documentation

---

## 19. Sign-Off

| Role | Name | Decision | Date | Comment |
|---|---|---|---|---|
| Lead Engineer |  | Approved / Rejected |  |  |
| Approver |  | Approved / Rejected |  |  |
| IT Admin |  | Approved / Rejected |  |  |
| Management Representative |  | Acknowledged |  |  |
