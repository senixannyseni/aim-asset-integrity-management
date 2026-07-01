export const ENGINEERING_REVIEW_DISCLAIMER = 'Engineering review required before final use.' as const;

export type FormulaCode = 'corrosion_rate' | 'remaining_life' | 'status_logic';

export type FormulaEngineReference =
  | 'AIM_ENGINE_BUILTIN:CORROSION_RATE_MVP_V1'
  | 'AIM_ENGINE_BUILTIN:REMAINING_LIFE_MVP_V1'
  | 'AIM_ENGINE_BUILTIN:STATUS_LOGIC_MVP_V1';

export type FormulaApprovalStatus = 'draft' | 'under_review' | 'approved' | 'retired' | 'rejected';

export type CalculationStatus =
  | 'OK'
  | 'OK_ZERO_RATE_REVIEW'
  | 'ACTION_REQUIRED'
  | 'BELOW_MIN_REVIEW'
  | 'DATA_REVIEW_REQUIRED'
  | 'INCOMPLETE_INPUT'
  | 'UNIT_REVIEW_REQUIRED'
  | 'BLOCKED_MISSING_EVIDENCE'
  | 'N_A_ZERO_RATE'
  | 'N_A_NEGATIVE_RATE'
  | 'FAILED';

export type CalculationWarningCode =
  | 'CURRENT_BELOW_MINIMUM_REQUIRED_THICKNESS'
  | 'ZERO_CORROSION_RATE_REVIEW_REQUIRED'
  | 'NEGATIVE_CORROSION_RATE_REVIEW_REQUIRED'
  | 'MISSING_PREVIOUS_THICKNESS'
  | 'MISSING_CURRENT_THICKNESS'
  | 'MISSING_MINIMUM_REQUIRED_THICKNESS'
  | 'MISSING_YEARS_BETWEEN_INSPECTIONS'
  | 'INVALID_YEARS_BETWEEN_INSPECTIONS'
  | 'MISSING_EVIDENCE_REFERENCE'
  | 'UNIT_MISMATCH'
  | 'REMAINING_LIFE_BELOW_MVP_THRESHOLD'
  | 'FORMULA_VERSION_NOT_APPROVED'
  | 'FORMULA_VERSION_RETIRED'
  | 'UNSUPPORTED_FORMULA_ENGINE_REFERENCE'
  | null;

export interface FormulaFieldSchema {
  key: string;
  label: string;
  type: string;
  unit?: string | null;
  required?: boolean;
  allowed_values?: string[];
  source_table?: string;
  evidence_required?: boolean;
  validation?: string[];
  fixed_value?: unknown;
}

export interface FormulaVersionDefinition {
  formulaVersionId: string;
  formulaCode: FormulaCode;
  formulaName: string;
  versionNo: string;
  formulaType: 'mvp_fixture' | string;
  standardContext: string[];
  sourceType: string;
  sourceReference: string;
  expressionRef: FormulaEngineReference;
  assetTypeAllowed: string[];
  componentTypeAllowed: string[];
  approvedStatus: FormulaApprovalStatus;
  productionEnabled: boolean;
  reviewRequiredBeforeProduction: boolean;
  inputSchema: FormulaFieldSchema[];
  outputSchema: FormulaFieldSchema[];
  validationRules: string[];
}

export interface FormulaExecutionOptions {
  /**
   * Production mode blocks formulas that are not explicitly approved and production-enabled.
   * Keep false for validation fixtures and unit tests.
   */
  productionMode?: boolean;
  /**
   * Allows draft/under_review formulas to run for fixture validation only.
   */
  allowUnapprovedForValidation?: boolean;
}

export interface ShellThicknessMvpInputs {
  previous_thickness_mm?: number | null;
  current_thickness_mm?: number | null;
  minimum_required_thickness_mm?: number | null;
  years_between_inspections?: number | null;
  reading_unit?: string | null;
  evidence_code?: string | null;
  /** MVP threshold used by the status fixture. Defaults to 1 year. */
  remaining_life_action_threshold_y?: number | null;
}

export interface CalculationBaseResult {
  calculation_status: CalculationStatus;
  warning_code: CalculationWarningCode;
  formula_version_used: string;
  disclaimer: typeof ENGINEERING_REVIEW_DISCLAIMER;
  blocking: boolean;
  review_required: boolean;
}

export interface CorrosionRateResult extends CalculationBaseResult {
  corrosion_rate_mm_y: number | null;
}

export interface RemainingLifeResult extends CalculationBaseResult {
  remaining_life_y: number | 'N/A' | null;
}

export interface ShellThicknessMvpResult extends CalculationBaseResult {
  corrosion_rate_mm_y: number | null;
  remaining_life_y: number | 'N/A' | null;
}

export interface FormulaLibraryTestCase extends ShellThicknessMvpInputs {
  test_case_id: string;
  test_case_name: string;
  formula_set: string;
  asset_tag: string;
  component: string;
  expected_corrosion_rate_mm_y: number | null;
  expected_remaining_life_y: number | 'N/A' | null;
  expected_status: CalculationStatus;
  expected_warning_code: CalculationWarningCode;
  purpose: string;
  priority: string;
}
