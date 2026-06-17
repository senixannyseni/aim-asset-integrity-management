import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hasPermission, ROLE_PERMISSIONS } from '../src/rbac/roles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Sprint 10 report generation governance', () => {
  it('creates report template and report versioning schema', () => {
    const migration = readRepoFile('db/migrations/0011_report_generation_engine.sql');
    expect(migration).toContain('create table if not exists report_templates');
    expect(migration).toContain('create table if not exists reports');
    expect(migration).toContain('unique(calculation_run_id, report_version)');
    expect(migration).toContain('prevent_locked_report_change');
  });

  it('registers report routes in the API app', () => {
    const app = readRepoFile('apps/api/src/app.ts');
    expect(app).toContain("import { reportsRouter } from './routes/reports.js';");
    expect(app).toContain("app.use('/api/v1', reportsRouter);");
  });

  it('generates reports only from review-ready calculation runs and keeps drafts clearly marked', () => {
    const route = readRepoFile('apps/api/src/routes/reports.ts');
    expect(route).toContain("reportsRouter.post('/reports/generate', requirePermission('report.generate')");
    expect(route).toContain('CALCULATION_NOT_REPORT_READY');
    expect(route).toContain('DRAFT — NOT APPROVED FOR ISSUE');
    expect(route).toContain('renderDocxBase64');
    expect(route).toContain('renderPdfBase64');
  });

  it('preserves formula, calculation, evidence, validation, and approval traceability', () => {
    const route = readRepoFile('apps/api/src/routes/reports.ts');
    expect(route).toContain('formula_id');
    expect(route).toContain('formula_version');
    expect(route).toContain('code_basis');
    expect(route).toContain('code_edition');
    expect(route).toContain('input_snapshot_hash');
    expect(route).toContain('evidence_register_json');
    expect(route).toContain('approval_records');
    expect(route).toContain('validation_warnings_json');
  });

  it('protects report approval and issue from ai_agent', () => {
    expect(hasPermission(['ai_agent'], 'report.approve')).toBe(false);
    expect(hasPermission(['ai_agent'], 'report.issue')).toBe(false);
    expect(hasPermission(['ai_agent'], 'report.generate')).toBe(false);
    expect(ROLE_PERMISSIONS.senior_engineer).toContain('report.approve');
    expect(ROLE_PERMISSIONS.senior_engineer).toContain('report.issue');
  });

  it('documents report endpoints in OpenAPI', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    expect(openapi).toContain('/reports/generate:');
    expect(openapi).toContain('/reports/{reportId}/approve:');
    expect(openapi).toContain('/reports/{reportId}/issue:');
    expect(openapi).toContain('x-permission-required: report.generate');
    expect(openapi).toContain('Sprint 10 report generation governance notes');
  });
});
