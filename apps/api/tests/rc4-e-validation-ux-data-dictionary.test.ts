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

function expectFile(relativePath: string): string {
  const absolutePath = path.join(repoRoot, relativePath);
  expect(fs.existsSync(absolutePath), `${relativePath} should exist`).toBe(true);
  return fs.readFileSync(absolutePath, 'utf8');
}

describe('RC4-E validation-by-asset UX and data dictionary expansion', () => {
  it('adds required validation and data dictionary frontend routes', () => {
    expectFile('apps/web/app/validation/page.tsx');
    expectFile('apps/web/app/validation/history/page.tsx');
    expectFile('apps/web/app/assets/[assetId]/validation/page.tsx');
    expectFile('apps/web/app/data-dictionary/page.tsx');
  });

  it('exposes validation history as read-only API visibility without schema changes', () => {
    const route = readRepoFile('apps/api/src/routes/engineering-validation.ts');
    expect(route).toContain("get('/engineering/validation-history'");
    expect(route).toContain("get('/engineering/validation-history/:validationRunId'");
    expect(route).toContain("get('/assets/:assetId/validation'");
    expect(route).not.toContain('create table');
    expect(route).not.toContain('alter table');
  });

  it('documents new API adapters in OpenAPI with validation.read permission', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    for (const pathName of [
      '/api/v1/engineering/validation-history:',
      '/api/v1/engineering/validation-history/{validationRunId}:',
      '/api/v1/assets/{assetId}/validation:'
    ]) {
      expect(openapi).toContain(pathName);
    }
    expect(openapi).toContain('x-permission-required: validation.read');
    expect(openapi).toContain('x-audit-event-generated: none');
  });

  it('expands data dictionary docs and RC4-E release/UAT docs without formulas', () => {
    const dictionary = expectFile('03_Database/data_dictionary_current.md');
    const release = expectFile('docs/release/AIM_RC4E_validation_by_asset_history_data_dictionary_report.md');
    const uat = expectFile('docs/uat/uat_rc4e_validation_by_asset_history_data_dictionary.md');
    const sprintStatus = expectFile('docs/sprint-status.md');
    const checklist = expectFile('docs/operations/source_of_truth_alignment_checklist.md');

    for (const content of [dictionary, release, uat, sprintStatus, checklist]) {
      expect(content).toContain('RC4-E');
      expect(content).not.toMatch(/x-full-api-579-implemented:\s*true/i);
      expect(content).not.toMatch(/x-full-api-581-implemented:\s*true/i);
      expect(content).not.toMatch(/invented API\/ASME formula/i);
    }

    expect(dictionary).toContain('Validation run/history fields');
    expect(dictionary).toContain('Evidence object-storage governance');
    expect(dictionary).toContain('NDT measurement fields');
    expect(dictionary).toContain('Formula version references');
  });
});
