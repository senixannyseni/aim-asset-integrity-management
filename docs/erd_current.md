# AIM Tank Integrity ERD — Current Implemented Schema

```mermaid
erDiagram
  users ||--o{ user_roles : assigned
  roles ||--o{ user_roles : maps
  roles ||--o{ role_permissions : grants
  permissions ||--o{ role_permissions : grants

  assets ||--o| tank_geometry : has
  assets ||--o{ shell_courses : has
  materials ||--o{ shell_courses : selected_for
  assets ||--o{ evidence_files : has
  evidence_files ||--o{ evidence_links : links
  assets ||--o{ ndt_measurements : has
  evidence_files ||--o{ ndt_measurements : direct_evidence
  assets ||--o{ validation_runs : validates
  users ||--o{ validation_runs : runs

  assets ||--o{ inspection_events : inspected_by
  inspection_events ||--o{ ndt_measurements : includes
  assets ||--o{ calculation_runs : future_calculation
  formula_registry ||--o{ calculation_runs : future_formula_version
  assets ||--o{ ffs_cases : future_ffs_trigger
  assets ||--o{ rbi_cases : future_rbi_interface

  workflow_events ||--o{ error_logs : can_create
  users ||--o{ audit_logs : actor
```

## Boundary

AIM/PostgreSQL stores final structured engineering data and validation snapshots. n8n may create workflow events and error logs through AIM APIs only. No engineering formula execution, AI extraction runtime, or report generation is included in Sprint 4.

## Sprint 5 Formula Registry Addendum

```mermaid
erDiagram
  users ||--o{ formula_registry : creates_updates_approves
  formula_registry ||--o{ formula_registry : previous_version
  formula_registry ||--o{ formula_test_runs : placeholder_test_runs
  formula_registry ||--o{ calculation_runs : future_approved_formula_source
```

Formula Registry rows represent controlled metadata versions. Formula expressions for API-controlled logic must remain controlled placeholders until manually entered and approved by authorized engineers using licensed sources or approved fixtures.
