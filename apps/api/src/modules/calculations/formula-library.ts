import type {
  CalculationWarningCode,
  FormulaApprovalStatus,
  FormulaCode,
  FormulaEngineReference,
  FormulaExecutionOptions,
  FormulaFieldSchema,
  FormulaVersionDefinition,
} from './formula-types.js';

const corrosionRateInputSchema: FormulaFieldSchema[] = [
  { key: 'previous_thickness_mm', label: 'Previous thickness', type: 'number', unit: 'mm', required: true, source_table: 'thickness_readings', evidence_required: true, validation: ['must_be_numeric', 'must_be_gt_0'] },
  { key: 'current_thickness_mm', label: 'Current thickness', type: 'number', unit: 'mm', required: true, source_table: 'thickness_readings', evidence_required: true, validation: ['must_be_numeric', 'must_be_gt_0'] },
  { key: 'years_between_inspections', label: 'Years between inspections', type: 'number', unit: 'year', required: true, source_table: 'thickness_readings', evidence_required: false, validation: ['must_be_numeric', 'must_be_gt_0'] },
  { key: 'reading_unit', label: 'Thickness unit', type: 'string', required: true, allowed_values: ['mm'], validation: ['must_equal_mm_for_mvp'] },
  { key: 'evidence_code', label: 'Evidence code', type: 'string', required: true, source_table: 'evidence_links', validation: ['must_exist', 'must_link_to_input'] },
];

const remainingLifeInputSchema: FormulaFieldSchema[] = [
  { key: 'current_thickness_mm', label: 'Current thickness', type: 'number', unit: 'mm', required: true, source_table: 'thickness_readings', evidence_required: true, validation: ['must_be_numeric', 'must_be_gt_0'] },
  { key: 'minimum_required_thickness_mm', label: 'Minimum required thickness', type: 'number', unit: 'mm', required: true, source_table: 'thickness_readings', evidence_required: true, validation: ['must_be_numeric', 'must_be_gt_0', 'engineer_approved_source_required'] },
  { key: 'corrosion_rate_mm_y', label: 'Corrosion rate', type: 'number', unit: 'mm/year', required: true, source_table: 'calculation_outputs', evidence_required: true, validation: ['must_be_numeric'] },
  { key: 'reading_unit', label: 'Thickness unit', type: 'string', required: true, allowed_values: ['mm'], validation: ['must_equal_mm_for_mvp'] },
  { key: 'evidence_code', label: 'Evidence code', type: 'string', required: true, source_table: 'evidence_links', validation: ['must_exist', 'must_link_to_input'] },
];

const commonOutputSchema: FormulaFieldSchema[] = [
  { key: 'warning_code', label: 'Warning code', type: 'string_or_null' },
  { key: 'calculation_status', label: 'Calculation status', type: 'string' },
  { key: 'formula_version_used', label: 'Formula version used', type: 'string' },
  { key: 'disclaimer', label: 'Disclaimer', type: 'string', fixed_value: 'Engineering review required before final use.' },
];

export const MVP_SHELL_THICKNESS_FORMULA_LIBRARY: FormulaVersionDefinition[] = [
  {
    formulaVersionId: 'f6530000-0000-4000-8000-000000000101',
    formulaCode: 'corrosion_rate',
    formulaName: 'MVP Shell Thickness Corrosion Rate',
    versionNo: '1.0.0',
    formulaType: 'mvp_fixture',
    standardContext: ['API 653 high-level storage tank inspection governance'],
    sourceType: 'approved_fixture_required',
    sourceReference: '07_Calculation/calculation_validation_method.md#5.1 and 07_Calculation/validation_workbook.xlsx!Manual_Calculation',
    expressionRef: 'AIM_ENGINE_BUILTIN:CORROSION_RATE_MVP_V1',
    assetTypeAllowed: ['atmospheric_storage_tank'],
    componentTypeAllowed: ['shell_course'],
    approvedStatus: 'under_review',
    productionEnabled: false,
    reviewRequiredBeforeProduction: true,
    inputSchema: corrosionRateInputSchema,
    outputSchema: [{ key: 'corrosion_rate_mm_y', label: 'Corrosion rate', type: 'number_or_null', unit: 'mm/year' }, ...commonOutputSchema],
    validationRules: [
      'Block if missing previous_thickness_mm, current_thickness_mm, or years_between_inspections.',
      'Block if years_between_inspections <= 0.',
      'Block official use if evidence_code is missing.',
      'Block final use if reading_unit is not mm.',
      'If corrosion_rate_mm_y < 0, return DATA_REVIEW_REQUIRED and require engineer review.',
    ],
  },
  {
    formulaVersionId: 'f6530000-0000-4000-8000-000000000102',
    formulaCode: 'remaining_life',
    formulaName: 'MVP Shell Thickness Remaining Life',
    versionNo: '1.0.0',
    formulaType: 'mvp_fixture',
    standardContext: ['API 653 high-level storage tank inspection governance'],
    sourceType: 'approved_fixture_required',
    sourceReference: '07_Calculation/calculation_validation_method.md#5.2 and 07_Calculation/validation_workbook.xlsx!Manual_Calculation',
    expressionRef: 'AIM_ENGINE_BUILTIN:REMAINING_LIFE_MVP_V1',
    assetTypeAllowed: ['atmospheric_storage_tank'],
    componentTypeAllowed: ['shell_course'],
    approvedStatus: 'under_review',
    productionEnabled: false,
    reviewRequiredBeforeProduction: true,
    inputSchema: remainingLifeInputSchema,
    outputSchema: [{ key: 'remaining_life_y', label: 'Remaining life', type: 'number_or_na', unit: 'year' }, ...commonOutputSchema],
    validationRules: [
      'Calculate only when corrosion_rate_mm_y > 0.',
      'If corrosion_rate_mm_y = 0, return N/A and OK_ZERO_RATE_REVIEW style warning.',
      'If corrosion_rate_mm_y < 0, return N/A and DATA_REVIEW_REQUIRED.',
      'If current_thickness_mm < minimum_required_thickness_mm, flag BELOW_MIN_REVIEW.',
      'Block official use if evidence_code is missing or unit is not mm.',
    ],
  },
  {
    formulaVersionId: 'f6530000-0000-4000-8000-000000000103',
    formulaCode: 'status_logic',
    formulaName: 'MVP Shell Thickness Status Logic',
    versionNo: '1.0.0',
    formulaType: 'mvp_fixture',
    standardContext: ['API 653 high-level storage tank inspection governance'],
    sourceType: 'approved_fixture_required',
    sourceReference: '07_Calculation/calculation_validation_method.md#5.3 and 07_Calculation/validation_workbook.xlsx!Manual_Calculation',
    expressionRef: 'AIM_ENGINE_BUILTIN:STATUS_LOGIC_MVP_V1',
    assetTypeAllowed: ['atmospheric_storage_tank'],
    componentTypeAllowed: ['shell_course'],
    approvedStatus: 'under_review',
    productionEnabled: false,
    reviewRequiredBeforeProduction: true,
    inputSchema: [
      ...remainingLifeInputSchema,
      { key: 'remaining_life_action_threshold_y', label: 'MVP action threshold', type: 'number', unit: 'year', required: false, validation: ['must_be_numeric', 'must_be_gte_0'] },
    ],
    outputSchema: [
      { key: 'integrity_status', label: 'Integrity status', type: 'string' },
      { key: 'required_action', label: 'Required action', type: 'string_or_null' },
      ...commonOutputSchema,
    ],
    validationRules: [
      'Missing required numeric inputs returns INCOMPLETE_INPUT.',
      'Unit mismatch returns UNIT_REVIEW_REQUIRED.',
      'Missing evidence returns BLOCKED_MISSING_EVIDENCE even if numeric calculation is possible.',
      'Current thickness below minimum required thickness returns BELOW_MIN_REVIEW.',
      'Remaining life below configured threshold returns ACTION_REQUIRED.',
    ],
  },
];

export function listFormulaVersions(): FormulaVersionDefinition[] {
  return [...MVP_SHELL_THICKNESS_FORMULA_LIBRARY];
}

export function getFormulaVersionByCode(
  formulaCode: FormulaCode,
  versionNo = '1.0.0',
): FormulaVersionDefinition | undefined {
  return MVP_SHELL_THICKNESS_FORMULA_LIBRARY.find(
    (formula) => formula.formulaCode === formulaCode && formula.versionNo === versionNo,
  );
}

export function getFormulaVersionByEngineRef(
  expressionRef: FormulaEngineReference,
): FormulaVersionDefinition | undefined {
  return MVP_SHELL_THICKNESS_FORMULA_LIBRARY.find((formula) => formula.expressionRef === expressionRef);
}

export function isFormulaApprovedForProduction(formula: Pick<FormulaVersionDefinition, 'approvedStatus' | 'productionEnabled'>): boolean {
  return formula.approvedStatus === 'approved' && formula.productionEnabled === true;
}

export function assertFormulaCanRun(
  formula: FormulaVersionDefinition,
  options: FormulaExecutionOptions = {},
): void {
  const productionMode = options.productionMode ?? false;
  const allowUnapprovedForValidation = options.allowUnapprovedForValidation ?? false;

  if (formula.approvedStatus === 'retired') {
    throw new FormulaLibraryError('Formula version is retired and cannot be used for new calculation runs.', 'FORMULA_VERSION_RETIRED');
  }

  if (productionMode && !isFormulaApprovedForProduction(formula)) {
    throw new FormulaLibraryError('Formula version is not approved for production calculation runs.', 'FORMULA_VERSION_NOT_APPROVED');
  }

  if (!productionMode && !allowUnapprovedForValidation && formula.approvedStatus !== 'approved') {
    throw new FormulaLibraryError('Formula version is not approved. Enable allowUnapprovedForValidation for fixture validation only.', 'FORMULA_VERSION_NOT_APPROVED');
  }
}

export class FormulaLibraryError extends Error {
  readonly warningCode: Exclude<CalculationWarningCode, null>;
  readonly approvalStatus?: FormulaApprovalStatus;

  constructor(message: string, warningCode: Exclude<CalculationWarningCode, null>, approvalStatus?: FormulaApprovalStatus) {
    super(message);
    this.name = 'FormulaLibraryError';
    this.warningCode = warningCode;
    if (approvalStatus !== undefined) {
      this.approvalStatus = approvalStatus;
    }
  }
}
