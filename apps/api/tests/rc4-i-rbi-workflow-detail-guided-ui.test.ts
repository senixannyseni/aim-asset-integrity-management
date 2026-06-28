import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hasPermission } from '../src/rbac/roles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function expectFile(relativePath: string): string {
  const absolutePath = path.join(repoRoot, relativePath);
  expect(fs.existsSync(absolutePath), `${relativePath} should exist`).toBe(true);
  return fs.readFileSync(absolutePath, 'utf8');
}

describe('RC4-I RBI workflow detail, guided UI, and duplicate prevention', () => {
  it('keeps RBI permissions human-governed and blocks AI finalization permissions', () => {
    expect(hasPermission(['engineer'], 'rbi.interface.create')).toBe(true);
    expect(hasPermission(['engineer'], 'rbi.interface.review')).toBe(true);
    expect(hasPermission(['senior_engineer'], 'rbi.interface.approve')).toBe(true);
    expect(hasPermission(['senior_engineer'], 'rbi.interface.export')).toBe(true);
    expect(hasPermission(['lead_engineer'], 'rbi.interface.approve')).toBe(true);
    expect(hasPermission(['lead_engineer'], 'rbi.interface.export')).toBe(true);
    expect(hasPermission(['ai_agent'], 'rbi.interface.approve')).toBe(false);
    expect(hasPermission(['ai_agent'], 'rbi.interface.export')).toBe(false);
  });

  it('adds backend RBI review, export, close, finding-history trigger, and duplicate-prevention controls', () => {
    const route = readRepoFile('apps/api/src/routes/rbi.ts');

    expect(route).toContain('source_warning_signature');
    expect(route).toContain('source_finding_signature');
    expect(route).toContain('RBI_DUPLICATE_TRIGGER_BLOCKED');
    expect(route).toContain('duplicateRbiTrigger');
    expect(route).toContain('"/rbi/cases/from-finding-history"');
    expect(route).toContain('findings_anomaly_history');
    expect(route).toContain('RBI_CASE_CREATED_FROM_FINDING_HISTORY');
    expect(route).toContain('"/rbi/cases/:caseId/review"');
    expect(route).toContain('RBI_CASE_REVIEWED');
    expect(route).toContain('"/rbi/cases/:caseId/export"');
    expect(route).toContain('RBI_CASE_EXPORTED');
    expect(route).toContain('"/rbi/cases/:caseId/close"');
    expect(route).toContain('RBI_CASE_CLOSED');
    expect(route).toContain('A comment or closure reason is required');
    expect(route).toContain('RBI_FINALIZATION_REQUIRES_SENIOR_ENGINEER');
    expect(route).toContain('RBI_REVIEW_REQUIRED_BEFORE_APPROVAL');
    expect(route).toContain('RBI_APPROVAL_REQUIRED_BEFORE_EXPORT');
    expect(route).toContain('RBI_APPROVAL_REQUIRED_BEFORE_CLOSE');
    expect(route).toContain('RBI_APPROVE_ENDPOINT_APPROVES_ONLY');
    expect(route).toContain('where id = $1::uuid or case_id = $2');
    expect(route).toContain('asset_id must be a valid UUID');
    expect(route).toContain('lead_engineer');
    expect(route).toContain('AI agents may not approve, export, close, or finalize RBI cases');
    expect(route).toContain('review_gate_enforced');
    expect(route).toContain('export_and_close_require_prior_approval');
  });

  it('connects repeated anomaly triggers to real findings history without automatic FFS/RBI formula logic', () => {
    const route = readRepoFile('apps/api/src/routes/rbi.ts');
    const findingsMigration = readRepoFile('db/migrations/0027_findings_anomaly_foundation.sql');

    expect(findingsMigration).toContain('create table if not exists findings');
    expect(route).toContain('from findings');
    expect(route).toContain('RBI-TRIG-REPEATED-ANOMALY');
    expect(route).toContain('NO_REPEATED_FINDING_HISTORY');
    expect(route).toContain('at least two relevant active findings');
    expect(route).not.toMatch(/API\s*581\s*equation|PoF\s*=|CoF\s*=|quantitative\s+API\s+RP\s+581\s+formula/i);
    expect(route).not.toMatch(/insert into ffs_cases/i);
    expect(route).not.toMatch(/insert into integrity_decisions/i);
  });

  it('adds guided RBI list UI and case detail workflow actions with placeholder risk matrix labels', () => {
    const listUi = expectFile('apps/web/app/rbi/RbiInterfaceClient.tsx');
    const detailPage = expectFile('apps/web/app/rbi/[caseId]/page.tsx');
    const detailUi = expectFile('apps/web/app/rbi/[caseId]/RbiCaseDetailClient.tsx');
    const css = expectFile('apps/web/app/globals.css');
    const migration = expectFile('db/migrations/0009_rbi_interface_trigger_workflow.sql');
    const seed = expectFile('db/seeds/0001_foundation_seed.sql');

    expect(listUi).toContain('Guided RBI Case Input');
    expect(listUi).toContain('Create from Calculation Warning');
    expect(listUi).toContain('Create from Repeated Finding History');
    expect(listUi).toContain('/api/v1/rbi/cases/from-finding-history');
    expect(listUi).toContain('Risk Matrix Placeholder');
    expect(listUi).toContain('placeholder/semi-quantitative');
    expect(listUi).toContain('Open detail');
    expect(detailPage).toContain('RbiCaseDetailClient');
    expect(detailUi).toContain('Status Update');
    expect(detailUi).toContain('Review Action');
    expect(detailUi).toContain('Final Actions');
    expect(detailUi).toContain('Close Case');
    expect(detailUi).toContain('/review');
    expect(detailUi).toContain('/export');
    expect(detailUi).toContain('/close');
    expect(detailUi).toContain('Finding History Source');
    expect(detailUi).toContain('No API RP 581 quantitative formula');
    expect(detailUi).toContain('senior-engineer/lead-engineer/admin authority');
    expect(css).toContain('.risk-matrix');
    expect(migration).toContain("where r.role_code in ('senior_engineer','lead_engineer')");
    expect(seed).toContain("where r.role_code in ('admin','senior_engineer','lead_engineer')");
  });

  it('documents OpenAPI, data dictionary, ERD, release, UAT, README, and source-of-truth alignment', () => {
    const openapi = expectFile('04_API/openapi.yaml');
    const dataDictionary = expectFile('03_Database/data_dictionary_current.md');
    const erd = expectFile('docs/erd_current.md');
    const readme = expectFile('README.md');
    const sprintStatus = expectFile('docs/sprint-status.md');
    const checklist = expectFile('docs/operations/source_of_truth_alignment_checklist.md');
    const release = expectFile('docs/release/AIM_RC4I_rbi_workflow_detail_guided_ui_report.md');
    const uat = expectFile('docs/uat/uat_rc4i_rbi_workflow_detail_guided_ui.md');
    const payload = expectFile('04_API/api_payload_examples/create_rbi_case_from_finding_history.json');

    for (const content of [openapi, dataDictionary, erd, readme, sprintStatus, checklist, release, uat, payload]) {
      expect(content).toContain('RC4-I');
      expect(content).not.toMatch(/x-full-api-581-implemented:\s*true/i);
      expect(content).not.toMatch(/quantitative API RP 581 formula is implemented/i);
    }

    expect(openapi).toContain('/api/v1/rbi/cases/from-finding-history:');
    expect(openapi).toContain('/api/v1/rbi/cases/{caseId}/review:');
    expect(openapi).toContain('/api/v1/rbi/cases/{caseId}/export:');
    expect(openapi).toContain('/api/v1/rbi/cases/{caseId}/close:');
    expect(dataDictionary).toContain('source_warning_signature');
    expect(dataDictionary).toContain('source_finding_signature');
    expect(erd).toContain('findings ||--o{ rbi_cases');
    expect(release).toContain('Future Fix items 51–57');
    expect(uat).toContain('RBI_DUPLICATE_TRIGGER_BLOCKED');
  });
});
