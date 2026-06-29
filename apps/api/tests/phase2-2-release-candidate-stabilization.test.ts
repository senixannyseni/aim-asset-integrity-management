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
  'db/seeds/0002_uat_sample_data.sql',
  'docs/sample_data/uat_seed_execution_guide.md',
  'docs/uat/uat_execution_results_template.md',
  'docs/uat/uat_smoke_test_guide.md',
  'docs/uat/uat_defect_triage_guide.md',
  'apps/api/tests/phase2-1-uat-execution-support.test.ts'
] as const;

const phase22Docs = [
  'docs/uat/uat_dry_run_procedure.md',
  'docs/uat/uat_defect_log_template.md',
  'docs/release/release_candidate_checklist.md',
  'docs/uat/smoke_test_evidence_checklist.md',
  'docs/release/release_notes_phase2_candidate.md'
] as const;

describe('Phase 2.2 release candidate stabilization pack', () => {
  it('keeps Phase 2.0 and Phase 2.1 tests/docs present', () => {
    for (const relativePath of [...phase20Docs, ...phase21Docs]) {
      expectFileExists(relativePath);
      expect(readRepoFile(relativePath).trim().length, `${relativePath} should not be empty`).toBeGreaterThan(250);
    }
  });

  it('creates UAT dry-run procedure with entry criteria, exit criteria, and required module coverage', () => {
    const docPath = 'docs/uat/uat_dry_run_procedure.md';
    expectFileExists(docPath);
    const doc = readRepoFile(docPath);
    expectContainsAll(doc, [
      'Purpose',
      'Entry Criteria',
      'Environment Prerequisites',
      'Branch / Tag Baseline',
      'Database Migration / Seed Prerequisite',
      'UAT Seed Loading Prerequisite',
      'Role / Account Prerequisite',
      'Dry-Run Sequence by Module',
      'Expected Evidence to Capture',
      'Pass / Fail Decision Criteria',
      'Defect Logging Rules',
      'Go / No-Go Recommendation Rules',
      'Exit Criteria',
      'auth/RBAC',
      'asset/inspection setup',
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
    expectNoObviousSecrets(docPath, doc);
    expectNoOutOfScopeImplementationClaim(docPath, doc);
  });

  it('creates UAT defect log template with governance defect fields', () => {
    const docPath = 'docs/uat/uat_defect_log_template.md';
    expectFileExists(docPath);
    const doc = readRepoFile(docPath);
    expectContainsAll(doc, [
      'Defect ID',
      'Discovery Date',
      'UAT Cycle',
      'Environment',
      'Build / Commit / Tag',
      'Test Case ID',
      'Module',
      'Severity',
      'Category',
      'Title',
      'Description',
      'Steps to Reproduce',
      'Expected Result',
      'Actual Result',
      'Evidence / Screenshot Link',
      'Audit Log Reference',
      'Workflow / Error Log Reference',
      'Owner',
      'Status',
      'Fix Commit',
      'Retest Date',
      'Retest Result',
      'Closure Approval',
      'Governance Defect Flag',
      'Missing audit log',
      'AI/n8n approval bypass',
      'Report issued without gates',
      'Evidence linkage bypass',
      'Calculation without approved formula version',
      'Work order closed without required note/evidence',
      'n8n direct DB access suspicion'
    ]);
    expectNoOutOfScopeImplementationClaim(docPath, doc);
  });

  it('creates release candidate checklist with test, migration, UAT, rollback, and sign-off gates', () => {
    const docPath = 'docs/release/release_candidate_checklist.md';
    expectFileExists(docPath);
    const doc = readRepoFile(docPath);
    expectContainsAll(doc, [
      'Source Branch / Tag Confirmed',
      'Clean working tree',
      'Typecheck passed',
      'Full tests passed',
      'Phase 1 governance tests passed',
      'Phase 2.0 readiness tests passed',
      'Phase 2.1 UAT support tests passed',
      'Migration from clean DB passed',
      'Seed passed',
      'UAT sample seed applied in local/UAT only',
      'Smoke tests passed',
      'UAT dry run completed',
      'Critical/blocker defects closed',
      'Governance defects closed',
      'No out-of-scope implementation added',
      'Release notes drafted',
      'Rollback plan confirmed',
      'Sign-Off Roles Completed',
      'Product Owner',
      'Lead Engineer',
      'Approver',
      'IT Admin / DevOps',
      'UAT Lead'
    ]);
    expectNoObviousSecrets(docPath, doc);
    expectNoOutOfScopeImplementationClaim(docPath, doc);
  });

  it('creates smoke-test evidence checklist covering auth, evidence, extraction, calculation, report, work order, workflow, error, and audit', () => {
    const docPath = 'docs/uat/smoke_test_evidence_checklist.md';
    expectFileExists(docPath);
    const doc = readRepoFile(docPath);
    expectContainsAll(doc, [
      'Command / API / Page Reference',
      'Expected Result',
      'Evidence Artifact to Save',
      'Reviewer Initials',
      'Pass/Fail',
      'API health',
      'Login / auth/me',
      'RBAC denied request',
      'Evidence metadata registration',
      'Evidence link',
      'Extraction job',
      'Staging review',
      'Calculation run',
      'Calculation approval / rejection',
      'Integrity decision approval / rejection',
      'Report issue blocked',
      'Report issue success where gates pass',
      'Internal work order create / update / close',
      'Workflow event',
      'Error log',
      'Audit log'
    ]);
    expectNoObviousSecrets(docPath, doc);
    expectNoOutOfScopeImplementationClaim(docPath, doc);
  });

  it('creates release notes draft with known limitations and out-of-scope confirmation', () => {
    const docPath = 'docs/release/release_notes_phase2_candidate.md';
    expectFileExists(docPath);
    const doc = readRepoFile(docPath);
    expectContainsAll(doc, [
      'Release Summary',
      'Included Phases',
      'Governance Highlights',
      'UAT Readiness',
      'Known Limitations',
      'Out-of-Scope Confirmation',
      'Deployment Notes',
      'Rollback Note',
      'Recommended Next Action',
      'No full API 579 implementation is included',
      'No full API 581 implementation is included',
      'No SAP/Maximo/CMMS integration is included',
      'No 3D processing is included',
      'No unapproved frontend scope outside governed RC4 screens is included',
      'No invented API/ASME formulas are included'
    ]);
    expectNoObviousSecrets(docPath, doc);
    expectNoOutOfScopeImplementationClaim(docPath, doc);
  });

  it('keeps Phase 2.2 artifacts free of obvious secrets and out-of-scope implementation claims', () => {
    for (const relativePath of phase22Docs) {
      const content = readRepoFile(relativePath);
      expectNoObviousSecrets(relativePath, content);
      expectNoOutOfScopeImplementationClaim(relativePath, content);
    }
  });
});
