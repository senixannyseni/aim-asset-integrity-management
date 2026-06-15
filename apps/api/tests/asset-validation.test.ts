import { describe, expect, it } from 'vitest';
import {
  normalizeLengthToMeters,
  normalizeLengthToMillimeters,
  validateGeometryPayload,
  validateShellCoursePayload,
  validateTankAssetPayload
} from '../src/modules/assets/validation.js';

describe('tank asset master data validation', () => {
  it('flags missing code edition on tank asset payload', () => {
    const result = validateTankAssetPayload({
      tank_tag: 'TK-200',
      asset_name: 'Tank 200',
      facility: 'Tank Farm',
      location: 'Bund A',
      service_fluid: 'Water',
      tank_type: 'aboveground_storage_tank',
      construction_year: 2010,
      original_design_code: 'API 650',
      current_assessment_code: 'API 653',
      owner: 'Operations',
      operating_status: 'in_service',
      inspection_due_date: '2027-01-01'
    });

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'code_edition')).toBe(true);
  });

  it('normalizes geometry units and rejects liquid level above shell height', () => {
    expect(normalizeLengthToMeters(20000, 'mm')).toBe(20);
    const result = validateGeometryPayload({
      diameter: 20,
      diameter_unit: 'm',
      shell_height: 12,
      shell_height_unit: 'm',
      number_of_courses: 3,
      design_liquid_level: 13000,
      design_liquid_level_unit: 'mm',
      nominal_capacity: 3500,
      specific_gravity: 1,
      design_temperature: 60,
      design_pressure: 0,
      vacuum_design_basis: 'Not specified',
      bottom_type: 'flat_bottom',
      roof_type: 'fixed_roof',
      foundation_type: 'ringwall'
    });

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'design_liquid_level')).toBe(true);
  });

  it('flags missing material and joint efficiency for shell course payload', () => {
    const result = validateShellCoursePayload({
      course_no: 1,
      course_height: 4,
      course_height_unit: 'm',
      nominal_thickness: 12,
      measured_min_thickness: 11.5,
      corrosion_allowance: 1,
      coating_lining_status: 'coated'
    });

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'material_id')).toBe(true);
    expect(result.issues.some((issue) => issue.field === 'joint_efficiency')).toBe(true);
  });

  it('normalizes shell course height to millimeters', () => {
    expect(normalizeLengthToMillimeters(4, 'm')).toBe(4000);
  });
});
