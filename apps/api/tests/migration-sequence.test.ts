import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');
const migrationsDir = path.join(repoRoot, 'db', 'migrations');

describe('database migration sequence', () => {
  it('tracks all migrations required for a clean Sprint 10 database setup', () => {
    const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();

    expect(files).toEqual([
      '0001_baseline.sql',
      '0002_tank_asset_master_data.sql',
      '0003_governance_hardening.sql',
      '0004_evidence_ndt_data_room.sql',
      '0005_engineering_validation_engine.sql',
      '0006_formula_registry_module.sql',
      '0007_deterministic_calculation_engine.sql',
      '0008_ffs_trigger_workflow.sql',
      '0009_rbi_interface_trigger_workflow.sql',
      '0010_engineering_review_approval_workflow.sql',
      '0011_report_generation_engine.sql',
      '0012_auth_rbac_skeleton.sql',
      '0013_source_truth_schema_closure.sql',
      '0014_phase1_3_ai_evidence_approval_governance.sql',
      '0015_phase1_5_calculation_governance_hardening.sql',
      '0016_phase1_6_report_issue_work_order_gates.sql',
      '0017_uat_fix_approval_records_created_at.sql',
      '0018_uat_fix_approval_record_approved_at_semantics.sql',
      '0019_allow_integrity_decision_review_gate_domain.sql',
      '0020_object_storage_evidence_hardening.sql',
      '0021_report_export_object_storage.sql',
      '0022_audit_log_governance_visibility.sql',
    ]);
  });
});

