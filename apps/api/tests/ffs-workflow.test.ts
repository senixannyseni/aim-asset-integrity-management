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

describe('FFS trigger workflow governance', () => {
  it('tracks the FFS workflow migration after deterministic calculation engine', () => {
    const files = fs.readdirSync(path.join(repoRoot, 'db/migrations')).filter((file) => file.endsWith('.sql')).sort();
    expect(files).toContain('0008_ffs_trigger_workflow.sql');
  });

  it('does not grant FFS close or approval to ai_agent', () => {
    expect(hasPermission(['ai_agent'], 'ffs.read')).toBe(false);
    expect(hasPermission(['ai_agent'], 'ffs.approve')).toBe(false);
    expect(hasPermission(['ai_agent'], 'ffs.close')).toBe(false);
  });

  it('requires senior engineer authority for final FFS disposition', () => {
    const route = readRepoFile('apps/api/src/routes/ffs.ts');
    expect(route).toContain("ffsRouter.post('/ffs/cases/:caseId/close', requirePermission('ffs.approve')");
    expect(route).toContain('SENIOR_ENGINEER_APPROVAL_REQUIRED');
    expect(route).toContain('AI_AGENT_CANNOT_CLOSE_FFS');
    expect(route).toContain('approval_records');
  });

  it('creates FFS trigger cases from calculation warning outputs without declaring fitness', () => {
    const route = readRepoFile('apps/api/src/routes/ffs.ts');
    expect(route).toContain("ffsRouter.post('/ffs/cases/from-calculation', requirePermission('ffs.trigger')");
    expect(route).toContain('FFS_TRIGGER_CANDIDATE');
    expect(route).toContain('does_not_declare_fitness');
  });

  it('documents FFS API routes and permissions in OpenAPI', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    expect(openapi).toContain('/ffs/cases:');
    expect(openapi).toContain('/ffs/cases/from-calculation:');
    expect(openapi).toContain('/ffs/cases/{caseId}/close:');
    expect(openapi).toContain('x-permission-required: ffs.approve');
  });
});
