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

function expectNoObviousSecrets(relativePath: string, content: string): void {
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

function expectNoActualUatPassedClaim(relativePath: string, content: string): void {
  const forbiddenPassedPatterns = [
    /actual\s+uat\s+passed\s*[:=]\s*(yes|true|complete|completed)/i,
    /uat\s+cycle\s+1\s+passed\s*[:=]\s*(yes|true|complete|completed)/i,
    /all\s+uat\s+cases\s+passed/i,
    /uat\s+sign[- ]off\s+completed\s*[:=]\s*(yes|true)/i,
    /go\s+decision\s*[:=]\s*approved/i
  ];

  for (const pattern of forbiddenPassedPatterns) {
    expect(pattern.test(content), `${relativePath} claims actual UAT/sign-off passed: ${pattern}`).toBe(false);
  }
}

const priorPhaseDocsAndTests = [
  'apps/api/tests/phase2-0-release-readiness.test.ts',
  'apps/api/tests/phase2-1-uat-execution-support.test.ts',
  'apps/api/tests/phase2-2-release-candidate-stabilization.test.ts',
  'docs/uat/uat_scripts.md',
  'docs/uat/uat_traceability_matrix.md',
  'docs/sample_data/sample_dataset_manifest.md',
  'docs/deployment/deployment_runbook.md',
  'docs/deployment/migration_plan.md',
  'docs/deployment/go_live_checklist.md',
  'docs/training/user_training_pack.md',
  'db/seeds/0002_uat_sample_data.sql',
  'docs/sample_data/uat_seed_execution_guide.md',
  'docs/uat/uat_execution_results_template.md',
  'docs/uat/uat_smoke_test_guide.md',
  'docs/uat/uat_defect_triage_guide.md',
  'docs/uat/uat_dry_run_procedure.md',
  'docs/uat/uat_defect_log_template.md',
  'docs/release/release_candidate_checklist.md',
  'docs/uat/smoke_test_evidence_checklist.md',
  'docs/release/release_notes_phase2_candidate.md'
] as const;

const phase23Docs = [
  'docs/uat/uat_cycle_1_execution_plan.md',
  'docs/uat/uat_signoff_register.md',
  'docs/uat/uat_execution_summary_report.md',
  'docs/release/release_candidate_go_no_go_decision.md',
  'docs/uat/uat_evidence_package_manifest.md',
  'docs/release/hypercare_post_uat_monitoring_checklist.md'
] as const;

describe('Phase 2.3 controlled UAT execution and release candidate sign-off pack', () => {
  it('keeps Phase 2.0, Phase 2.1, and Phase 2.2 tests/docs present', () => {
    for (const relativePath of priorPhaseDocsAndTests) {
      expectFileExists(relativePath);
      expect(readRepoFile(relativePath).trim().length, `${relativePath} should not be empty`).toBeGreaterThan(250);
    }
  });

  it('creates UAT Cycle 1 execution plan with entry/exit criteria, sequence, triage, evidence, and stop-the-line conditions', () => {
    const docPath = 'docs/uat/uat_cycle_1_execution_plan.md';
    expectFileExists(docPath);
    const doc = readRepoFile(docPath);
    expectContainsAll(doc, [
      'Purpose',
      'UAT Cycle Scope',
      'Environment Assumptions',
      'Branch / Tag / Build Baseline',
      'Entry Criteria',
      'Roles and Responsibilities',
      'Required UAT Accounts',
      'Required Synthetic UAT Data',
      'Dry-Run Prerequisite',
      'UAT Execution Sequence',
      'Daily Execution Routine',
      'Defect Triage Routine',
      'Evidence Capture Requirements',
      'Audit / Workflow / Error Log Evidence Requirements',
      'Stop-the-Line Governance Conditions',
      'Exit Criteria',
      'Go / No-Go Decision Input',
      'auth/RBAC',
      'asset and inspection setup',
      'evidence metadata and linkage',
      'AI extraction/staging review',
      'manual override',
      'NDT/reviewed measurement path',
      'calculation governance',
      'integrity decision',
      'report issue gates',
      'internal work order fallback',
      'workflow/error logs',
      'audit logs'
    ]);
    expectNoActualUatPassedClaim(docPath, doc);
    expectNoObviousSecrets(docPath, doc);
    expectNoOutOfScopeImplementationClaim(docPath, doc);
  });

  it('creates UAT sign-off register with required roles and conditional/rejected sign-off states', () => {
    const docPath = 'docs/uat/uat_signoff_register.md';
    expectFileExists(docPath);
    const doc = readRepoFile(docPath);
    expectContainsAll(doc, [
      'Product Owner',
      'Lead Engineer',
      'Approver',
      'IT Admin / DevOps',
      'UAT Lead',
      'Security Owner if applicable',
      'name',
      'role',
      'sign-off decision: approved / approved with conditions / rejected',
      'date',
      'scope reviewed',
      'open defects accepted',
      'governance exceptions accepted',
      'comments',
      'signature field',
      'No one may sign off if unresolved blocker, critical, or governance defect remains unless formally accepted with documented risk and owner approval'
    ]);
    expectNoActualUatPassedClaim(docPath, doc);
    expectNoObviousSecrets(docPath, doc);
    expectNoOutOfScopeImplementationClaim(docPath, doc);
  });

  it('creates UAT execution summary report template with counts, defects, governance summary, logs, and go/no-go recommendation', () => {
    const docPath = 'docs/uat/uat_execution_summary_report.md';
    expectFileExists(docPath);
    const doc = readRepoFile(docPath);
    expectContainsAll(doc, [
      'Template until actual UAT evidence is filled in',
      'UAT cycle',
      'environment',
      'Build / Commit / Tag',
      'Execution dates',
      'Scope Executed',
      'Cases planned',
      'Cases executed',
      'Cases passed',
      'Cases failed',
      'Cases blocked',
      'Cases not run',
      'Defect Summary by Severity',
      'Governance Defect Summary',
      'Unresolved Defect List',
      'Accepted Risk List',
      'Evidence Package Location',
      'Audit / Workflow / Error Log Verification Summary',
      'Go / No-Go Recommendation',
      'Sign-Off Status'
    ]);
    expectNoActualUatPassedClaim(docPath, doc);
    expectNoObviousSecrets(docPath, doc);
    expectNoOutOfScopeImplementationClaim(docPath, doc);
  });

  it('creates release candidate go/no-go decision template with required no-go triggers and final sign-off table', () => {
    const docPath = 'docs/release/release_candidate_go_no_go_decision.md';
    expectFileExists(docPath);
    const doc = readRepoFile(docPath);
    expectContainsAll(doc, [
      'release candidate identifier',
      'source branch / tag / commit',
      'decision date',
      'decision owner',
      'Technical Readiness Summary',
      'UAT Readiness Summary',
      'Migration Readiness Summary',
      'Rollback Readiness Summary',
      'Security Readiness Summary',
      'Governance Readiness Summary',
      'Known Limitations',
      'Open Defects',
      'Accepted Risks',
      'No-Go Conditions',
      'Go Decision',
      'Conditional Go Decision',
      'No-Go Decision',
      'Final Sign-Off Table',
      'Report can be issued without gates',
      'AI/n8n can approve or finalize engineering data',
      'Staging can promote without engineer review',
      'Calculation can run/approve without explicit approved formula version',
      'Evidence linkage can be bypassed',
      'Audit log missing for controlled action',
      'n8n has direct PostgreSQL write access',
      'Work order can close without required note/evidence',
      'Secrets or production credentials committed',
      'Full API 579/API 581/external CMMS/3D/frontend UI/invented formula implementation claim appears unexpectedly'
    ]);
    expectNoActualUatPassedClaim(docPath, doc);
    expectNoObviousSecrets(docPath, doc);
    expectNoOutOfScopeImplementationClaim(docPath, doc);
  });

  it('creates UAT evidence package manifest with folder convention and secret/confidential-data warning', () => {
    const docPath = 'docs/uat/uat_evidence_package_manifest.md';
    expectFileExists(docPath);
    const doc = readRepoFile(docPath);
    expectContainsAll(doc, [
      '/uat_evidence/{cycle}/{date}/{artifact_type}/',
      'test execution results',
      'screenshots or API responses',
      'smoke-test evidence checklist',
      'defect log',
      'audit log exports/references',
      'workflow event references',
      'error log references',
      'migration/seed logs',
      'typecheck/test outputs',
      'release candidate checklist',
      'sign-off register',
      'go/no-go decision',
      'must not contain secrets',
      'real client data',
      'production object storage paths',
      'confidential evidence files'
    ]);
    expectNoActualUatPassedClaim(docPath, doc);
    expectNoObviousSecrets(docPath, doc);
    expectNoOutOfScopeImplementationClaim(docPath, doc);
  });

  it('creates hypercare checklist with monitoring, rollback, and incident escalation coverage', () => {
    const docPath = 'docs/release/hypercare_post_uat_monitoring_checklist.md';
    expectFileExists(docPath);
    const doc = readRepoFile(docPath);
    expectContainsAll(doc, [
      'Hypercare Duration',
      'Owner Roles',
      'Daily Checks',
      'Error Log Checks',
      'Workflow Event Checks',
      'Audit Log Spot Checks',
      'Evidence Access Checks',
      'Report Gate Checks',
      'Work Order Closure Checks',
      'Backup / Restore Checks',
      'Incident Escalation',
      'Rollback Trigger',
      'Post-UAT Lessons Learned',
      'error log',
      'workflow event',
      'audit log',
      'evidence access',
      'report gate',
      'work order closure',
      'backup/restore',
      'rollback trigger',
      'incident escalation'
    ]);
    expectNoActualUatPassedClaim(docPath, doc);
    expectNoObviousSecrets(docPath, doc);
    expectNoOutOfScopeImplementationClaim(docPath, doc);
  });

  it('keeps Phase 2.3 artifacts free of actual UAT pass claims, obvious secrets, and out-of-scope implementation claims', () => {
    for (const relativePath of phase23Docs) {
      const content = readRepoFile(relativePath);
      expectNoActualUatPassedClaim(relativePath, content);
      expectNoObviousSecrets(relativePath, content);
      expectNoOutOfScopeImplementationClaim(relativePath, content);
    }
  });
});
