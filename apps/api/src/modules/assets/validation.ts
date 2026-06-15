export type ValidationSeverity = 'error' | 'warning';

export type ValidationIssue = {
  field: string;
  message: string;
  severity: ValidationSeverity;
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};

const allowedLengthUnits = new Set(['m', 'mm']);
const allowedThicknessUnits = new Set(['mm']);

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function asInteger(value: unknown): number | undefined {
  const parsed = asNumber(value);
  return parsed === undefined || !Number.isInteger(parsed) ? undefined : parsed;
}

export function asDateString(value: unknown): string | undefined {
  const raw = asString(value);
  if (!raw) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return raw.slice(0, 10);
}

function requiredString(input: Record<string, unknown>, field: string, issues: ValidationIssue[]): string | undefined {
  const value = asString(input[field]);
  if (!value) {
    issues.push({ field, message: `${field} is required.`, severity: 'error' });
  }
  return value;
}

function requiredNumber(
  input: Record<string, unknown>,
  field: string,
  issues: ValidationIssue[],
  minExclusive?: number,
  maxInclusive?: number
): number | undefined {
  const value = asNumber(input[field]);
  if (value === undefined) {
    issues.push({ field, message: `${field} is required and must be numeric.`, severity: 'error' });
    return undefined;
  }
  if (minExclusive !== undefined && value <= minExclusive) {
    issues.push({ field, message: `${field} must be greater than ${minExclusive}.`, severity: 'error' });
  }
  if (maxInclusive !== undefined && value > maxInclusive) {
    issues.push({ field, message: `${field} must be less than or equal to ${maxInclusive}.`, severity: 'error' });
  }
  return value;
}

function validateUnit(input: Record<string, unknown>, field: string, allowed: Set<string>, defaultUnit: string, issues: ValidationIssue[]): string {
  const unit = asString(input[field]) ?? defaultUnit;
  if (!allowed.has(unit)) {
    issues.push({
      field,
      message: `${field} must be one of: ${Array.from(allowed).join(', ')}.`,
      severity: 'error'
    });
  }
  return unit;
}

export function normalizeLengthToMeters(value: number, unit: string): number {
  if (unit === 'mm') return value / 1000;
  return value;
}

export function normalizeLengthToMillimeters(value: number, unit: string): number {
  if (unit === 'm') return value * 1000;
  return value;
}

export function validateTankAssetPayload(input: Record<string, unknown>): ValidationResult {
  const issues: ValidationIssue[] = [];

  requiredString(input, 'tank_tag', issues);
  requiredString(input, 'asset_name', issues);
  requiredString(input, 'facility', issues);
  requiredString(input, 'location', issues);
  requiredString(input, 'service_fluid', issues);
  requiredString(input, 'tank_type', issues);
  requiredString(input, 'original_design_code', issues);
  requiredString(input, 'current_assessment_code', issues);
  requiredString(input, 'code_edition', issues);
  requiredString(input, 'owner', issues);
  requiredString(input, 'operating_status', issues);
  requiredNumber(input, 'construction_year', issues, 1800, new Date().getFullYear() + 5);

  const inspectionDueDate = asDateString(input.inspection_due_date);
  if (!inspectionDueDate) {
    issues.push({ field: 'inspection_due_date', message: 'inspection_due_date is required and must be a valid date.', severity: 'error' });
  }

  const operatingStatus = asString(input.operating_status);
  if (operatingStatus && !['in_service', 'out_of_service', 'mothballed', 'retired'].includes(operatingStatus)) {
    issues.push({
      field: 'operating_status',
      message: 'operating_status must be one of: in_service, out_of_service, mothballed, retired.',
      severity: 'error'
    });
  }

  return { ok: !issues.some((issue) => issue.severity === 'error'), issues };
}

export function validateGeometryPayload(input: Record<string, unknown>): ValidationResult {
  const issues: ValidationIssue[] = [];

  const diameterUnit = validateUnit(input, 'diameter_unit', allowedLengthUnits, 'm', issues);
  const shellHeightUnit = validateUnit(input, 'shell_height_unit', allowedLengthUnits, 'm', issues);
  const liquidLevelUnit = validateUnit(input, 'design_liquid_level_unit', allowedLengthUnits, 'm', issues);

  const diameter = requiredNumber(input, 'diameter', issues, 0, diameterUnit === 'm' ? 200 : 200000);
  const shellHeight = requiredNumber(input, 'shell_height', issues, 0, shellHeightUnit === 'm' ? 100 : 100000);
  const numberOfCourses = asInteger(input.number_of_courses);
  if (numberOfCourses === undefined) {
    issues.push({ field: 'number_of_courses', message: 'number_of_courses is required and must be an integer.', severity: 'error' });
  } else if (numberOfCourses < 1 || numberOfCourses > 30) {
    issues.push({ field: 'number_of_courses', message: 'number_of_courses must be between 1 and 30.', severity: 'error' });
  }

  const liquidLevel = requiredNumber(input, 'design_liquid_level', issues, 0, liquidLevelUnit === 'm' ? 100 : 100000);
  requiredNumber(input, 'nominal_capacity', issues, 0, 1000000);
  requiredNumber(input, 'specific_gravity', issues, 0, 3);
  requiredNumber(input, 'design_temperature', issues, -273.15, 1000);
  requiredNumber(input, 'design_pressure', issues, -100, 5000);
  requiredString(input, 'vacuum_design_basis', issues);
  requiredString(input, 'bottom_type', issues);
  requiredString(input, 'roof_type', issues);
  requiredString(input, 'foundation_type', issues);

  if (diameter !== undefined && diameterUnit === 'm' && diameter < 1) {
    issues.push({ field: 'diameter', message: 'diameter is unusually small for an aboveground storage tank.', severity: 'warning' });
  }
  if (shellHeight !== undefined && liquidLevel !== undefined) {
    const shellHeightM = normalizeLengthToMeters(shellHeight, shellHeightUnit);
    const liquidLevelM = normalizeLengthToMeters(liquidLevel, liquidLevelUnit);
    if (liquidLevelM > shellHeightM) {
      issues.push({
        field: 'design_liquid_level',
        message: 'design_liquid_level cannot exceed shell_height after unit normalization.',
        severity: 'error'
      });
    }
  }

  return { ok: !issues.some((issue) => issue.severity === 'error'), issues };
}

export function validateShellCoursePayload(input: Record<string, unknown>): ValidationResult {
  const issues: ValidationIssue[] = [];

  const courseNo = asInteger(input.course_no);
  if (courseNo === undefined || courseNo <= 0) {
    issues.push({ field: 'course_no', message: 'course_no is required and must be a positive integer.', severity: 'error' });
  }

  const courseHeightUnit = validateUnit(input, 'course_height_unit', allowedLengthUnits, 'm', issues);
  validateUnit(input, 'nominal_thickness_unit', allowedThicknessUnits, 'mm', issues);
  validateUnit(input, 'measured_min_thickness_unit', allowedThicknessUnits, 'mm', issues);
  validateUnit(input, 'corrosion_allowance_unit', allowedThicknessUnits, 'mm', issues);

  requiredNumber(input, 'course_height', issues, 0, courseHeightUnit === 'm' ? 10 : 10000);
  requiredNumber(input, 'nominal_thickness', issues, 0, 200);
  requiredNumber(input, 'measured_min_thickness', issues, 0, 200);
  requiredNumber(input, 'corrosion_allowance', issues, -0.001, 50);
  requiredString(input, 'coating_lining_status', issues);

  const materialId = asString(input.material_id);
  if (!materialId) {
    issues.push({ field: 'material_id', message: 'material selection is required for each shell course.', severity: 'error' });
  }

  const jointEfficiency = requiredNumber(input, 'joint_efficiency', issues, 0, 1);
  if (jointEfficiency !== undefined && jointEfficiency <= 0) {
    issues.push({ field: 'joint_efficiency', message: 'joint_efficiency must be greater than 0.', severity: 'error' });
  }

  const nominalThickness = asNumber(input.nominal_thickness);
  const measuredMinThickness = asNumber(input.measured_min_thickness);
  if (nominalThickness !== undefined && measuredMinThickness !== undefined && measuredMinThickness > nominalThickness) {
    issues.push({
      field: 'measured_min_thickness',
      message: 'measured_min_thickness is greater than nominal_thickness; verify source data.',
      severity: 'warning'
    });
  }

  return { ok: !issues.some((issue) => issue.severity === 'error'), issues };
}
