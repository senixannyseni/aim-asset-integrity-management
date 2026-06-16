import { describe, expect, it } from 'vitest';
import { validateEngineeringContext } from '../src/modules/engineering-validation/validation-engine.js';
import { hasPermission } from '../src/rbac/roles.js';

describe('Engineering validation engine', () => {
  it('blocks missing code edition, diameter, shell height, material, and joint efficiency', () => {
    const result = validateEngineeringContext({
      validation_scope: 'calculation_readiness',
      asset: { tank_tag: 'TK-001', original_design_code: 'API 650' },
      geometry: {},
      shell_courses: [{ course_no: 1 }],
      ndt_measurements: [],
      evidence_links: []
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.field_name)).toContain('code_edition');
    expect(result.issues.map((issue) => issue.field_name)).toContain('diameter');
    expect(result.issues.map((issue) => issue.field_name)).toContain('shell_height');
    expect(result.issues.some((issue) => issue.field_name.includes('material'))).toBe(true);
    expect(result.issues.some((issue) => issue.field_name.includes('joint_efficiency'))).toBe(true);
  });

  it('blocks thickness check when approved formula registry metadata is not supplied', () => {
    const result = validateEngineeringContext({
      validation_scope: 'thickness_check',
      asset: { code_edition: 'User supplied API 653 edition', original_design_code: 'API 650' },
      geometry: { diameter: 20, shell_height: 10 },
      shell_courses: [{ course_no: 1, material_id: 'mat-1', joint_efficiency: 1, material_allowable_stress_mpa: 150 }],
      calculation_request: { thickness_check_requested: true },
      formula_registry: []
    });

    expect(result.ok).toBe(false);
    expect(result.grouped.formula.map((issue) => issue.field_name)).toContain('formula_registry');
  });

  it('passes formula readiness when approved formula metadata is supplied', () => {
    const result = validateEngineeringContext({
      validation_scope: 'thickness_check',
      asset: { code_edition: 'User supplied API 653 edition', original_design_code: 'API 650' },
      geometry: { diameter: 20, shell_height: 10 },
      shell_courses: [{ course_no: 1, material_id: 'mat-1', joint_efficiency: 1, material_allowable_stress_mpa: 150 }],
      calculation_request: { thickness_check_requested: true },
      formula_registry: [{ formula_id: 'THICKNESS-CHECK-MVP', status: 'approved' }]
    });

    expect(result.grouped.formula).toHaveLength(0);
  });

  it('blocks critical NDT record without direct or linked evidence', () => {
    const result = validateEngineeringContext({
      validation_scope: 'final_approval',
      asset: { code_edition: 'User supplied API 653 edition', original_design_code: 'API 650' },
      geometry: { diameter: 20, shell_height: 10 },
      shell_courses: [{ course_no: 1, material_id: 'mat-1', joint_efficiency: 1, material_allowable_stress_mpa: 150 }],
      ndt_measurements: [{ measurement_id: 'NDT-1', measured_thickness: 10, is_critical: true }],
      evidence_links: [],
      formula_registry: [{ formula_id: 'THICKNESS-CHECK-MVP', status: 'approved' }],
      approval_request: { final_approval_requested: true }
    });

    expect(result.ok).toBe(false);
    expect(result.grouped.evidence.some((issue) => issue.severity === 'blocking')).toBe(true);
  });

  it('allows evidence gate when critical NDT has linked evidence', () => {
    const result = validateEngineeringContext({
      validation_scope: 'final_approval',
      asset: { code_edition: 'User supplied API 653 edition', original_design_code: 'API 650' },
      geometry: { diameter: 20, shell_height: 10 },
      shell_courses: [{ course_no: 1, material_id: 'mat-1', joint_efficiency: 1, material_allowable_stress_mpa: 150 }],
      ndt_measurements: [{ measurement_id: 'NDT-1', measured_thickness: 10, is_critical: true }],
      evidence_links: [{ linked_entity_type: 'ndt_measurement', linked_entity_id: 'NDT-1', evidence_file_id: 'EVD-ID' }],
      formula_registry: [{ formula_id: 'THICKNESS-CHECK-MVP', status: 'approved' }],
      approval_request: { final_approval_requested: true }
    });

    expect(result.grouped.evidence).toHaveLength(0);
  });

  it('does not grant approval permissions to ai_agent', () => {
    expect(hasPermission(['ai_agent'], 'calculation.approve')).toBe(false);
    expect(hasPermission(['ai_agent'], 'ndt.approve')).toBe(false);
    expect(hasPermission(['ai_agent'], 'validation.run')).toBe(false);
  });
});
