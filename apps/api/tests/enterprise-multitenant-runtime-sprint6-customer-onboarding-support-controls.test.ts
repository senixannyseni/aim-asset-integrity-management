import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TenantContextError } from '../src/modules/tenancy/tenant-context.js';
import {
  TENANT_ONBOARDING_REQUIRED_GATES,
  assertTenantOnboardingReadyForActivation,
  buildTenantOnboardingPlan,
  buildTenantSupportEscalationReview,
  buildTenantSupportSlaProfile,
  summarizeTenantOnboardingGate
} from '../src/modules/tenancy/tenant-onboarding-support.js';

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

const allGateKeys = [...TENANT_ONBOARDING_REQUIRED_GATES];

describe('enterprise multi-tenant runtime Sprint 6 customer onboarding runtime and support controls', () => {
  it('adds Sprint 6 onboarding module, migration, docs, runbook, and evidence records', () => {
    const module = expectFile('apps/api/src/modules/tenancy/tenant-onboarding-support.ts');
    const migration = expectFile('db/migrations/0033_enterprise_multitenant_sprint6_customer_onboarding_support_controls.sql');
    const pack = expectFile('docs/enterprise/enterprise_multitenant_runtime_sprint6_customer_onboarding_support_controls_pack.md');
    const onboardingRecord = expectFile('docs/enterprise/tenant_customer_onboarding_runtime_record.md');
    const supportRecord = expectFile('docs/enterprise/tenant_support_sla_runtime_record.md');
    const bauRecord = expectFile('docs/enterprise/tenant_bau_handoff_support_governance_record.md');
    const riskRecord = expectFile('docs/enterprise/multitenant_sprint6_customer_onboarding_risk_record.md');
    const runbook = expectFile('docs/operations/enterprise_multitenant_runtime_sprint6_customer_onboarding_support_controls_runbook.md');

    expect(module).toContain('buildTenantOnboardingPlan');
    expect(module).toContain('buildTenantSupportSlaProfile');
    expect(module).toContain('buildTenantSupportEscalationReview');
    expect(module).toContain('AI/n8n/service actors cannot approve tenant onboarding, customer activation, support SLA, or BAU handoff.');
    expect(migration).toContain('tenant_onboarding_plans');
    expect(migration).toContain('tenant_onboarding_readiness_gates');
    expect(migration).toContain('tenant_support_sla_profiles');
    expect(migration).toContain('tenant_support_escalation_reviews');
    expect(migration).toContain('0033_enterprise_multitenant_sprint6_customer_onboarding_support_controls.sql');
    expect(migration).toContain('AI/n8n/service actors cannot approve tenant onboarding, customer activation, support SLA exceptions, support escalation closure, BAU handoff, or Sprint 6 evidence acceptance');
    expect(migration).not.toContain('disable trigger user');

    expect(pack).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 6 — Customer/Tenant Onboarding Runtime and Support Controls Pack');
    expect(pack).toContain('MT-S6-001');
    expect(pack).toContain('MT-S6-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept multi-tenant Sprint 6 evidence');
    expect(onboardingRecord).toContain('Tenant Customer Onboarding Runtime Record');
    expect(onboardingRecord).toContain('tenant_onboarding_plans');
    expect(supportRecord).toContain('Tenant Support SLA Runtime Record');
    expect(supportRecord).toContain('tenant_support_sla_profiles');
    expect(bauRecord).toContain('Tenant BAU Handoff and Support Governance Record');
    expect(bauRecord).toContain('tenant_support_escalation_reviews');
    expect(riskRecord).toContain('MT-S6-RISK-001');
    expect(runbook).toContain('enterprise-multitenant-runtime-sprint6-customer-onboarding-support-controls.test.ts');
    expect(runbook).toContain('pnpm db:migrate');
  });

  it('builds support SLA and tenant onboarding readiness with human approval boundary', () => {
    const sla = buildTenantSupportSlaProfile({ tenant, profileCode: 'Enterprise SLA', supportTier: 'enterprise', timezone: 'Asia/Jakarta' });
    expect(sla.profileCode).toBe('Enterprise-SLA');
    expect(sla.supportTier).toBe('enterprise');
    expect(sla.sev1ResponseMinutes).toBe(30);
    expect(sla.customerSuccessOwnerRole).toBe('Customer Success');
    expect(sla.humanApprovalRequired).toBe(true);
    expect(sla.aiOrServiceActorMayApprove).toBe(false);

    const blockedPlan = buildTenantOnboardingPlan({
      tenant,
      customerName: 'Alpha Energy',
      supportSlaProfile: sla,
      completedGateKeys: ['tenant_context_confirmed'],
      evidenceIds: [],
      requestedByActorType: 'service'
    });

    expect(blockedPlan.status).toBe('blocked');
    expect(blockedPlan.readinessManifestObjectKey).toBe('tenants/alpha/11111111-1111-4111-8111-111111111111/onboarding/Alpha-Energy/readiness-manifest.json');
    expect(blockedPlan.missingGateKeys).toContain('human_onboarding_approval_present');
    expect(blockedPlan.blockedReasons).toContain('Tenant onboarding evidence is required before activation.');
    expect(blockedPlan.blockedReasons).toContain('AI/n8n/service actors cannot approve tenant onboarding, customer activation, support SLA, or BAU handoff.');
    expect(() => assertTenantOnboardingReadyForActivation(blockedPlan)).toThrow(TenantContextError);

    const approvedPlan = buildTenantOnboardingPlan({
      tenant,
      customerName: 'Alpha Energy',
      supportSlaProfile: sla,
      completedGateKeys: allGateKeys,
      evidenceIds: ['MT-S6-001', 'MT-S6-002', 'MT-S6-003'],
      requestedByActorType: 'human',
      humanApprovalId: 'approval-tenant-onboarding-001'
    });

    expect(approvedPlan.status).toBe('approved_for_activation');
    expect(approvedPlan.onboardingStage).toBe('ready_for_activation');
    expect(approvedPlan.missingGateKeys).toEqual([]);
    expect(summarizeTenantOnboardingGate(approvedPlan)).toContain('ai_or_service_actor_may_approve=false');
    expect(() => assertTenantOnboardingReadyForActivation(approvedPlan)).not.toThrow();
  });

  it('keeps support escalation and BAU handoff human controlled', () => {
    const sla = buildTenantSupportSlaProfile({ tenant, profileCode: 'premium-sla', supportTier: 'premium' });

    const blockedReview = buildTenantSupportEscalationReview({
      tenant,
      supportSlaProfile: sla,
      supportCaseReference: 'CASE 001 / alpha',
      severity: 'sev1',
      requestedByActorType: 'n8n'
    });

    expect(blockedReview.status).toBe('requires_human_triage');
    expect(blockedReview.supportCaseReference).toBe('CASE-001-alpha');
    expect(blockedReview.caseEvidenceObjectKey).toBe('tenants/alpha/11111111-1111-4111-8111-111111111111/support/CASE-001-alpha/review.json');
    expect(blockedReview.responseTargetMinutes).toBe(60);
    expect(blockedReview.blockedReasons).toContain('AI/n8n/service actors cannot close tenant support escalation, SLA exception, or BAU handoff reviews.');
    expect(blockedReview.aiOrServiceActorMayClose).toBe(false);

    const approvedReview = buildTenantSupportEscalationReview({
      tenant,
      supportSlaProfile: sla,
      supportCaseReference: 'CASE-002',
      severity: 'sev2',
      requestedByActorType: 'human',
      humanApprovalId: 'approval-support-001'
    });

    expect(approvedReview.status).toBe('approved_for_bau_handoff');
    expect(approvedReview.responseTargetMinutes).toBe(240);
    expect(approvedReview.humanApprovalRequired).toBe(true);
  });

  it('links Sprint 6 into release docs and preserves forward-only migration history', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');
    const migrationSequence = read('apps/api/tests/migration-sequence.test.ts');

    expect(readme).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 6 — Customer/Tenant Onboarding Runtime and Support Controls');
    expect(readme).toContain('AI/n8n/service actors cannot accept multi-tenant Sprint 6 evidence');
    expect(sprint).toContain('MT-S6-001 through MT-S6-012');
    expect(register).toContain('Enterprise Multi-Tenant Runtime Sprint 6 Customer Onboarding and Support Controls Mapping');
    expect(gates).toContain('Enterprise Multi-Tenant Runtime Sprint 6 Customer Onboarding Gate');
    expect(roadmap).toContain('Sprint 6 adds tenant/customer onboarding runtime and support controls');
    expect(backlog).toContain('Enterprise Multi-Tenant Runtime Sprint 6 Customer Onboarding Backlog Mapping');
    expect(migrationSequence).toContain('0033_enterprise_multitenant_sprint6_customer_onboarding_support_controls.sql');

    for (const migration of ['0028', '0029', '0030', '0031', '0032']) {
      const matching = fs.readdirSync(path.join(repoRoot, 'db/migrations')).filter((file) => file.startsWith(migration));
      expect(matching.length).toBe(1);
    }
  });

  it('avoids unsafe customer data examples and keeps customer activation human-only', () => {
    const docs = [
      read('docs/enterprise/enterprise_multitenant_runtime_sprint6_customer_onboarding_support_controls_pack.md'),
      read('docs/enterprise/tenant_customer_onboarding_runtime_record.md'),
      read('docs/enterprise/tenant_support_sla_runtime_record.md'),
      read('docs/enterprise/tenant_bau_handoff_support_governance_record.md'),
      read('docs/enterprise/multitenant_sprint6_customer_onboarding_risk_record.md'),
      read('docs/operations/enterprise_multitenant_runtime_sprint6_customer_onboarding_support_controls_runbook.md')
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
