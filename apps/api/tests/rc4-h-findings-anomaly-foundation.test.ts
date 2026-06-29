import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hasPermission } from '../src/rbac/roles.js';

const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function expectFile(relativePath: string): string {
  const absolutePath = path.join(repoRoot, relativePath);
  expect(fs.existsSync(absolutePath), `${relativePath} should exist`).toBe(true);
  return fs.readFileSync(absolutePath, 'utf8');
}

describe('RC4-H findings / anomaly foundation', () => {
  it('adds findings database foundation, permissions, and migration tracking', () => {
    const migration = expectFile('db/migrations/0027_findings_anomaly_foundation.sql');
    const migrationSequence = readRepoFile('apps/api/tests/migration-sequence.test.ts');
    const roles = readRepoFile('apps/api/src/rbac/roles.ts');

    expect(migration).toContain('create table if not exists findings');
    expect(migration).toContain('finding_code');
    expect(migration).toContain('asset_id uuid not null references assets');
    expect(migration).toContain('evidence_file_id uuid references evidence_files');
    expect(migration).toContain('ndt_measurement_id uuid references ndt_measurements');
    expect(migration).toContain('calculation_run_id uuid references calculation_runs');
    expect(migration).toContain('validation_run_id uuid references validation_runs');
    expect(migration).toContain('closure_reason');
    expect(migration).toContain('finding.read');
    expect(migration).toContain('finding.create');
    expect(migration).toContain('finding.update');
    expect(migration).toContain('finding.close');
    expect(migrationSequence).toContain('0027_findings_anomaly_foundation.sql');
    expect(roles).toContain('finding.read');
    expect(roles).toContain('finding.close');
  });

  it('enforces human findings permissions without granting AI closure authority', () => {
    expect(hasPermission(['engineer'], 'finding.create')).toBe(true);
    expect(hasPermission(['senior_engineer'], 'finding.close')).toBe(true);
    expect(hasPermission(['lead_engineer'], 'finding.close')).toBe(true);
    expect(hasPermission(['client_viewer'], 'finding.read')).toBe(true);
    expect(hasPermission(['ai_agent'], 'finding.close')).toBe(false);
    expect(hasPermission(['ai_agent'], 'finding.create')).toBe(false);
  });

  it('adds findings API routes with same-asset linkage and closure guardrails', () => {
    const app = readRepoFile('apps/api/src/app.ts');
    const route = expectFile('apps/api/src/routes/findings.ts');

    expect(app).toContain('findingsRouter');
    expect(app).toContain("app.use('/api/v1', findingsRouter)");
    expect(route).toContain("findingsRouter.get('/findings'");
    expect(route).toContain("findingsRouter.get('/findings/:findingId'");
    expect(route).toContain("findingsRouter.post('/findings'");
    expect(route).toContain("findingsRouter.patch('/findings/:findingId'");
    expect(route).toContain("findingsRouter.get('/assets/:assetId/findings'");
    expect(route).toContain("findingsRouter.post('/findings/:findingId/links/evidence'");
    expect(route).toContain("findingsRouter.delete('/findings/:findingId/links/evidence/:evidenceFileId'");
    expect(route).toContain("requirePermission('finding.read')");
    expect(route).toContain("requirePermission('finding.create')");
    expect(route).toContain("requirePermission('finding.update')");
    expect(route).toContain('assertSameAssetLink');
    expect(route).toContain('CROSS_ASSET_LINK_BLOCKED');
    expect(route).toContain('canCloseFinding');
    expect(route).toContain('FINDING_CLOSE_PERMISSION_REQUIRED');
    expect(route).toContain('FINDING_CLOSE_BLOCKED_FOR_SERVICE_ACTOR');
    expect(route).toContain('CLOSURE_REASON_REQUIRED');
    expect(route).toContain('CRITICAL_FINDING_EVIDENCE_REQUIRED');
    expect(route).toContain('finding.cross_asset_link_blocked');
  });

  it('writes required audit events for controlled finding actions', () => {
    const route = readRepoFile('apps/api/src/routes/findings.ts');
    for (const event of [
      'finding.created',
      'finding.updated',
      'finding.status_changed',
      'finding.evidence_linked',
      'finding.evidence_unlinked',
      'finding.closed',
      'finding.close_blocked',
      'finding.cross_asset_link_blocked'
    ]) {
      expect(route).toContain(event);
    }
  });

  it('adds findings frontend list, detail, and asset-scoped pages', () => {
    const list = expectFile('apps/web/app/findings/page.tsx');
    const client = expectFile('apps/web/app/findings/FindingsClient.tsx');
    const detail = expectFile('apps/web/app/findings/[findingId]/FindingDetailClient.tsx');
    const detailPage = expectFile('apps/web/app/findings/[findingId]/page.tsx');
    const assetPage = expectFile('apps/web/app/assets/[assetId]/findings/page.tsx');
    const assetDetail = readRepoFile('apps/web/app/assets/[assetId]/page.tsx');

    expect(list).toContain('FindingsClient');
    expect(client).toContain('/api/v1/findings');
    expect(client).toContain('/api/v1/engineering/calculations');
    expect(client).not.toContain('/api/v1/calculations?asset_id=');
    expect(client).not.toContain("'/api/v1/calculations'");
    expect(client).toContain('missing-evidence');
    expect(client).toContain('critical evidence required');
    expect(client).toContain('Cross-asset linkage warning');
    expect(detail).toContain('Closure panel');
    expect(detail).toContain('/validation/history?entity_type=finding');
    expect(detail).toContain('/audit-logs?entity_type=finding');
    expect(detailPage).toContain('FindingDetailClient');
    expect(assetPage).toContain('assetScoped');
    expect(assetDetail).toContain(`/assets/${'${assetId}'}/findings`);
  });

  it('documents OpenAPI, data dictionary, ERD, release, UAT, and source-of-truth controls', () => {
    const openapi = expectFile('04_API/openapi.yaml');
    const dataDictionary = expectFile('03_Database/data_dictionary_current.md');
    const erd = expectFile('docs/erd_current.md');
    const readme = expectFile('README.md');
    const sprintStatus = expectFile('docs/sprint-status.md');
    const checklist = expectFile('docs/operations/source_of_truth_alignment_checklist.md');
    const release = expectFile('docs/release/AIM_RC4H_findings_anomaly_foundation_report.md');
    const uat = expectFile('docs/uat/uat_rc4h_findings_anomaly_foundation.md');

    for (const content of [openapi, dataDictionary, erd, readme, sprintStatus, checklist, release, uat]) {
      expect(content).toContain('RC4-H');
      expect(content).toContain('Findings');
      expect(content).not.toMatch(/x-full-api-579-implemented:\s*true/i);
      expect(content).not.toMatch(/x-full-api-581-implemented:\s*true/i);
      expect(content).not.toMatch(/minimum thickness formula implemented/i);
    }

    expect(openapi).toContain('/api/v1/findings:');
    expect(openapi).toContain('/api/v1/assets/{assetId}/findings:');
    expect(dataDictionary).toContain('| finding_code | Finding Code | findings |');
    expect(erd).toContain('findings.asset_id');
    expect(release).toContain('does not implement');
    expect(uat).toContain('No automatic FFS/RBI case creation');
  });

  it('keeps RC4-H formula-free and prevents automatic FFS/RBI case creation', () => {
    const route = readRepoFile('apps/api/src/routes/findings.ts');
    const migration = readRepoFile('db/migrations/0027_findings_anomaly_foundation.sql');
    const ui = readRepoFile('apps/web/app/findings/FindingsClient.tsx');

    for (const content of [route, migration, ui]) {
      expect(content).not.toMatch(/insert into ffs_cases/i);
      expect(content).not.toMatch(/insert into rbi_cases/i);
      expect(content).not.toMatch(/create_ffs_case/i);
      expect(content).not.toMatch(/create_rbi_case/i);
      expect(content).not.toMatch(/API\s*579\s*formula/i);
      expect(content).not.toMatch(/API\s*581\s*formula/i);
      expect(content).not.toMatch(/remaining_life\s*=/i);
      expect(content).not.toMatch(/minimum_thickness\s*=/i);
    }
  });
});

