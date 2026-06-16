export type ValidationSeverity = 'info' | 'warning' | 'blocking';

export type ValidationGroup =
  | 'asset'
  | 'geometry'
  | 'shell_course'
  | 'material'
  | 'ndt'
  | 'evidence'
  | 'formula'
  | 'approval';

export type ValidationIssue = {
  group: ValidationGroup;
  field_name: string;
  label: string;
  severity: ValidationSeverity;
  message: string;
  suggested_fix: string;
  engineering_note?: string;
};

export type ValidationRunSummary = {
  ok: boolean;
  blocking_count: number;
  warning_count: number;
  info_count: number;
};

export type ValidationEngineResult = ValidationRunSummary & {
  issues: ValidationIssue[];
  grouped: Record<ValidationGroup, ValidationIssue[]>;
};

export type ValidationScope = 'general' | 'calculation_readiness' | 'thickness_check' | 'final_approval';

export type ValidationContext = {
  validation_scope?: ValidationScope;
  target_action?: string;
  asset?: Record<string, unknown> | null;
  geometry?: Record<string, unknown> | null;
  shell_courses?: Array<Record<string, unknown>>;
  materials?: Array<Record<string, unknown>>;
  ndt_measurements?: Array<Record<string, unknown>>;
  evidence_links?: Array<Record<string, unknown>>;
  formula_registry?: Array<Record<string, unknown>>;
  calculation_request?: Record<string, unknown> | null;
  approval_request?: Record<string, unknown> | null;
};

const GROUPS: ValidationGroup[] = ['asset', 'geometry', 'shell_course', 'material', 'ndt', 'evidence', 'formula', 'approval'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

export function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
}

function valueAt(record: Record<string, unknown> | null | undefined, keys: string[]): unknown {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function hasValue(record: Record<string, unknown> | null | undefined, keys: string[]): boolean {
  const value = valueAt(record, keys);
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== undefined && value !== null;
}

function addIssue(issues: ValidationIssue[], issue: ValidationIssue): void {
  issues.push(issue);
}

function approvedFormulaAvailable(context: ValidationContext): boolean {
  const formulas = context.formula_registry ?? [];
  return formulas.some((formula) => {
    const status = asString(formula.status)?.toLowerCase();
    const formulaId = asString(formula.formula_id)?.toLowerCase() ?? '';
    const formulaName = asString(formula.formula_name)?.toLowerCase() ?? '';
    return status === 'approved' && (formulaId.includes('thickness') || formulaId.includes('remaining') || formulaName.includes('thickness'));
  });
}

function hasNdtEvidence(measurement: Record<string, unknown>, evidenceLinks: Array<Record<string, unknown>>): boolean {
  if (hasValue(measurement, ['evidence_file_id'])) return true;
  const measurementId = asString(valueAt(measurement, ['measurement_id', 'id']));
  if (!measurementId) return false;
  return evidenceLinks.some((link) => {
    return asString(link.linked_entity_type) === 'ndt_measurement' && asString(link.linked_entity_id) === measurementId && hasValue(link, ['evidence_file_id']);
  });
}

function isCritical(measurement: Record<string, unknown>): boolean {
  return asBoolean(measurement.is_critical) ?? true;
}

export function validateEngineeringContext(context: ValidationContext): ValidationEngineResult {
  const issues: ValidationIssue[] = [];
  const scope = context.validation_scope ?? 'general';
  const asset = context.asset ?? null;
  const geometry = context.geometry ?? null;
  const shellCourses = context.shell_courses ?? [];
  const ndtMeasurements = context.ndt_measurements ?? [];
  const evidenceLinks = context.evidence_links ?? [];
  const calculationRequest = isRecord(context.calculation_request) ? context.calculation_request : {};
  const approvalRequest = isRecord(context.approval_request) ? context.approval_request : {};

  if (!hasValue(asset, ['code_edition', 'design_code_edition'])) {
    addIssue(issues, {
      group: 'asset',
      field_name: 'code_edition',
      label: 'Code edition',
      severity: 'blocking',
      message: 'Code edition is required before engineering validation, calculation, or approval.',
      suggested_fix: 'Enter the user-approved API 650/API 653 edition basis in the tank asset record.',
      engineering_note: 'AIM must not infer standard editions automatically.'
    });
  }

  if (!hasValue(asset, ['original_design_code', 'design_code'])) {
    addIssue(issues, {
      group: 'asset',
      field_name: 'original_design_code',
      label: 'Original design code',
      severity: 'warning',
      message: 'Original design code is not available.',
      suggested_fix: 'Provide API 650 or other original design basis when known.',
      engineering_note: 'Design code is a reference basis only; no code formula is executed here.'
    });
  }

  if (!hasValue(geometry, ['diameter_m', 'diameter'])) {
    addIssue(issues, {
      group: 'geometry',
      field_name: 'diameter',
      label: 'Tank diameter',
      severity: 'blocking',
      message: 'Tank diameter is required and must be unit-normalized.',
      suggested_fix: 'Enter tank diameter with unit and store internally in meters.',
      engineering_note: 'Missing diameter blocks calculation readiness.'
    });
  }

  if (!hasValue(geometry, ['shell_height_m', 'height_m', 'shell_height'])) {
    addIssue(issues, {
      group: 'geometry',
      field_name: 'shell_height',
      label: 'Shell height',
      severity: 'blocking',
      message: 'Shell height is required and must be unit-normalized.',
      suggested_fix: 'Enter shell height with unit and store internally in meters.',
      engineering_note: 'Missing shell height blocks calculation readiness.'
    });
  }

  const numberOfCourses = asNumber(valueAt(geometry, ['number_of_courses']));
  if (numberOfCourses !== undefined && shellCourses.length > 0 && shellCourses.length !== numberOfCourses) {
    addIssue(issues, {
      group: 'shell_course',
      field_name: 'number_of_courses',
      label: 'Number of shell courses',
      severity: 'warning',
      message: 'Number of shell course records does not match geometry number_of_courses.',
      suggested_fix: 'Confirm geometry count or add missing shell course records.',
      engineering_note: 'Mismatch should be resolved before calculation.'
    });
  }

  if (shellCourses.length === 0) {
    addIssue(issues, {
      group: 'shell_course',
      field_name: 'shell_courses',
      label: 'Shell courses',
      severity: scope === 'general' ? 'warning' : 'blocking',
      message: 'No shell course master data is available.',
      suggested_fix: 'Add shell course records with material, thickness, height, and joint efficiency.',
      engineering_note: 'Shell course data is required for future tank thickness evaluation.'
    });
  }

  shellCourses.forEach((course, index) => {
    const prefix = `shell_courses[${index}]`;
    if (!hasValue(course, ['material_id', 'material_code', 'material_specification'])) {
      addIssue(issues, {
        group: 'material',
        field_name: `${prefix}.material`,
        label: 'Shell course material',
        severity: 'blocking',
        message: 'Shell course material is required.',
        suggested_fix: 'Select a material master record for this shell course.',
        engineering_note: 'Material ambiguity must block calculation or approval where material properties are required.'
      });
    }

    if (!hasValue(course, ['joint_efficiency'])) {
      addIssue(issues, {
        group: 'shell_course',
        field_name: `${prefix}.joint_efficiency`,
        label: 'Joint efficiency',
        severity: 'blocking',
        message: 'Joint efficiency is required for shell course engineering readiness.',
        suggested_fix: 'Enter engineer-approved joint efficiency or mark it as not applicable with basis.',
        engineering_note: 'AIM must not infer joint efficiency.'
      });
    }

    if (!hasValue(course, ['nominal_thickness_mm', 'nominal_thickness'])) {
      addIssue(issues, {
        group: 'shell_course',
        field_name: `${prefix}.nominal_thickness`,
        label: 'Nominal thickness',
        severity: 'warning',
        message: 'Nominal shell thickness is missing.',
        suggested_fix: 'Enter nominal shell thickness in millimeters.',
        engineering_note: 'Nominal thickness supports traceability but is not a formula calculation here.'
      });
    }

    const requiresAllowableStress = scope !== 'general' || asBoolean(course.requires_allowable_stress) === true;
    if (requiresAllowableStress && !hasValue(course, ['material_allowable_stress_mpa'])) {
      addIssue(issues, {
        group: 'material',
        field_name: `${prefix}.material_allowable_stress_mpa`,
        label: 'Material allowable stress',
        severity: 'blocking',
        message: 'Material allowable stress is required where requested by a controlled formula or readiness check.',
        suggested_fix: 'Populate material allowable stress from engineer-approved basis or approved formula registry input set.',
        engineering_note: 'Do not invent allowable stress values from standards.'
      });
    }
  });

  ndtMeasurements.forEach((measurement, index) => {
    const prefix = `ndt_measurements[${index}]`;
    if (!hasValue(measurement, ['measured_thickness_mm', 'measured_thickness'])) {
      addIssue(issues, {
        group: 'ndt',
        field_name: `${prefix}.measured_thickness`,
        label: 'Measured thickness',
        severity: 'blocking',
        message: 'Measured thickness is required for NDT validation.',
        suggested_fix: 'Enter a positive measured thickness value and normalize it to millimeters.',
        engineering_note: 'NDT records without readings cannot support engineering decisions.'
      });
    }

    if (!hasNdtEvidence(measurement, evidenceLinks)) {
      addIssue(issues, {
        group: 'evidence',
        field_name: `${prefix}.evidence_file_id`,
        label: 'NDT evidence link',
        severity: isCritical(measurement) ? 'blocking' : 'warning',
        message: isCritical(measurement)
          ? 'Critical NDT measurement does not have traceable evidence.'
          : 'Non-critical NDT measurement does not have traceable evidence.',
        suggested_fix: 'Attach direct evidence_file_id or create an evidence_links record for this NDT measurement.',
        engineering_note: 'Evidence linkage is mandatory for final engineering use.'
      });
    }
  });

  const thicknessCheckRequested = asBoolean(calculationRequest.thickness_check_requested) === true || scope === 'thickness_check' || scope === 'calculation_readiness';
  if (thicknessCheckRequested && !approvedFormulaAvailable(context)) {
    addIssue(issues, {
      group: 'formula',
      field_name: 'formula_registry',
      label: 'Formula Registry entry',
      severity: 'blocking',
      message: 'Thickness check was requested but no approved Formula Registry entry was provided in validation context.',
      suggested_fix: 'Select an approved formula registry entry with formula_id, code_basis, edition, inputs, outputs, units, validation rules, and approver.',
      engineering_note: 'No API/API-ASME formula may be invented or executed outside the controlled Formula Registry.'
    });
  }

  const finalApprovalRequested = scope === 'final_approval' || asBoolean(approvalRequest.final_approval_requested) === true;
  if (finalApprovalRequested) {
    if (issues.some((issue) => issue.severity === 'blocking')) {
      addIssue(issues, {
        group: 'approval',
        field_name: 'final_approval',
        label: 'Final approval gate',
        severity: 'blocking',
        message: 'Final approval cannot proceed while blocking validation issues remain.',
        suggested_fix: 'Resolve all blocking asset, geometry, material, NDT, evidence, and formula readiness issues.',
        engineering_note: 'AI cannot approve; engineer/approver review is mandatory.'
      });
    } else {
      addIssue(issues, {
        group: 'approval',
        field_name: 'final_approval',
        label: 'Final approval gate',
        severity: 'info',
        message: 'No blocking validation issues detected for final approval request.',
        suggested_fix: 'Proceed only with required human approval authority.',
        engineering_note: 'This is a validation gate, not an engineering approval.'
      });
    }
  }

  const grouped = GROUPS.reduce<Record<ValidationGroup, ValidationIssue[]>>((acc, group) => {
    acc[group] = issues.filter((issue) => issue.group === group);
    return acc;
  }, {} as Record<ValidationGroup, ValidationIssue[]>);

  const blockingCount = issues.filter((issue) => issue.severity === 'blocking').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
  const infoCount = issues.filter((issue) => issue.severity === 'info').length;

  return {
    ok: blockingCount === 0,
    blocking_count: blockingCount,
    warning_count: warningCount,
    info_count: infoCount,
    issues,
    grouped
  };
}
