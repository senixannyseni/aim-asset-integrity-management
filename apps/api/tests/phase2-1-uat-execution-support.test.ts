import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function repoPath(relativePath: string): string {
  return path.join(repoRoot, relativePath);
}

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(repoPath(relativePath), 'utf8');
}

function expectFileExists(relativePath: string): void {
  expect(fs.existsSync(repoPath(relativePath)), `missing ${relativePath}`).toBe(true);
}

function expectContainsAll(content: string, tokens: readonly string[]): void {
  const normalized = content.toLowerCase();
  for (const token of tokens) {
    expect(normalized, `missing token: ${token}`).toContain(token.toLowerCase());
  }
}

function expectNoObviousSecrets(relativePath: string, content: string) {
  const forbiddenPatterns = [
    /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{4,}['"]/i,
    /(?:secret|client_secret|jwt_secret|refresh_token_secret)\s*[:=]\s*['"][^'"]{4,}['"]/i,
    /(?:access[_-]?key|secret[_-]?key)\s*[:=]\s*['"][^'"]{4,}['"]/i,
    /(?:api[_-]?key|token)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    /AKIA[0-9A-Z]{16}/,
    /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/i,
    /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/i,
    /mongodb(?:\+srv)?:\/\/[^:\s]+:[^@\s]+@/i
  ];

  for (const pattern of forbiddenPatterns) {
    expect(pattern.test(content), `${relativePath} contains an obvious secret-like token: ${pattern}`).toBe(false);
  }
}

function expectNoOutOfScopeImplementationClaim(relativePath: string, content: string): void {
  const forbiddenClaimPatterns = [
    /implemented\s+(full\s+)?api\s*579/i,
    /implements\s+(full\s+)?api\s*579/i,
    /implemented\s+(full\s+)?api\s*581/i,
    /implements\s+(full\s+)?api\s*581/i,
    /implemented\s+(external\s+)?(sap|maximo|cmms)\s+integration/i,
    /implements\s+(external\s+)?(sap|maximo|cmms)\s+integration/i,
    /production\s+(sap|maximo|cmms)\s+integration\s+(is\s+)?(implemented|enabled|active)/i,
    /implemented\s+3d\s+processing/i,
    /implements\s+3d\s+processing/i,
    /frontend\s+ui\s+implementation\s+(is\s+)?(complete|implemented|added)/i,
    /invented\s+api\/asme\s+formula\s+(implemented|added|enabled)/i,
    /new\s+api\/asme\s+formula\s+(implemented|added|enabled)/i
  ];

  for (const pattern of forbiddenClaimPatterns) {
    expect(pattern.test(content), `${relativePath} contains forbidden out-of-scope implementation claim: ${pattern}`).toBe(false);
  }
}

const phase20Docs = [
  'docs/uat/uat_scripts.md',
  'docs/uat/uat_traceability_matrix.md',
  'docs/sample_data/sample_dataset_manifest.md',
  'docs/deployment/deployment_runbook.md',
  'docs/deployment/migration_plan.md',
  'docs/deployment/go_live_checklist.md',
  'docs/training/user_training_pack.md',
  'docs/release/phase2_0_release_readiness_report.md'
] as const;

const phase21Docs = [
  'docs/sample_data/uat_seed_execution_guide.md',
  'docs/uat/uat_execution_results_template.md',
  'docs/uat/uat_smoke_test_guide.md',
  'docs/uat/uat_defect_triage_guide.md'
] as const;

describe('Phase 2.1 controlled UAT dataset and execution support', () => {
  it('keeps Phase 2.0 release readiness documents present', () => {
    for (const relativePath of phase20Docs) {
      expectFileExists(relativePath);
      expect(readRepoFile(relativePath).trim().length, `${relativePath} should not be empty`).toBeGreaterThan(300);
    }
  });

  it('adds controlled synthetic UAT seed without obvious secrets or out-of-scope implementation claims', () => {
    const seedPath = 'db/seeds/0002_uat_sample_data.sql';
    expectFileExists(seedPath);
    const seed = readRepoFile(seedPath);
    expectContainsAll(seed, [
      'UAT/sample only',
      'Synthetic data only',
      'Not for production',
      'No real client data',
      'No credentials',
      'No production object storage URI',
      'No real evidence files',
      'AIM-UAT-T-001',
      'aboveground_storage_tank',
      'extraction_jobs',
      'extraction_fields',
      'staging_records',
      'manual_overrides',
      'data_quality_checks',
      'formula_versions',
      'calculation_validation_cases',
      'calculation_runs',
      'integrity_decisions',
      'reports',
      'internal_work_orders',
      'workflow_events',
      'error_logs',
      'audit_logs',
      'uat.ai.agent@example.test',
      'uat.n8n.service@example.test',
      'uat-fixture://',
      'Engineering review required before final use.'
    ]);
    expectNoObviousSecrets(seedPath, seed);
    expectNoOutOfScopeImplementationClaim(seedPath, seed);
    expect(seed).not.toMatch(/external_cmms_reference\s*=\s*'[^']+'/i);
    expect(seed).not.toMatch(/external_cmms_status\s*=\s*'[^']+'/i);
  });

  it('documents UAT seed execution, validation queries, rollback, and fixture evidence warnings', () => {
    const guidePath = 'docs/sample_data/uat_seed_execution_guide.md';
    expectFileExists(guidePath);
    const guide = readRepoFile(guidePath);
    expectContainsAll(guide, [
      'when all of the following are true',
      'Do not use this seed in production',
      'Prerequisites',
      'Apply the UAT Seed',
      'psql',
      'Expected Records Created',
      'Validation SQL Queries',
      'Rollback / Cleanup Notes',
      'Evidence Fixture Warning',
      'uat-fixture://',
      'manual_overrides',
      'external CMMS fields remain null'
    ]);
    expectNoObviousSecrets(guidePath, guide);
    expectNoOutOfScopeImplementationClaim(guidePath, guide);
  });

  it('provides UAT execution result template with pass/fail, defect, audit, workflow, sign-off, and retest fields', () => {
    const templatePath = 'docs/uat/uat_execution_results_template.md';
    expectFileExists(templatePath);
    const template = readRepoFile(templatePath);
    expectContainsAll(template, [
      'UAT Cycle',
      'Environment',
      'Build / Commit / Tag',
      'Tester',
      'Role Used',
      'Test Case ID',
      'pass/fail/blocked/not run',
      'Defect ID',
      'Screenshot / Evidence Link',
      'Audit Log Reference',
      'Workflow / Error Log Reference',
      'Reviewer Sign-Off',
      'Retest Result',
      'Passed',
      'Failed',
      'Blocked cases',
      'Critical defects',
      'Governance defects',
      'Go/No-Go Recommendation'
    ]);
  });

  it('provides smoke test guide for auth, evidence, extraction, calculation, report, work-order, workflow, error, and audit checks', () => {
    const smokePath = 'docs/uat/uat_smoke_test_guide.md';
    expectFileExists(smokePath);
    const smoke = readRepoFile(smokePath);
    expectContainsAll(smoke, [
      'PowerShell',
      'API Health',
      'Login Smoke Test',
      'Auth / Me Smoke Test',
      'RBAC Denied Action Smoke Test',
      'Evidence Metadata Route',
      'Extraction Job Route',
      'Staging Review Route',
      'Calculation Route',
      'Report Gate Route',
      'Work Order Route',
      'Workflow Event Route',
      'Error Log Route',
      'Audit Log Read Route',
      'REPORT_GATES_NOT_SATISFIED',
      'REPORT_ISSUE_BLOCKED',
      'external SAP/Maximo/CMMS integration must not be invoked'
    ]);
    expectNoObviousSecrets(smokePath, smoke);
    expectNoOutOfScopeImplementationClaim(smokePath, smoke);
  });

  it('provides defect triage guide with governance defect handling', () => {
    const triagePath = 'docs/uat/uat_defect_triage_guide.md';
    expectFileExists(triagePath);
    const triage = readRepoFile(triagePath);
    expectContainsAll(triage, [
      'blocker',
      'critical',
      'major',
      'minor',
      'cosmetic',
      'governance defect',
      'data defect',
      'test data issue',
      'environment issue',
      'Triage Workflow',
      'preserve audit trail',
      'AI promoted final data',
      'Missing audit log',
      'Report issued without gates',
      'Evidence deletion bypassed',
      'n8n direct DB access',
      'Calculation run without approved formula version',
      'Work order closed without required note/evidence',
      'Closure Criteria'
    ]);
    expectNoOutOfScopeImplementationClaim(triagePath, triage);
  });

  it('updates release readiness report with Phase 2.1 follow-up note', () => {
    const reportPath = 'docs/release/phase2_0_release_readiness_report.md';
    expectFileExists(reportPath);
    const report = readRepoFile(reportPath);
    expectContainsAll(report, [
      'Phase 2.1 Follow-Up',
      'controlled UAT execution support',
      'synthetic and local/UAT only',
      'production use requires operator approval',
      'no external CMMS',
      'no invented API/ASME formula implementation'
    ]);
    expectNoOutOfScopeImplementationClaim(reportPath, report);
  });
});
