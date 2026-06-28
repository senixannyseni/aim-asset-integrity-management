import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('RBI interface trigger workflow governance', () => {
  it('creates RBI schema without quantitative API 581 formulas', () => {
    const migration = readRepoFile('db/migrations/0009_rbi_interface_trigger_workflow.sql');
    expect(migration).toContain('create table if not exists rbi_trigger_rules');
    expect(migration).toContain('qualitative_placeholder_only_no_api_581_quantitative_rules');
    expect(migration).not.toMatch(/API\s*581\s*equation|quantitative\s*formula\s*=|PoF\s*=|CoF\s*=/i);
  });

  it('registers RBI routes in the API app', () => {
    const app = readRepoFile('apps/api/src/app.ts');
    expect(app).toContain("import { rbiRouter } from './routes/rbi.js';");
    expect(app).toContain("app.use('/api/v1', rbiRouter);");
  });

  it('supports manual and calculation-triggered RBI case creation', () => {
    const route = readRepoFile('apps/api/src/routes/rbi.ts');
    expect(route).toContain("rbiRouter.post('/rbi/cases', requirePermission('rbi.interface.create')");
    expect(route).toContain("rbiRouter.post('/rbi/cases/from-calculation', requirePermission('rbi.interface.create')");
    expect(route).toContain('HIGH_CORROSION_RATE');
    expect(route).toContain('LOW_REMAINING_LIFE');
    expect(route).toContain('RBI_TRIGGER_CANDIDATE');
  });

  it('preserves calculation and evidence traceability for RBI cases', () => {
    const route = readRepoFile('apps/api/src/routes/rbi.ts');
    expect(route).toContain('calculation_run_id');
    expect(route).toContain('source_entity_id');
    expect(route).toContain('evidence_file_id');
    expect(route).toContain('validateEvidenceFilesForAsset');
    expect(route).toContain('RBI case evidence must belong to the same asset as the RBI case.');
  });

  it('prevents AI approval/finalization of RBI cases', () => {
    const route = readRepoFile('apps/api/src/routes/rbi.ts');
    expect(route).toContain('AI_AGENT_CANNOT_APPROVE_RBI');
    expect(route).toContain('RBI_REVIEW_REQUIRED_BEFORE_APPROVAL');
    expect(route).toContain('RBI_APPROVE_ENDPOINT_APPROVES_ONLY');
    expect(route).toContain('RBI_REVIEW_ENDPOINT_REQUIRED');
    expect(route).not.toContain('reviewed_at = coalesce(reviewed_at, now())');
    expect(route).toContain('rbiRouter.post(\'/rbi/cases/:caseId/approve\', requirePermission(\'rbi.interface.approve\')');
    const roles = readRepoFile('apps/api/src/rbac/roles.ts');
    const aiAgentBlock = roles.slice(roles.indexOf('ai_agent: ['), roles.indexOf(']', roles.indexOf('ai_agent: [')));
    expect(aiAgentBlock).not.toContain('rbi.interface.approve');
  });

  it('documents RBI endpoints in OpenAPI', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    expect(openapi).toContain('/rbi/cases:');
    expect(openapi).toContain('/rbi/cases/from-calculation:');
    expect(openapi).toContain('/rbi/cases/{caseId}/approve:');
    expect(openapi).toContain('x-permission-required: rbi.interface.approve');
  });
});
