import { describe, expect, it } from 'vitest';
import type { FormulaVersionDefinition } from '../src/modules/calculations/index.js';
import {
  assertFormulaCanRun,
  calculateCorrosionRateMvpV1,
  calculateRemainingLifeMvpV1,
  evaluateShellThicknessMvpV1,
  FORMULA_LIBRARY_TEST_CASES,
  getFormulaVersionByCode,
  listFormulaVersions,
} from '../src/modules/calculations/index.js';

describe('calculation formula library', () => {
  it('registers the three controlled MVP built-in formulas', () => {
    const formulas = listFormulaVersions();

    expect(formulas.map((formula: FormulaVersionDefinition) => formula.formulaCode)).toEqual([
      'corrosion_rate',
      'remaining_life',
      'status_logic',
    ]);
    expect(formulas.map((formula: FormulaVersionDefinition) => formula.expressionRef)).toEqual([
      'AIM_ENGINE_BUILTIN:CORROSION_RATE_MVP_V1',
      'AIM_ENGINE_BUILTIN:REMAINING_LIFE_MVP_V1',
      'AIM_ENGINE_BUILTIN:STATUS_LOGIC_MVP_V1',
    ]);
  });

  it('blocks under-review formula versions in production mode', () => {
    const formula = getFormulaVersionByCode('corrosion_rate');

    expect(formula).toBeDefined();
    expect(() => assertFormulaCanRun(formula!, { productionMode: true })).toThrow(
      /not approved for production/i,
    );
  });

  it('allows under-review formula versions only for validation fixture mode', () => {
    const formula = getFormulaVersionByCode('corrosion_rate');

    expect(formula).toBeDefined();
    expect(() => assertFormulaCanRun(formula!, { allowUnapprovedForValidation: true })).not.toThrow();
  });

  for (const testCase of FORMULA_LIBRARY_TEST_CASES) {
    it(`passes ${testCase.test_case_id} - ${testCase.test_case_name}`, () => {
      const result = evaluateShellThicknessMvpV1(testCase, { allowUnapprovedForValidation: true });

      expect(result.corrosion_rate_mm_y).toBe(testCase.expected_corrosion_rate_mm_y);
      expect(result.remaining_life_y).toBe(testCase.expected_remaining_life_y);
      expect(result.calculation_status).toBe(testCase.expected_status);
      expect(result.warning_code).toBe(testCase.expected_warning_code);
      expect(result.disclaimer).toBe('Engineering review required before final use.');
    });
  }

  it('calculates corrosion rate deterministically from reviewed thickness inputs', () => {
    const result = calculateCorrosionRateMvpV1(
      {
        previous_thickness_mm: 12,
        current_thickness_mm: 10,
        years_between_inspections: 4,
        reading_unit: 'mm',
        evidence_code: 'EVD-2026-000100',
      },
      { allowUnapprovedForValidation: true },
    );

    expect(result.corrosion_rate_mm_y).toBe(0.5);
    expect(result.calculation_status).toBe('OK');
  });

  it('does not divide by zero when corrosion rate is zero', () => {
    const result = calculateRemainingLifeMvpV1(
      {
        current_thickness_mm: 10,
        minimum_required_thickness_mm: 6,
        corrosion_rate_mm_y: 0,
        reading_unit: 'mm',
        evidence_code: 'EVD-2026-000101',
      },
      { allowUnapprovedForValidation: true },
    );

    expect(result.remaining_life_y).toBe('N/A');
    expect(result.calculation_status).toBe('OK_ZERO_RATE_REVIEW');
    expect(result.warning_code).toBe('ZERO_CORROSION_RATE_REVIEW_REQUIRED');
  });
});
