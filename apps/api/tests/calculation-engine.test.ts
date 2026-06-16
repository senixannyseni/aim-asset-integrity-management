import { describe, expect, it } from 'vitest';
import { hasPermission } from '../src/rbac/roles.js';
import {
  calculateCorrosionRates,
  calculateRemainingLife,
  hashInputSnapshot,
  normalizeThicknessToMm,
  runDeterministicCalculation
} from '../src/modules/calculation-engine/deterministic-engine.js';

describe('Deterministic calculation engine', () => {
  const baseContext = {
    validation_scope: 'calculation_readiness' as const,
    asset: {
      tank_tag: 'TK-GOLDEN',
      code_edition: 'Engineer supplied API edition basis',
      original_design_code: 'API 650'
    },
    geometry: {
      diameter_m: 20,
      shell_height_m: 12
    },
    shell_courses: [
      {
        course_no: 1,
        material_id: 'mat-1',
        joint_efficiency: 1,
        material_allowable_stress_mpa: 150,
        minimum_required_thickness_mm: 8
      }
    ],
    ndt_measurements: [
      {
        measurement_id: 'NDT-OLD',
        component: 'shell',
        shell_course_no: 1,
        cml_tml_id: 'CML-001',
        grid_ref: 'A1',
        measured_thickness: 12,
        measured_thickness_unit: 'mm',
        reading_date: '2020-01-01',
        is_critical: true,
        evidence_file_id: 'evidence-1'
      },
      {
        measurement_id: 'NDT-NEW',
        component: 'shell',
        shell_course_no: 1,
        cml_tml_id: 'CML-001',
        grid_ref: 'A1',
        measured_thickness: 10,
        measured_thickness_unit: 'mm',
        reading_date: '2024-01-01',
        is_critical: true,
        evidence_file_id: 'evidence-2'
      }
    ],
    evidence_links: [],
    formula_registry: [{ formula_id: 'AIM-UNIVERSAL-THICKNESS-CORROSION-ENGINE', formula_name: 'Thickness engine', status: 'approved' }],
    calculation_request: {
      thickness_check_requested: true,
      retirement_thickness_mm: 8
    },
    thresholds: {
      high_corrosion_rate_mm_per_year: 0.25,
      low_remaining_life_years: 5
    }
  };

  it('normalizes universal thickness units deterministically', () => {
    expect(normalizeThicknessToMm(1, 'inch')).toBe(25.4);
    expect(normalizeThicknessToMm(0.012, 'm')).toBe(12);
  });

  it('produces the same snapshot hash for equivalent object key order', () => {
    const a = { b: 2, a: { y: 1, x: 0 } };
    const b = { a: { x: 0, y: 1 }, b: 2 };
    expect(hashInputSnapshot(a)).toBe(hashInputSnapshot(b));
  });

  it('calculates corrosion rate from measured thickness history', () => {
    const result = runDeterministicCalculation(baseContext);
    expect(result.validation_status).toBe('passed');
    expect(result.corrosion_rates).toHaveLength(1);
    expect(result.corrosion_rates[0]?.corrosion_rate_mm_per_year).toBeGreaterThan(0.49);
    expect(result.remaining_life[0]?.remaining_life_years).toBeGreaterThan(3.9);
  });

  it('blocks calculation output when engineering validation has blocking severity', () => {
    const result = runDeterministicCalculation({
      ...baseContext,
      asset: { tank_tag: 'TK-BLOCKED' },
      geometry: {}
    });
    expect(result.validation_status).toBe('blocked');
    expect(result.output_summary.corrosion_rate_count).toBe(0);
    expect(result.validation_result.ok).toBe(false);
  });

  it('creates deterministic corrosion and remaining life helper outputs', () => {
    const rates = calculateCorrosionRates([
      {
        measurement_id: 'old',
        component: 'shell',
        shell_course_no: 1,
        cml_tml_id: 'CML-1',
        grid_ref: 'A1',
        elevation_m: null,
        orientation: null,
        measured_thickness_mm: 12,
        reading_date: '2020-01-01',
        method: 'UT',
        evidence_file_id: 'evd-1',
        is_critical: true
      },
      {
        measurement_id: 'new',
        component: 'shell',
        shell_course_no: 1,
        cml_tml_id: 'CML-1',
        grid_ref: 'A1',
        elevation_m: null,
        orientation: null,
        measured_thickness_mm: 10,
        reading_date: '2024-01-01',
        method: 'UT',
        evidence_file_id: 'evd-2',
        is_critical: true
      }
    ]);
    const life = calculateRemainingLife({ ...baseContext, calculation_request: { retirement_thickness_mm: 8 } }, rates);
    expect(rates).toHaveLength(1);
    expect(life[0]?.status).toBe('pass');
  });

  it('does not grant calculation approval to ai_agent', () => {
    expect(hasPermission(['ai_agent'], 'calculation.run')).toBe(false);
    expect(hasPermission(['ai_agent'], 'calculation.approve')).toBe(false);
  });
});
