# AIM Final Release Evidence Register

**Package:** RC4-X Final Release Decision Pack Cleanup  
**Purpose:** Provide a single register for evidence that must be attached or referenced before Go / Conditional Go / No-Go decision.

## 1. Evidence Registration Rule

Each evidence item should record:

- evidence ID;
- owner;
- source path or system link;
- date captured;
- environment;
- reviewer;
- pass/fail result;
- related defect or risk ID;
- whether secrets, signed URLs, production credentials, or real client confidential evidence were excluded/redacted.

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, vulnerability exploit details, or confidential client evidence into this register.

## 2. Required Evidence Register

| Evidence ID | Area | Required Artifact | Suggested Source | Owner | Status |
|---|---|---|---|---|---|
| EV-FINAL-001 | Git baseline | Commit SHA, branch, tag, clean working tree | `git status`, GitHub tag/PR | Developer / DevOps | Pending |
| EV-FINAL-002 | Test evidence | Full test output | `pnpm -r test` | Developer | Pending |
| EV-FINAL-003 | Lint/typecheck | Full lint/typecheck output | `pnpm -r lint` | Developer | Pending |
| EV-FINAL-004 | Repo hygiene | Repo hygiene output | `node scripts/repo-hygiene.mjs` | Developer | Pending |
| EV-FINAL-005 | Migration | Clean DB migration and seed proof | Migration log / DB screenshot | DevOps | Pending |
| EV-FINAL-006 | UAT | Final UAT execution summary and defect log | `docs/uat` package / evidence folder | UAT Lead | Pending |
| EV-FINAL-007 | Evidence storage | Upload, checksum, object verification, signed download | Evidence repository smoke test | IT Admin / Engineer | Pending |
| EV-FINAL-008 | Report issue gates | Report blocked/issued only when gates pass | UAT/report smoke evidence | Approver | Pending |
| EV-FINAL-009 | AI staging boundary | AI cannot approve/promote/finalize | UAT denial evidence | Lead Engineer | Pending |
| EV-FINAL-010 | n8n boundary | n8n has no direct DB write and cannot finalize | Workflow config review | IT Admin | Pending |
| EV-FINAL-011 | Security scan | Dependency/vulnerability/secret review | Scan output or reviewed exception log | Security Owner | Pending |
| EV-FINAL-012 | RBAC/service actor | Denied actions for unauthorized/service actors | API/UI smoke evidence | Security Owner / IT Admin | Pending |
| EV-FINAL-013 | Backup/restore | Backup and restore drill/review | Drill record | DevOps | Pending |
| EV-FINAL-014 | Monitoring | Dashboard/log/alert routing proof | Monitoring screenshot/log | IT Admin | Pending |
| EV-FINAL-015 | Incident response | Escalation route and runbook review | Runbook/signoff | Security Owner / Operations | Pending |
| EV-FINAL-016 | Hypercare | Hypercare owner, schedule, channel, rollback owner | Hypercare plan | Product Owner / Operations | Pending |
| EV-FINAL-017 | Final decision | Completed go/no-go decision record | `docs/release/final_go_no_go_decision_record.md` | Product Owner | Pending |

## 3. Acceptance Criteria

A release may be marked **Go** only when every required evidence item is complete or explicitly marked not applicable with rationale, owner, and approval.

A **Conditional Go** may be used only when the incomplete item is non-governance, non-security, non-blocker, non-critical, and has formal risk acceptance.

A **No-Go** must be used if any governance, security, evidence, migration, backup/restore, monitoring, or final signoff item remains unresolved.

## 4. RC4-Y Operations Evidence Collection Mapping

The final operations evidence collection pack is maintained in:

```text
docs/release/final_release_operations_evidence_collection.md
docs/operations/final_release_operations_evidence_runbook.md
docs/operations/final_release_cutover_rollback_evidence_record.md
```

The EV-FINAL register remains the high-level release evidence register. RC4-Y adds detailed `EV-OPS-001` through `EV-OPS-017` operational evidence items covering Git baseline, tests, lint/typecheck, repository hygiene, migration/seed, environment validation, object storage, backup/restore, security, monitoring, incident response, UAT signoff, governance denial proof, report issue gates, work-order closure, final go/no-go, and hypercare handoff.

AI/n8n/service actors cannot accept evidence, approve go-live, sign final records, or replace human signoff.


## 5. RC4-Z Final Signoff Evidence Mapping

RC4-Z adds the final human signoff preparation layer maintained in:

```text
docs/release/final_go_no_go_signoff_packet.md
docs/release/final_go_no_go_meeting_minutes_template.md
docs/release/final_go_live_authorization_record.md
```

The signoff packet maps evidence from `EV-FINAL-001` through `EV-FINAL-017` and `EV-OPS-001` through `EV-OPS-017` into a human decision workflow. RC4-Z does not approve production go-live by itself. The final authorization record must be completed by named humans only. AI/n8n/service actors cannot sign final authorization, accept evidence, approve go-live, or replace human signoff.

Required RC4-Z signoff evidence items:

| Evidence ID | Area | Required Artifact | Owner | Status |
|---|---|---|---|---|
| EV-SIGNOFF-001 | Signoff packet | Completed `final_go_no_go_signoff_packet.md` or completed controlled copy | Product Owner | Pending |
| EV-SIGNOFF-002 | Meeting minutes | Completed final go/no-go meeting minutes | Decision Owner | Pending |
| EV-SIGNOFF-003 | Final authorization | Completed `final_go_live_authorization_record.md` or completed controlled copy | Product Owner / Approver | Pending |
| EV-SIGNOFF-004 | Human approval proof | Named human approvals for required roles | Product Owner | Pending |
| EV-SIGNOFF-005 | Archive location | Evidence package location, final tag, commit SHA, and decision date recorded | DevOps / Decision Owner | Pending |

## 6. AIM MVP Final Go/No-Go Evidence Bundle Mapping

The final evidence bundle is maintained in:

```text
docs/release/aim_mvp_final_go_no_go_evidence_bundle.md
docs/release/final_evidence_bundle_index.md
docs/release/final_release_handoff_record.md
```

The final evidence bundle consolidates RC4-X decision records, RC4-Y operations evidence, and RC4-Z human signoff records into one archive-ready release evidence package. It adds `EV-BUNDLE-001` through `EV-BUNDLE-010` for Git baseline, full verification, migration/seed evidence, environment validation, backup/restore/DR, security/service actor evidence, monitoring/incident response, UAT evidence, governance denial proof, and final go/no-go signoff evidence.

AI/n8n/service actors cannot accept the final evidence bundle, waive missing evidence, approve go-live, sign the final release, or replace named human signoff.

## 7. P5-1 Security and Secrets Hardening Mapping

P5-1 adds detailed security and secrets hardening evidence maintained in:

```text
docs/security/p5_1_security_and_secrets_hardening_pack.md
docs/security/p5_1_secrets_scanning_evidence_record.md
docs/security/p5_1_rbac_service_actor_review_record.md
docs/security/p5_1_security_accepted_risk_register.md
docs/operations/p5_1_security_evidence_runbook.md
```

The P5-1 evidence set expands `EV-FINAL-011` and `EV-FINAL-012` with `P5-SEC-001` through `P5-SEC-012`, covering secret scan evidence, dependency vulnerability review, environment-file hygiene, RBAC/service actor review, n8n direct-DB-write exclusion, token/session hardening, audit-log redaction, signed URL/raw object key exposure, accepted-risk approval, incident-response security route, and final human security signoff.

AI/n8n/service actors cannot accept security evidence, accept residual risk, waive missing evidence, sign the security review, or authorize production go-live.

## 8. P5-2 Deployment and Environment Hardening Mapping

P5-2 adds detailed deployment and environment evidence maintained in:

```text
docs/deployment/p5_2_deployment_environment_hardening_pack.md
docs/deployment/p5_2_environment_configuration_evidence_record.md
docs/deployment/p5_2_migration_seed_validation_record.md
docs/deployment/p5_2_deployment_smoke_rollback_record.md
docs/operations/p5_2_deployment_environment_evidence_runbook.md
```

The P5-2 evidence set expands `EV-FINAL-001`, `EV-FINAL-005`, `EV-FINAL-007`, `EV-FINAL-010`, and `EV-FINAL-013` with `P5-ENV-001` through `P5-ENV-012`, covering release baseline traceability, build artifact provenance, environment variable inventory, `.env.example` parity, production configuration validation, PostgreSQL access validation, migration and seed rehearsal, object-storage environment validation, n8n API-only environment boundary, deployment smoke tests, rollback readiness, and final human deployment signoff.

AI/n8n/service actors cannot accept deployment evidence, approve environment readiness, accept rollback readiness, waive missing evidence, sign deployment readiness, or authorize production go-live.

## 9. P5-3 Observability and Incident Response Mapping

P5-3 adds detailed observability and incident-response evidence maintained in:

```text
docs/operations/p5_3_observability_incident_response_pack.md
docs/operations/p5_3_monitoring_alerting_evidence_record.md
docs/operations/p5_3_incident_response_escalation_record.md
docs/operations/p5_3_hypercare_observability_handoff_record.md
docs/operations/p5_3_observability_incident_response_runbook.md
```

The P5-3 evidence set expands `EV-FINAL-014`, `EV-FINAL-015`, and `EV-FINAL-016` with `P5-OBS-001` through `P5-OBS-012`, covering monitoring ownership, dashboard baseline, service health checks, alert routing verification, audit/error/workflow/correlation log review, log retention/redaction, incident severity triage, incident response tabletop, governance incident route, hypercare cadence, incident closure evidence, and final human observability signoff.

AI/n8n/service actors cannot accept observability evidence, close incidents, accept residual operational risk, waive missing evidence, approve hypercare handoff, sign observability readiness, or authorize production go-live.

## 10. P5-4 Backup, Restore, and DR Mapping

P5-4 adds detailed backup, restore, and disaster-recovery evidence maintained in:

```text
docs/operations/p5_4_backup_restore_dr_pack.md
docs/operations/p5_4_backup_restore_evidence_record.md
docs/operations/p5_4_dr_rehearsal_rpo_rto_record.md
docs/operations/p5_4_recovery_ownership_escalation_record.md
docs/operations/p5_4_backup_restore_dr_runbook.md
```

The P5-4 evidence set expands `EV-FINAL-009`, `EV-FINAL-014`, `EV-FINAL-015`, and `EV-FINAL-017` with `P5-DR-001` through `P5-DR-012`, covering backup ownership, PostgreSQL backup evidence, PostgreSQL restore rehearsal, object-storage backup evidence, object-storage restore rehearsal, configuration and secret recovery ownership, RPO/RTO definition and measurement, disaster recovery scenario rehearsal, governance recovery validation, recovery escalation, DR accepted-risk review, and final human DR signoff.

AI/n8n/service actors cannot accept backup evidence, approve restore readiness, approve DR signoff, accept residual DR risk, close DR gaps, waive missing recovery evidence, sign recovery readiness, or authorize production go-live.


## 11. P5-5 Performance, Scale, and Data Lifecycle Mapping

P5-5 adds detailed performance, reliability, scale, and data-lifecycle evidence maintained in:

```text
docs/operations/p5_5_performance_scale_data_lifecycle_pack.md
docs/operations/p5_5_performance_reliability_evidence_record.md
docs/operations/p5_5_data_lifecycle_retention_record.md
docs/operations/p5_5_capacity_query_review_record.md
docs/operations/p5_5_performance_scale_data_lifecycle_runbook.md
```

The P5-5 evidence set expands `EV-FINAL-002`, `EV-FINAL-003`, `EV-FINAL-004`, `EV-FINAL-007`, `EV-FINAL-014`, `EV-FINAL-016`, and `EV-FINAL-017` with `P5-PERF-001` through `P5-PERF-012`, covering performance baseline ownership, API load smoke testing, report export throughput, object-storage upload/download throughput, database query and pagination review, frontend route responsiveness, capacity assumptions, timeout/retry/error policy, data retention matrix, archive/export/purge lifecycle procedure, performance/lifecycle accepted-risk review, and final human performance/lifecycle signoff.

AI/n8n/service actors cannot accept performance evidence, approve performance readiness, approve data-retention exceptions, close lifecycle gaps, accept residual performance risk, waive missing lifecycle evidence, sign performance/lifecycle readiness, or authorize production go-live.
