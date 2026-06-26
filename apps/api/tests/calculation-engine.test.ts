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
        source_entity_id: '11111111-1111-4111-8111-111111111111',
        component: 'shell',
        shell_course_no: 1,
        cml_tml_id: 'CML-001',
        grid_ref: 'A1',
        measured_thickness: 12,
        measured_thickness_unit: 'mm',
        reading_date: '2020-01-01',
        is_critical: true,
        evidence_file_id: '22222222-2222-4222-8222-222222222222'
      },
      {
        measurement_id: 'NDT-NEW',
        source_entity_id: '33333333-3333-4333-8333-333333333333',
        component: 'shell',
        shell_course_no: 1,
        cml_tml_id: 'CML-001',
        grid_ref: 'A1',
        measured_thickness: 10,
        measured_thickness_unit: 'mm',
        reading_date: '2024-01-01',
        is_critical: true,
        evidence_file_id: '44444444-4444-4444-8444-444444444444'
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
    expect(result.final_use_disclaimer).toBe('Engineering review required before final use.');
    expect(result.final_use_status).toBe('requires_engineering_review');
  });


  it('aligns zero corrosion rate behavior with the validation workbook fixture', () => {
    const context = JSON.parse(JSON.stringify(baseContext)) as typeof baseContext;
    context.ndt_measurements[0]!.measured_thickness = 10;
    context.ndt_measurements[1]!.measured_thickness = 10;

    const result = runDeterministicCalculation(context);

    expect(result.corrosion_rates[0]?.corrosion_rate_mm_per_year).toBe(0);
    expect(result.remaining_life[0]?.remaining_life_years).toBeNull();
    expect(result.remaining_life[0]?.status).toBe('not_determined');
    expect(result.warnings.map((warning) => warning.code)).toContain('ZERO_CORROSION_RATE_REVIEW');
  });

  it('aligns negative corrosion rate behavior with the validation workbook fixture', () => {
    const context = JSON.parse(JSON.stringify(baseContext)) as typeof baseContext;
    context.ndt_measurements[0]!.measured_thickness = 9.8;
    context.ndt_measurements[1]!.measured_thickness = 10.1;

    const result = runDeterministicCalculation(context);

    expect(result.corrosion_rates[0]?.corrosion_rate_mm_per_year).toBeLessThan(0);
    expect(result.remaining_life[0]?.remaining_life_years).toBeNull();
    expect(result.remaining_life[0]?.status).toBe('not_determined');
    expect(result.warnings.map((warning) => warning.code)).toContain('NEGATIVE_CORROSION_RATE');
  });

  it('blocks final use when previous thickness is missing for a corrosion-rate group', () => {
    const context = JSON.parse(JSON.stringify(baseContext)) as typeof baseContext;
    context.ndt_measurements = [context.ndt_measurements[1]!];

    const result = runDeterministicCalculation(context);

    expect(result.corrosion_rates).toHaveLength(0);
    expect(result.final_use_status).toBe('blocked');
    expect(result.final_use_blockers).toContain('INCOMPLETE_INPUT');
    expect(result.warnings.map((warning) => warning.code)).toContain('INCOMPLETE_INPUT');
  });

  it('preserves NDT source entity and evidence identifiers in normalized inputs', () => {
    const result = runDeterministicCalculation(baseContext);
    const measurements = result.normalized_inputs.ndt_measurements;
    expect(Array.isArray(measurements)).toBe(true);
    const first = Array.isArray(measurements) ? measurements[0] as Record<string, unknown> : undefined;
    expect(first?.source_entity_id).toBe('11111111-1111-4111-8111-111111111111');
    expect(first?.evidence_file_id).toBe('22222222-2222-4222-8222-222222222222');
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
        source_entity_id: null,
        component: 'shell',
        shell_course_no: 1,
        cml_tml_id: 'CML-1',
        grid_ref: 'A1',
        elevation_m: null,
        orientation: null,
        measured_thickness_mm: 12,
        reading_date: '2020-01-01',
        method: 'UT',
        measured_thickness_unit: 'mm',
        evidence_file_id: 'evd-1',
        is_critical: true
      },
      {
        measurement_id: 'new',
        source_entity_id: null,
        component: 'shell',
        shell_course_no: 1,
        cml_tml_id: 'CML-1',
        grid_ref: 'A1',
        elevation_m: null,
        orientation: null,
        measured_thickness_mm: 10,
        reading_date: '2024-01-01',
        method: 'UT',
        measured_thickness_unit: 'mm',
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
