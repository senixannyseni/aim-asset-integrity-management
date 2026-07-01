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

function expectNoImplementationClaim(relativePath: string, content: string): void {
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
    expect(pattern.test(content), `${relativePath} contains a forbidden out-of-scope implementation claim: ${pattern}`).toBe(false);
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

describe('Phase 2.0 release readiness pack', () => {
  it('creates all required Phase 2.0 release readiness documents', () => {
    for (const relativePath of phase20Docs) {
      expectFileExists(relativePath);
      expect(readRepoFile(relativePath).trim().length, `${relativePath} should not be empty`).toBeGreaterThan(500);
    }
  });

  it('provides UAT scripts for the controlled end-to-end AIM journey', () => {
    const uat = readRepoFile('docs/uat/uat_scripts.md');
    expectContainsAll(uat, [
      'UAT-AUTH-001',
      'Authentication and RBAC',
      'Asset and inspection setup',
      'Evidence governance',
      'AI extraction and staging',
      'Human review and manual override',
      'NDT / reviewed measurement path',
      'Calculation governance',
      'Integrity decision',
      'Report approval and issue gates',
      'Internal work order fallback',
      'n8n workflow/error boundary',
      'Audit verification',
      'REPORT_ISSUE_COMMENT_REQUIRED',
      'REPORT_ISSUE_BLOCKED',
      'REPORT_GATES_NOT_SATISFIED',
      'Engineering review required before final use.',
      'Pass/Fail',
      'Evidence/Screenshot',
      'Reviewer/Sign-off'
    ]);
  });

  it('maps UAT cases to source requirements, roles, endpoints, tables, audit expectations, and coverage status', () => {
    const matrix = readRepoFile('docs/uat/uat_traceability_matrix.md');
    expectContainsAll(matrix, [
      'PRD / Source Requirement',
      'Module',
      'Role',
      'Endpoint or Document Section',
      'Table / Entity',
      'Audit Requirement',
      'Status',
      'UAT-AUTH-001',
      'UAT-EVID-001',
      'UAT-AI-002',
      'UAT-REVIEW-002',
      'UAT-CALC-001',
      'UAT-DEC-002',
      'UAT-REPORT-001',
      'UAT-WO-003',
      'UAT-N8N-003',
      'UAT-AUDIT-001',
      'covered',
      'partial'
    ]);
  });

  it('defines a synthetic-only sample dataset manifest with required UAT entities and no obvious secrets', () => {
    const manifest = readRepoFile('docs/sample_data/sample_dataset_manifest.md');
    expectContainsAll(manifest, [
      'Synthetic Data Warning',
      'synthetic only',
      'example.test',
      'Admin',
      'Inspector',
      'Engineer',
      'Lead Engineer',
      'Approver',
      'IT Admin',
      'Management',
      'ai_agent',
      'n8n_service',
      'AIM-UAT-T-001',
      'atmospheric_storage_tank',
      'Evidence Metadata Fixtures',
      'Evidence Links',
      'Extraction Job and Fields',
      'manual_overrides',
      'Data Quality Check',
      'Formula Version Fixture',
      'Calculation Validation Case References',
      'Integrity Decision Sample',
      'Report Lifecycle Sample',
      'Internal Work Order Sample',
      'Workflow Event and Error Log Samples'
    ]);
    expect(manifest).not.toMatch(/AKIA[0-9A-Z]{16}/);
    expect(manifest).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
    expect(manifest).not.toMatch(/password\s*[:=]\s*['"][^'"]+['"]/i);
  });

  it('documents deployment prerequisites, environment variables, startup, tests, rollback, and troubleshooting', () => {
    const runbook = readRepoFile('docs/deployment/deployment_runbook.md');
    expectContainsAll(runbook, [
      'Purpose and Audience',
      'Prerequisites',
      'Environment Variables',
      'DATABASE_URL',
      'JWT_SECRET',
      'REFRESH_TOKEN_SECRET',
      'NODE_ENV',
      'API_PORT',
      'CORS_ORIGIN',
      'OBJECT_STORAGE_ENDPOINT',
      'OBJECT_STORAGE_BUCKET',
      'OBJECT_STORAGE_ACCESS_KEY',
      'OBJECT_STORAGE_SECRET_KEY',
      'SIGNED_URL_EXPIRY_SECONDS',
      'N8N_WEBHOOK_SECRET',
      'LOG_LEVEL',
      'Local Startup Sequence',
      'Test Commands',
      'Deployment Sequence',
      'Rollback Procedure',
      'Troubleshooting',
      'DB Port Not Reachable',
      'migration failed',
      'seed failed',
      'JWT Login Failed',
      'Object Storage Signed URL Failed',
      'Report Issue Gate Blocked',
      'Work Order Close Blocked'
    ]);
  });

  it('documents clean DB setup, upgrade path, validation checks, rollback, and migration acceptance criteria', () => {
    const migrationPlan = readRepoFile('docs/deployment/migration_plan.md');
    expectContainsAll(migrationPlan, [
      'Migration Baseline',
      'Clean Database Setup',
      'Upgrade Path',
      'Validation Queries and Checks',
      'Core Tables Exist',
      'Required Permissions Exist',
      'Required Roles Exist',
      'Formula Version and Calculation Governance',
      'Audit / Workflow / Error Tables',
      'Report Gate Columns',
      'Work Order Gate Columns',
      'Rollback and Restore',
      'Migration Acceptance Criteria',
      'No Data-Destructive Change Confirmation',
      '0016_phase1_6_report_issue_work_order_gates.sql',
      'n8n must not run migrations'
    ]);
  });

  it('provides go-live checklist coverage for governance, technical, security, UAT, operational, and sign-off gates', () => {
    const checklist = readRepoFile('docs/deployment/go_live_checklist.md');
    expectContainsAll(checklist, [
      'Governance Readiness',
      'Technical Readiness',
      'Security Readiness',
      'UAT Readiness',
      'Operational Readiness',
      'Sign-Off Roles',
      'Product Owner',
      'Lead Engineer',
      'Approver',
      'IT Admin / DevOps',
      'Security Owner',
      'UAT Lead',
      'Go / No-Go Rule',
      'n8n has direct PostgreSQL credentials',
      'Report can be issued with failed gates',
      'Audit logs are missing'
    ]);
  });

  it('provides role-based training for all required roles and reinforces governance boundaries', () => {
    const training = readRepoFile('docs/training/user_training_pack.md');
    expectContainsAll(training, [
      'Admin Training',
      'Inspector Training',
      'Engineer Training',
      'Lead Engineer Training',
      'Approver Training',
      'IT Admin Training',
      'Management Training',
      'AI is extraction/staging assistance only',
      'AI confidence is not engineering approval',
      'Calculations require explicit approved formula version',
      'Engineering review required before final use.',
      'Report issue is blocked until required gates pass',
      'n8n is orchestration only',
      'Internal work orders are the MVP fallback',
      'Evidence linkage is mandatory',
      'Audit logs are expected'
    ]);
  });

  it('summarizes deliverables, readiness status, remaining gaps, out-of-scope confirmation, and next sprint', () => {
    const report = readRepoFile('docs/release/phase2_0_release_readiness_report.md');
    expectContainsAll(report, [
      'Sprint Objective',
      'Source-of-Truth Basis',
      'Changed Files',
      'Deliverables Created',
      'UAT Coverage Summary',
      'Deployment Readiness Summary',
      'Migration Readiness Summary',
      'Training Readiness Summary',
      'Go-Live Readiness Summary',
      'Remaining Gaps',
      'Explicit Out-of-Scope Confirmation',
      'Recommended Next Sprint',
      'Phase 2.1',
      'full API 579 implementation',
      'full API 581 implementation',
      'SAP/Maximo/CMMS integration',
      '3D processing',
      'unapproved frontend scope outside governed RC4 screens',
      'invented API/ASME formulas'
    ]);
  });

  it('keeps optional UAT SQL seed controlled when added by Phase 2.1', () => {
    const seedPath = 'db/seeds/0002_uat_sample_data.sql';

    if (!fs.existsSync(repoPath(seedPath))) {
      expect(fs.existsSync(repoPath(seedPath))).toBe(false);
      return;
    }

    const seed = readRepoFile(seedPath);

    expectContainsAll(seed, [
      'UAT/sample only',
      'Synthetic data only',
      'Not for production',
      'No real client data',
      'No credentials',
      'No production object storage URI',
      'No real evidence files'
    ]);

    expectNoImplementationClaim(seedPath, seed);
  });

  it('keeps out-of-scope topics as boundary/future/out-of-scope statements rather than implementation claims', () => {
    for (const relativePath of phase20Docs) {
      expectNoImplementationClaim(relativePath, readRepoFile(relativePath));
    }
  });
});
