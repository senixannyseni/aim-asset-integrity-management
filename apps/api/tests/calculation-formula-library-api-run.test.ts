import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildFormulaLibraryRunArtifacts,
  FORMULA_LIBRARY_RUN_FORMULA_CODE,
  FORMULA_LIBRARY_RUN_SET,
  FORMULA_LIBRARY_RUN_VERSION,
  formulaLibraryRunFixtureRequest,
  FORMULA_LIBRARY_TEST_CASES,
  normalizeFormulaLibraryRunRequest,
} from '../src/modules/calculations/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('calculation formula-library API run bridge', () => {
  it('normalizes only explicit formula-library run requests', () => {
    const invalid = normalizeFormulaLibraryRunRequest({
      asset_id: '33333333-3333-4333-8333-333333333333',
      formula_code: 'corrosion_rate',
      formula_version: '1.0.0',
      inputs: { reading_unit: 'mm' },
    });
    const valid = normalizeFormulaLibraryRunRequest({
      asset_id: '33333333-3333-4333-8333-333333333333',
      formula_code: FORMULA_LIBRARY_RUN_FORMULA_CODE,
      formula_version: FORMULA_LIBRARY_RUN_VERSION,
      formula_set: FORMULA_LIBRARY_RUN_SET,
      inputs: {
        previous_thickness_mm: 10,
        current_thickness_mm: 9,
        minimum_required_thickness_mm: 6,
        years_between_inspections: 5,
        reading_unit: 'mm',
        evidence_code: 'EVD-2026-000001',
      },
    });

    expect(invalid.request).toBeUndefined();
    expect(invalid.issues.map((issue) => issue.field)).toContain('formula_code');
    expect(valid.request?.formula_code).toBe('status_logic');
    expect(valid.request?.formula_version).toBe('1.0.0');
  });

  it('builds persisted run artifacts for the golden normal corrosion case', () => {
    const request = formulaLibraryRunFixtureRequest(FORMULA_LIBRARY_TEST_CASES[0]!);
    const artifacts = buildFormulaLibraryRunArtifacts(request, {
      formula_version_id: 'f6530000-0000-4000-8000-000000000103',
      formula_code: 'status_logic',
      version: '1.0.0',
      formula_status: 'approved',
    });

    expect(artifacts.result.corrosion_rate_mm_y).toBe(0.2);
    expect(artifacts.result.remaining_life_y).toBe(15);
    expect(artifacts.result.calculation_status).toBe('OK');
    expect(artifacts.status).toBe('ready_for_review');
    expect(artifacts.finalUseStatus).toBe('requires_engineering_review');
    expect(artifacts.inputRows.length).toBeGreaterThanOrEqual(6);
    expect(artifacts.outputRows.map((row) => row.name)).toContain('corrosion_rate_mm_y');
    expect(artifacts.outputSnapshotHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('builds blocked persisted run artifacts for missing evidence', () => {
    const missingEvidenceCase = FORMULA_LIBRARY_TEST_CASES.find((testCase) => testCase.test_case_id === 'TC-006');
    expect(missingEvidenceCase).toBeDefined();
    const artifacts = buildFormulaLibraryRunArtifacts(
      formulaLibraryRunFixtureRequest(missingEvidenceCase!),
      {
        formula_version_id: 'f6530000-0000-4000-8000-000000000103',
        formula_code: 'status_logic',
        version: '1.0.0',
        formula_status: 'approved',
      },
    );

    expect(artifacts.validationStatus).toBe('blocked');
    expect(artifacts.status).toBe('validation_failed');
    expect(artifacts.finalUseStatus).toBe('blocked');
    expect(artifacts.finalUseBlockers).toContain('MISSING_EVIDENCE_REFERENCE');
  });

  it('exposes a route that persists formula-library runs through calculation governance tables', () => {
    const route = readRepoFile('apps/api/src/routes/calculations.ts');

    expect(route).toContain('/engineering/calculations/formula-library/run');
    expect(route).toContain('requirePermission("calculation.run")');
    expect(route).toContain('normalizeFormulaLibraryRunRequest');
    expect(route).toContain('buildFormulaLibraryRunArtifacts');
    expect(route).toContain('getApprovedFormulaVersion');
    expect(route).toContain('assertFormulaVersionIsExecutable');
    expect(route).toContain('insert into calculation_runs');
    expect(route).toContain('insert into calculation_inputs');
    expect(route).toContain('insert into calculation_outputs');
    expect(route).toContain('calculation.formula_library_run_requested');
    expect(route).toContain('ENGINEERING_REVIEW_DISCLAIMER');
    expect(route).toContain('final_use_disclaimer');
  });

  it('seeds approved synchronized built-in formula versions without embedding API/ASME clauses', () => {
    const migration = readRepoFile('db/migrations/0034_calculation_formula_library_runtime_bridge.sql');
    const seed = readRepoFile('apps/api/seed-data/calculation/calculation_formula_library_seed.sql');

    for (const token of [
      'formula_registry',
      'formula_versions',
      'corrosion_rate',
      'remaining_life',
      'status_logic',
      'AIM_ENGINE_BUILTIN:CORROSION_RATE_MVP_V1',
      'AIM_ENGINE_BUILTIN:REMAINING_LIFE_MVP_V1',
      'AIM_ENGINE_BUILTIN:STATUS_LOGIC_MVP_V1',
      'Engineering review required before final use.',
    ]) {
      expect(migration + seed).toContain(token);
    }

    expect(migration).toContain('NO-STANDARD-CLAUSE');
    expect(migration).not.toMatch(/API\s*653\s*(section|clause)\s*[0-9]+/i);
    expect(migration).not.toContain('eval(');
    expect(migration).not.toContain('new Function');
  });
});
