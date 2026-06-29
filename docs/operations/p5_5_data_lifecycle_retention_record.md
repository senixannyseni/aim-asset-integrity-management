# P5-5 Data Lifecycle and Retention Record

**Record:** P5-5 Data Lifecycle and Retention Record  
**Evidence range:** P5-PERF-009 through P5-PERF-011  
**Status:** Template/evidence-control record; attach approved lifecycle evidence separately

## 1. Data Retention Matrix

| Data class | Example records | Retention rule | Archive/export rule | Purge rule | Human owner |
|---|---|---|---|---|---|
| Asset master data | assets, components, shell courses | `<retention rule>` | `<archive/export rule>` | `<purge rule>` | `<owner>` |
| Inspection records | inspection events, methods, dates | `<retention rule>` | `<archive/export rule>` | `<purge rule>` | `<owner>` |
| Evidence metadata | evidence code, checksum, method, component, CML/TML reference | `<retention rule>` | `<archive/export rule>` | `<purge rule>` | `<owner>` |
| Object-storage files | original evidence files and report artifacts | `<retention rule>` | `<archive/export rule>` | `<purge rule>` | `<owner>` |
| NDT measurements | UT/MFL/CML/TML rows and derived validated records | `<retention rule>` | `<archive/export rule>` | `<purge rule>` | `<owner>` |
| Calculation snapshots | input/output snapshots and formula version trace | `<retention rule>` | `<archive/export rule>` | `<purge rule>` | `<owner>` |
| Review gates | approvals, rejections, corrections, comments | `<retention rule>` | `<archive/export rule>` | `<purge rule>` | `<owner>` |
| Issued reports | report versions, issue evidence, artifact checksums | `<retention rule>` | `<archive/export rule>` | `<purge rule>` | `<owner>` |
| Work orders | internal work-order records and closure evidence | `<retention rule>` | `<archive/export rule>` | `<purge rule>` | `<owner>` |
| Audit logs | controlled action events and security/audit trace | `<retention rule>` | `<archive/export rule>` | `<purge rule>` | `<owner>` |
| AI staging records | extraction jobs, staging fields, validation checks, manual overrides | `<retention rule>` | `<archive/export rule>` | `<purge rule>` | `<owner>` |
| Release evidence exports | final go/no-go bundles and Phase 5 evidence bundles | `<retention rule>` | `<archive/export rule>` | `<purge rule>` | `<owner>` |

## 2. Archive / Export / Purge Lifecycle Procedure

| Lifecycle action | Required evidence | Human approval requirement |
|---|---|---|
| Archive | source dataset, artifact/checksum, archive location, owner | Product Owner / Operations approval |
| Export | export purpose, scope, redaction check, checksum, recipient/location | Product Owner / Security Owner approval |
| Purge | legal/business basis, dependency check, audit record, rollback/no-rollback decision | Product Owner / Security Owner approval |
| Restore from archive | archive artifact, restore target, validation checks, owner signoff | Operations / Lead Engineer approval |

## 3. Lifecycle Gap Register

| Gap ID | Description | Severity | Owner | Mitigation | Target closure | Decision |
|---|---|---|---|---|---|---|
| P5-PERF-RISK-001 | `<gap>` | `<severity>` | `<owner>` | `<mitigation>` | `<date>` | `<accepted/closed/no-go>` |

## 4. Governance Boundary

AI/n8n/service actors cannot approve data-retention exceptions. AI/n8n/service actors cannot close lifecycle gaps. AI/n8n/service actors cannot accept residual lifecycle risk. Lifecycle exceptions require named human approval.

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, raw database dumps, or confidential client evidence into this record.
