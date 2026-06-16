# AIM Tank Integrity ERD — Implemented Schema Through Sprint 5.5

```mermaid
erDiagram
  users ||--o{ user_roles : assigned
  roles ||--o{ user_roles : maps
  roles ||--o{ role_permissions : grants
  permissions ||--o{ role_permissions : grants

  users ||--o{ audit_logs : actor
  users ||--o{ workflow_events : creates
  workflow_events ||--o{ error_logs : can_create

  assets ||--o| tank_geometry : has
  assets ||--o{ shell_courses : has
  materials ||--o{ shell_courses : selected_for
  assets ||--o{ inspection_events : inspected_by

  assets ||--o{ evidence_files : has
  inspection_events ||--o{ evidence_files : supports
  evidence_files ||--o{ evidence_links : links

  assets ||--o{ ndt_measurements : has
  inspection_events ||--o{ ndt_measurements : includes
  evidence_files ||--o{ ndt_measurements : direct_evidence
  evidence_files ||--o{ evidence_links : traceability

  assets ||--o{ validation_runs : validates
  users ||--o{ validation_runs : runs
  engineering_data_dictionary ||--o{ validation_runs : informs

  users ||--o{ formula_registry : creates_updates_approves
  formula_registry ||--o{ formula_registry : previous_version
  formula_registry ||--o{ formula_test_runs : placeholder_test_runs

  assets ||--o{ calculation_runs : calculation_runs
  formula_registry ||--o{ calculation_runs : formula_version
  calculation_runs ||--o{ calculation_inputs : inputs
  calculation_runs ||--o{ calculation_outputs : outputs
  evidence_files ||--o{ calculation_inputs : input_evidence

  assets ||--o{ ffs_cases : future_ffs_trigger
  assets ||--o{ rbi_cases : future_rbi_interface
  calculation_runs ||--o{ ffs_cases : future_trigger_source
```

## Boundary

AIM/PostgreSQL stores final structured engineering data, metadata, validation snapshots, Formula Registry metadata, workflow events, error logs, and audit logs. n8n may create workflow events and error logs through AIM APIs only. Universal deterministic calculation execution is included through Sprint 6. No API/API-ASME formula expression execution, AI extraction runtime, report generation, or CMMS work-order integration is included.

## Formula Registry Note

Formula Registry rows represent controlled metadata versions. Formula expressions for API-controlled logic must remain controlled placeholders until manually entered and approved by authorized engineers using licensed sources or approved fixtures. The required `formula_expression_source` field preserves formula source traceability.
