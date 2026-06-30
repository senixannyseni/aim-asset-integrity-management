import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  assertTenantEvidenceLifecycleObjectKey,
  assertTenantExportControlApproved,
  buildTenantBackupRestoreScope,
  buildTenantEvidenceLifecyclePolicy,
  buildTenantExportControlReview,
  summarizeTenantEvidenceLifecycleGate
} from '../src/modules/tenancy/tenant-evidence-lifecycle.js';
import { buildTenantScopedObjectKey } from '../src/modules/tenancy/tenant-object-boundary.js';
import { TenantContextError } from '../src/modules/tenancy/tenant-context.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function expectFile(relativePath: string): string {
  const absolutePath = path.join(repoRoot, relativePath);
  expect(fs.existsSync(absolutePath), `${relativePath} should exist`).toBe(true);
  return fs.readFileSync(absolutePath, 'utf8');
}

const tenant = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  tenantSlug: 'alpha'
};

describe('enterprise multi-tenant runtime Sprint 5 evidence lifecycle backup restore and export controls', () => {
  it('adds Sprint 5 lifecycle module, migration, docs, runbook, and evidence records', () => {
    const module = expectFile('apps/api/src/modules/tenancy/tenant-evidence-lifecycle.ts');
    const migration = expectFile('db/migrations/0032_enterprise_multitenant_sprint5_evidence_lifecycle_export_controls.sql');
    const pack = expectFile('docs/enterprise/enterprise_multitenant_runtime_sprint5_evidence_lifecycle_export_controls_pack.md');
    const lifecycleRecord = expectFile('docs/enterprise/tenant_evidence_lifecycle_runtime_record.md');
    const backupRecord = expectFile('docs/enterprise/tenant_backup_restore_runtime_record.md');
    const exportRecord = expectFile('docs/enterprise/tenant_export_control_governance_record.md');
    const riskRecord = expectFile('docs/enterprise/multitenant_sprint5_evidence_lifecycle_risk_record.md');
    const runbook = expectFile('docs/operations/enterprise_multitenant_runtime_sprint5_evidence_lifecycle_export_controls_runbook.md');

    expect(module).toContain('buildTenantEvidenceLifecyclePolicy');
    expect(module).toContain('buildTenantBackupRestoreScope');
    expect(module).toContain('buildTenantExportControlReview');
    expect(module).toContain('AI/n8n/service actors cannot approve tenant export, restore, backup, or lifecycle actions.');
    expect(migration).toContain('tenant_evidence_lifecycle_policies');
    expect(migration).toContain('tenant_backup_restore_drills');
    expect(migration).toContain('tenant_export_control_reviews');
    expect(migration).toContain('0032_enterprise_multitenant_sprint5_evidence_lifecycle_export_controls.sql');
    expect(migration).toContain('AI/n8n/service actors cannot approve tenant evidence export, restore, backup, lifecycle deletion, or lifecycle policy closure');
    expect(migration).not.toContain('disable trigger user');

    expect(pack).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 5 — Tenant-Scoped Evidence Lifecycle, Backup/Restore, and Export Controls Pack');
    expect(pack).toContain('MT-S5-001');
    expect(pack).toContain('MT-S5-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept multi-tenant Sprint 5 evidence');
    expect(lifecycleRecord).toContain('Tenant Evidence Lifecycle Runtime Record');
    expect(lifecycleRecord).toContain('tenant_evidence_lifecycle_policies');
    expect(backupRecord).toContain('Tenant Backup/Restore Runtime Record');
    expect(backupRecord).toContain('tenant_backup_restore_drills');
    expect(exportRecord).toContain('Tenant Export Control Governance Record');
    expect(exportRecord).toContain('tenant_export_control_reviews');
    expect(riskRecord).toContain('MT-S5-RISK-001');
    expect(runbook).toContain('enterprise-multitenant-runtime-sprint5-evidence-lifecycle-export-controls.test.ts');
    expect(runbook).toContain('pnpm db:migrate');
  });

  it('builds tenant evidence lifecycle policy and backup/restore scopes inside tenant prefix', () => {
    const policy = buildTenantEvidenceLifecyclePolicy(tenant);
    expect(policy.tenantObjectPrefix).toBe('tenants/alpha/11111111-1111-4111-8111-111111111111');
    expect(policy.backupScopePrefix).toBe('tenants/alpha/11111111-1111-4111-8111-111111111111/backups');
    expect(policy.retentionClass).toBe('standard_7_years');
    expect(policy.retentionDays).toBe(2555);
    expect(policy.exportRequiresHumanApproval).toBe(true);
    expect(policy.restoreRequiresHumanApproval).toBe(true);
    expect(policy.deleteRequiresHumanApproval).toBe(true);
    expect(summarizeTenantEvidenceLifecycleGate(policy)).toContain('export_requires_human_approval=true');

    const scope = buildTenantBackupRestoreScope({ tenant, operationId: 'DR 2026/tenant alpha', operationType: 'dr_rehearsal' });
    expect(scope.sourcePrefix).toBe(policy.tenantObjectPrefix);
    expect(scope.restoreTargetPrefix).toContain('tenants/alpha/11111111-1111-4111-8111-111111111111/restore/DR-2026-tenant-alpha');
    expect(scope.evidencePrefix).toBe('tenants/alpha/11111111-1111-4111-8111-111111111111/evidence');
    expect(scope.reportExportPrefix).toBe('tenants/alpha/11111111-1111-4111-8111-111111111111/reports');
    expect(scope.requiresHumanApproval).toBe(true);
    expect(scope.aiOrServiceActorMayApprove).toBe(false);

    expect(() => buildTenantEvidenceLifecyclePolicy(tenant, { retentionDays: 30, archiveAfterDays: 90 })).toThrow(TenantContextError);
  });

  it('blocks cross-tenant export, restore, and object lifecycle actions unless human approved', () => {
    const allowedKey = buildTenantScopedObjectKey(tenant, 'evidence/TK-001/inspection-1/EVD-2026/file.pdf');
    const blockedKey = 'tenants/beta/22222222-2222-4222-8222-222222222222/evidence/TK-999/file.pdf';

    expect(() => assertTenantEvidenceLifecycleObjectKey(tenant, allowedKey)).not.toThrow();
    expect(() => assertTenantEvidenceLifecycleObjectKey(tenant, blockedKey)).toThrow(TenantContextError);

    const blockedReview = buildTenantExportControlReview({
      tenant,
      exportId: 'EXP-001',
      requestedObjectKeys: [allowedKey, blockedKey],
      requestedByActorType: 'service',
      purpose: 'Customer evidence export for audit support'
    });

    expect(blockedReview.status).toBe('blocked');
    expect(blockedReview.allowedObjectKeys).toEqual([allowedKey]);
    expect(blockedReview.blockedObjectKeys).toEqual([blockedKey]);
    expect(blockedReview.blockedReasons).toContain('Cross-tenant or malformed object key requested.');
    expect(blockedReview.blockedReasons).toContain('AI/n8n/service actors cannot approve tenant export, restore, backup, or lifecycle actions.');
    expect(blockedReview.blockedReasons).toContain('Human approval evidence is required before export execution.');
    expect(() => assertTenantExportControlApproved(blockedReview)).toThrow(TenantContextError);

    const approvedReview = buildTenantExportControlReview({
      tenant,
      exportId: 'EXP-002',
      requestedObjectKeys: [allowedKey],
      requestedByActorType: 'human',
      purpose: 'Customer evidence export for audit support',
      humanApprovalId: 'approval-123'
    });

    expect(approvedReview.status).toBe('approved_for_execution');
    expect(approvedReview.exportManifestKey).toBe('tenants/alpha/11111111-1111-4111-8111-111111111111/exports/EXP-002/manifest.json');
    expect(() => assertTenantExportControlApproved(approvedReview)).not.toThrow();
  });

  it('links Sprint 5 into release docs and preserves migration history', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');
    const migrationSequence = read('apps/api/tests/migration-sequence.test.ts');

    expect(readme).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 5 — Tenant-Scoped Evidence Lifecycle, Backup/Restore, and Export Controls');
    expect(readme).toContain('AI/n8n/service actors cannot accept multi-tenant Sprint 5 evidence');
    expect(sprint).toContain('MT-S5-001 through MT-S5-012');
    expect(register).toContain('Enterprise Multi-Tenant Runtime Sprint 5 Evidence Lifecycle and Export Controls Mapping');
    expect(gates).toContain('Enterprise Multi-Tenant Runtime Sprint 5 Evidence Lifecycle Gate');
    expect(roadmap).toContain('Sprint 5 adds tenant-scoped evidence lifecycle, backup/restore, and export controls');
    expect(backlog).toContain('Enterprise Multi-Tenant Runtime Sprint 5 Evidence Lifecycle Backlog Mapping');
    expect(migrationSequence).toContain('0032_enterprise_multitenant_sprint5_evidence_lifecycle_export_controls.sql');

    for (const migration of ['0028', '0029', '0030', '0031']) {
      const matching = fs.readdirSync(path.join(repoRoot, 'db/migrations')).filter((file) => file.startsWith(migration));
      expect(matching.length).toBe(1);
    }
  });

  it('avoids unsafe committed evidence examples and keeps human approval boundaries explicit', () => {
    const docs = [
      read('docs/enterprise/enterprise_multitenant_runtime_sprint5_evidence_lifecycle_export_controls_pack.md'),
      read('docs/enterprise/tenant_evidence_lifecycle_runtime_record.md'),
      read('docs/enterprise/tenant_backup_restore_runtime_record.md'),
      read('docs/enterprise/tenant_export_control_governance_record.md'),
      read('docs/enterprise/multitenant_sprint5_evidence_lifecycle_risk_record.md'),
      read('docs/operations/enterprise_multitenant_runtime_sprint5_evidence_lifecycle_export_controls_runbook.md')
    ];

    for (const content of docs) {
      expect(content).toContain('AI/n8n/service actors cannot');
      expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(content).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
      expect(content).not.toContain('postgres://admin:password');
      expect(content).not.toContain('mongodb+srv://');
      expect(content).not.toContain('4111 1111 1111 1111');
    }

    expect(docs[0]).toContain('Do not paste secrets');
    expect(docs[0]).toContain('tenant credentials');
    expect(docs[0]).toContain('customer PII');
    expect(docs[0]).toContain('real customer data');
    expect(docs[0]).toContain('tenant data');
    expect(docs[0]).toContain('tenant billing details');
    expect(docs[0]).toContain('payment processing data');
    expect(docs[0]).toContain('full API 579');
    expect(docs[0]).toContain('full API 581');
    expect(docs[0]).toContain('copied API/API-ASME formulas');
  });
});
