import type { DeterministicCalculationRequest } from '../../src/modules/calculation-engine/deterministic-engine.js';

export type CalculationGoldenDatasetCase = {
  case_id: string;
  calculation_type: DeterministicCalculationRequest['calculation_scope'];
  formula_code: string;
  formula_version: string;
  approved_fixture_formula_version_id: string;
  input_payload: DeterministicCalculationRequest;
  expected_output_payload: {
    validation_status: 'passed' | 'blocked';
    output_summary: {
      calculation_scope: string;
      measurement_count: number;
      corrosion_rate_count: number;
      remaining_life_count: number;
      warning_count: number;
      ffs_trigger_candidate: boolean;
      rbi_trigger_candidate: boolean;
      next_inspection_interval_years: number | null;
    };
    corrosion_rates: Array<{
      group_key: string;
      component: string;
      shell_course_no: number | null;
      cml_tml_id: string | null;
      grid_ref: string | null;
      oldest_thickness_mm: number;
      latest_thickness_mm: number;
      oldest_reading_date: string;
      latest_reading_date: string;
      elapsed_years: number;
      corrosion_rate_mm_per_year: number;
    }>;
    remaining_life: Array<{
      group_key: string;
      latest_thickness_mm: number;
      retirement_thickness_mm: number;
      corrosion_rate_mm_per_year: number;
      remaining_life_years: number | null;
      status: string;
    }>;
    final_use_status: 'blocked' | 'requires_engineering_review';
    final_use_blockers: string[];
  };
  expected_warnings: string[];
  expected_blockers: string[];
  basis_note: string;
};

const approvedFormulaRegistry = {
  formula_id: 'AIM-UNIVERSAL-THICKNESS-CORROSION-ENGINE',
  formula_code: 'AIM-UNIVERSAL-THICKNESS-CORROSION-ENGINE',
  formula_name: 'AIM internal deterministic thickness screening fixture',
  status: 'approved',
  version: '1.0.0',
  formula_expression_source: 'approved_formula_registry_or_fixture_only'
};

export const calculationGoldenDatasets: CalculationGoldenDatasetCase[] = [
  {
    case_id: 'RC4G-GOLDEN-CORROSION-REMAINING-LIFE-001',
    calculation_type: 'thickness_screening',
    formula_code: 'AIM-UNIVERSAL-THICKNESS-CORROSION-ENGINE',
    formula_version: '1.0.0',
    approved_fixture_formula_version_id: '55555555-5555-4555-8555-555555555555',
    input_payload: {
      validation_scope: 'calculation_readiness',
      calculation_scope: 'thickness_screening',
      asset: {
        tank_tag: 'TK-RC4G-GOLDEN',
        code_edition: 'Engineer supplied edition basis',
        original_design_code: 'Engineer supplied design code reference'
      },
      geometry: {
        diameter_m: 20,
        shell_height_m: 12,
        number_of_courses: 1
      },
      shell_courses: [
        {
          course_no: 1,
          material_id: 'mat-rc4g-1',
          material_code: 'SYNTHETIC-MAT-RC4G',
          joint_efficiency: 1,
          nominal_thickness_mm: 12,
          material_allowable_stress_mpa: 150
        }
      ],
      ndt_measurements: [
        {
          measurement_id: 'NDT-RC4G-OLD',
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
          measurement_id: 'NDT-RC4G-NEW',
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
      formula_registry: [approvedFormulaRegistry],
      calculation_request: {
        thickness_check_requested: true,
        retirement_thickness_mm: 8,
        ffs_trigger_evaluation_requested: true,
        rbi_trigger_evaluation_requested: true
      },
      thresholds: {
        high_corrosion_rate_mm_per_year: 0.5,
        low_remaining_life_years: 5
      }
    },
    expected_output_payload: {
      validation_status: 'passed',
      output_summary: {
        calculation_scope: 'thickness_screening',
        measurement_count: 2,
        corrosion_rate_count: 1,
        remaining_life_count: 1,
        warning_count: 2,
        ffs_trigger_candidate: true,
        rbi_trigger_candidate: false,
        next_inspection_interval_years: 2
      },
      corrosion_rates: [
        {
          group_key: 'shell|1|CML-001|A1|elevation_unknown|orientation_unknown',
          component: 'shell',
          shell_course_no: 1,
          cml_tml_id: 'CML-001',
          grid_ref: 'A1',
          oldest_thickness_mm: 12,
          latest_thickness_mm: 10,
          oldest_reading_date: '2020-01-01',
          latest_reading_date: '2024-01-01',
          elapsed_years: 4,
          corrosion_rate_mm_per_year: 0.5
        }
      ],
      remaining_life: [
        {
          group_key: 'shell|1|CML-001|A1|elevation_unknown|orientation_unknown',
          latest_thickness_mm: 10,
          retirement_thickness_mm: 8,
          corrosion_rate_mm_per_year: 0.5,
          remaining_life_years: 4,
          status: 'pass'
        }
      ],
      final_use_status: 'requires_engineering_review',
      final_use_blockers: []
    },
    expected_warnings: ['LOW_REMAINING_LIFE', 'FFS_TRIGGER_CANDIDATE'],
    expected_blockers: [],
    basis_note: 'Synthetic internal MVP fixture using existing deterministic calculation behavior only; no API/ASME formula or standard clause is encoded.'
  }
];
