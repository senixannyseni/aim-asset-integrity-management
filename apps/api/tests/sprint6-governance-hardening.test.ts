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

describe('Sprint 6 governance hardening', () => {
  it('protects asset detail route with asset.read RBAC', () => {
    const route = readRepoFile('apps/api/src/routes/assets.ts');
    expect(route).toContain("assetsRouter.get('/assets/:assetId', requirePermission('asset.read')");
  });

  it('blocks non-universal formulas from deterministic calculation execution', () => {
    const route = readRepoFile('apps/api/src/routes/calculations.ts');
    expect(route).toContain("formula.formula_type !== 'universal_deterministic'");
    expect(route).toContain('NON_DETERMINISTIC_FORMULA_BLOCKED');
  });

  it('stores calculation input source entity and evidence traceability fields', () => {
    const route = readRepoFile('apps/api/src/routes/calculations.ts');
    expect(route).toContain('source_entity_id, evidence_file_id, validation_status');
    expect(route).toContain('row.sourceEntityId');
    expect(route).toContain('row.evidenceFileId');
  });

  it('documents implemented asset read routes in OpenAPI', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    expect(openapi).toContain('/assets/{assetId}/geometry:');
    expect(openapi).toContain('/assets/{assetId}/shell-courses:');
    expect(openapi).toContain('x-permission-required: asset.read');
  });
  it('keeps evidence upload resource handling to a single release in finally block', () => {
    const route = readRepoFile('apps/api/src/routes/evidence.ts');
    const uploadStart = route.indexOf("evidenceRouter.post('/evidence/upload'");
    const linkStart = route.indexOf("evidenceRouter.post('/evidence/:evidenceId/links'");
    const uploadBlock = route.slice(uploadStart, linkStart);
    const releaseCount = (uploadBlock.match(/client\.release\(\)/g) ?? []).length;
    expect(releaseCount).toBe(1);
  });

});
