# AIM Tank Integrity ERD — Current Implemented Schema

```mermaid
erDiagram
  users ||--o{ user_roles : has
  roles ||--o{ user_roles : assigned
  roles ||--o{ role_permissions : grants
  permissions ||--o{ role_permissions : granted

  assets ||--o| tank_geometry : has
  assets ||--o{ shell_courses : has
  materials ||--o{ shell_courses : selected_for
  assets ||--o{ inspection_events : inspected_by
  assets ||--o{ evidence_files : has_evidence
  inspection_events ||--o{ evidence_files : produces
  evidence_files ||--o{ evidence_links : links

  assets ||--o{ calculation_runs : future_calculation_context
  formula_registry ||--o{ calculation_runs : controlled_formula_version
  calculation_runs ||--o{ calculation_inputs : has
  calculation_runs ||--o{ calculation_outputs : has
  calculation_runs ||--o{ ffs_cases : may_trigger
  assets ||--o{ ffs_cases : has
  assets ||--o{ rbi_cases : has

  workflow_events ||--o{ error_logs : may_create
  users ||--o{ audit_logs : actor

  users {
    uuid id PK
    text email
    text status
  }
  roles {
    uuid id PK
    text role_code
  }
  permissions {
    uuid id PK
    text permission_code
  }
  assets {
    uuid id PK
    text asset_tag
    text asset_name
    text facility
    text service_fluid
    text original_design_code
    text current_assessment_code
    text code_edition
    text operating_status
  }
  tank_geometry {
    uuid id PK
    uuid asset_id FK
    numeric diameter_m
    numeric shell_height_m
    numeric design_liquid_level_m
    numeric nominal_capacity_m3
  }
  shell_courses {
    uuid id PK
    uuid asset_id FK
    uuid material_id FK
    int course_no
    numeric course_height_mm
    numeric nominal_thickness_mm
    numeric measured_min_thickness_mm
    numeric joint_efficiency
  }
  evidence_files {
    uuid id PK
    text evidence_code
    text object_storage_uri
    text checksum_sha256
  }
  evidence_links {
    uuid id PK
    uuid evidence_file_id FK
    text linked_entity_type
    uuid linked_entity_id
  }
  workflow_events {
    uuid id PK
    text workflow_event_code
    text workflow_id
    text event_type
    jsonb payload_json
  }
  error_logs {
    uuid id PK
    text error_code
    text severity
    text source_module
    uuid workflow_event_id FK
  }
  audit_logs {
    uuid id PK
    text event_type
    text entity_type
    uuid entity_id
    jsonb metadata_json
  }
```

## Future / Planned ERD Extension

Sprint 3+ will add functional NDT measurement tables and evidence upload APIs. AI extraction, calculation execution, report generation, and external CMMS integration remain future/planned and must preserve AIM/n8n boundaries.
