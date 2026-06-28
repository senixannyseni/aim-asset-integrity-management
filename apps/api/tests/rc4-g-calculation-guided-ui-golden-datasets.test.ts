import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runDeterministicCalculation } from '../src/modules/calculation-engine/deterministic-engine.js';
import { assertFormulaVersionIsExecutable } from '../src/modules/formula-registry/executable-sync.js';
import { hasPermission } from '../src/rbac/roles.js';
import { calculationGoldenDatasets } from './fixtures/calculation-golden-datasets.js';

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

describe('RC4-G calculation guided UI and golden dataset fixtures', () => {
  it('executes golden dataset cases deterministically with expected outputs, warnings, and blockers', () => {
    for (const goldenCase of calculationGoldenDatasets) {
      const first = runDeterministicCalculation(goldenCase.input_payload);
      const second = runDeterministicCalculation(goldenCase.input_payload);

      expect(second).toEqual(first);
      expect(first.validation_status).toBe(goldenCase.expected_output_payload.validation_status);
      expect(first.output_summary).toEqual(goldenCase.expected_output_payload.output_summary);
      expect(first.corrosion_rates).toEqual(goldenCase.expected_output_payload.corrosion_rates);
      expect(first.remaining_life).toEqual(goldenCase.expected_output_payload.remaining_life);
      expect(first.warnings.map((warning) => warning.code)).toEqual(goldenCase.expected_warnings);
      expect(first.final_use_status).toBe(goldenCase.expected_output_payload.final_use_status);
      expect(first.final_use_blockers).toEqual(goldenCase.expected_blockers);
      expect(first.final_use_disclaimer).toBe('Engineering review required before final use.');
    }
  });

  it('keeps calculation execution guarded by approved executable formula_versions', () => {
    expect(() => assertFormulaVersionIsExecutable({ formula_status: 'approved', deterministic_flag: true, status: 'approved' })).not.toThrow();
    expect(() => assertFormulaVersionIsExecutable(undefined)).toThrow('approved synchronized formula_versions');
    expect(() => assertFormulaVersionIsExecutable({ formula_status: 'draft', deterministic_flag: true, status: 'approved' })).toThrow('approved synchronized formula_versions');
    expect(() => assertFormulaVersionIsExecutable({ formula_status: 'rejected', deterministic_flag: true, status: 'approved' })).toThrow('approved synchronized formula_versions');
    expect(() => assertFormulaVersionIsExecutable({ formula_status: 'retired', deterministic_flag: true, status: 'approved' })).toThrow('approved synchronized formula_versions');
    expect(() => assertFormulaVersionIsExecutable({ formula_status: 'approved', deterministic_flag: false, status: 'approved' })).toThrow('approved synchronized formula_versions');
    expect(() => assertFormulaVersionIsExecutable({ formula_status: 'approved', deterministic_flag: true, status: 'retired' })).toThrow('source registry record');
  });

  it('preserves existing AI/service governance boundaries for calculation and formula execution', () => {
    expect(hasPermission(['ai_agent'], 'calculation.run')).toBe(false);
    expect(hasPermission(['engineer'], 'calculation.run')).toBe(true);
    expect(hasPermission(['senior_engineer'], 'formula.approve')).toBe(true);
    expect(hasPermission(['ai_agent'], 'formula.approve')).toBe(false);
  });

  it('wires approved executable formula selector and calculation detail UI without adding formulas', () => {
    const formulasRoute = readRepoFile('apps/api/src/routes/formulas.ts');
    const calculationsRoute = readRepoFile('apps/api/src/routes/calculations.ts');
    const calculationUi = expectFile('apps/web/app/calculations/CalculationEngineClient.tsx');
    const detailUi = expectFile('apps/web/app/calculations/[runId]/CalculationDetailClient.tsx');
    const assetUi = expectFile('apps/web/app/assets/[assetId]/calculations/page.tsx');

    expect(formulasRoute).toContain("get('/formula-versions/executable'");
    expect(formulasRoute).toContain("fv.formula_status in ('approved','locked')");
    expect(calculationsRoute).toContain('assertFormulaVersionIsExecutable');
    expect(calculationUi).toContain('/api/v1/formula-versions/executable');
    expect(calculationUi).toContain('Only approved executable formula_versions can be selected');
    expect(calculationUi).toContain('Request payload preview');
    expect(detailUi).toContain('Comparison to previous calculation');
    expect(detailUi).toContain('Engineering review');
    expect(assetUi).toContain('assetScoped');
  });

  it('documents RC4-G release, UAT, source-of-truth alignment, and OpenAPI behavior', () => {
    const openapi = expectFile('04_API/openapi.yaml');
    const readme = expectFile('README.md');
    const sprintStatus = expectFile('docs/sprint-status.md');
    const checklist = expectFile('docs/operations/source_of_truth_alignment_checklist.md');
    const release = expectFile('docs/release/AIM_RC4G_calculation_guided_ui_golden_datasets_report.md');
    const uat = expectFile('docs/uat/uat_rc4g_calculation_guided_ui_golden_datasets.md');

    for (const content of [openapi, readme, sprintStatus, checklist, release, uat]) {
      expect(content).toContain('RC4-G');
      expect(content).not.toMatch(/x-full-api-579-implemented:\s*true/i);
      expect(content).not.toMatch(/x-full-api-581-implemented:\s*true/i);
      expect(content).not.toMatch(/minimum thickness formula implemented/i);
    }

    expect(openapi).toContain('/api/v1/formula-versions/executable:');
    expect(openapi).toContain('approved executable formula_versions');
    expect(release).toContain('golden dataset');
    expect(uat).toContain('guided calculation');
  });

  it('keeps golden fixtures synthetic and free of proprietary formula content', () => {
    const fixtureSource = readRepoFile('apps/api/tests/fixtures/calculation-golden-datasets.ts');
    expect(fixtureSource).toContain('Synthetic internal MVP fixture');
    expect(fixtureSource).not.toMatch(/\bAPI\s*579\s*[-–—]?\s*1\s*formula\b/i);
    expect(fixtureSource).not.toMatch(/\bAPI\s*581\s*formula\b/i);
    expect(fixtureSource).not.toMatch(/ASME\s+clause\s+text/i);
  });
});
