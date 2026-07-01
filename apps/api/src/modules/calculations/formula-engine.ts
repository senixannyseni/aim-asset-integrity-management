import { ENGINEERING_REVIEW_DISCLAIMER } from './formula-types.js';
import type {
  CalculationBaseResult,
  CalculationStatus,
  CalculationWarningCode,
  CorrosionRateResult,
  FormulaExecutionOptions,
  FormulaVersionDefinition,
  RemainingLifeResult,
  ShellThicknessMvpInputs,
  ShellThicknessMvpResult,
} from './formula-types.js';
import { assertFormulaCanRun, getFormulaVersionByCode } from './formula-library.js';

const DEFAULT_FORMULA_VERSION = '1.0.0';
const DEFAULT_REMAINING_LIFE_ACTION_THRESHOLD_Y = 1;

function round(value: number, decimals = 6): number {
  const multiplier = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function missing(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

function baseResult(
  formulaVersionUsed: string,
  calculationStatus: CalculationStatus,
  warningCode: CalculationWarningCode,
): CalculationBaseResult {
  const blockingStatuses: CalculationStatus[] = [
    'INCOMPLETE_INPUT',
    'UNIT_REVIEW_REQUIRED',
    'BLOCKED_MISSING_EVIDENCE',
    'BELOW_MIN_REVIEW',
    'FAILED',
  ];

  return {
    calculation_status: calculationStatus,
    warning_code: warningCode,
    formula_version_used: formulaVersionUsed,
    disclaimer: ENGINEERING_REVIEW_DISCLAIMER,
    blocking: blockingStatuses.includes(calculationStatus),
    review_required: calculationStatus !== 'OK',
  };
}

function requireFormula(
  formulaCode: 'corrosion_rate' | 'remaining_life' | 'status_logic',
  options: FormulaExecutionOptions,
  versionNo = DEFAULT_FORMULA_VERSION,
): FormulaVersionDefinition {
  const formula = getFormulaVersionByCode(formulaCode, versionNo);

  if (!formula) {
    throw new Error(`Formula version not found: ${formulaCode}@${versionNo}`);
  }

  assertFormulaCanRun(formula, options);
  return formula;
}

function hasUnitMismatch(inputs: Pick<ShellThicknessMvpInputs, 'reading_unit'>): boolean {
  return inputs.reading_unit !== 'mm';
}

function hasMissingEvidence(inputs: Pick<ShellThicknessMvpInputs, 'evidence_code'>): boolean {
  return missing(inputs.evidence_code);
}

export function calculateCorrosionRateMvpV1(
  inputs: ShellThicknessMvpInputs,
  options: FormulaExecutionOptions = { allowUnapprovedForValidation: true },
): CorrosionRateResult {
  const formula = requireFormula('corrosion_rate', options);
  const formulaVersionUsed = `${formula.formulaCode}@${formula.versionNo}`;

  if (hasUnitMismatch(inputs)) {
    return {
      corrosion_rate_mm_y: null,
      ...baseResult(formulaVersionUsed, 'UNIT_REVIEW_REQUIRED', 'UNIT_MISMATCH'),
    };
  }

  if (missing(inputs.previous_thickness_mm)) {
    return {
      corrosion_rate_mm_y: null,
      ...baseResult(formulaVersionUsed, 'INCOMPLETE_INPUT', 'MISSING_PREVIOUS_THICKNESS'),
    };
  }

  if (missing(inputs.current_thickness_mm)) {
    return {
      corrosion_rate_mm_y: null,
      ...baseResult(formulaVersionUsed, 'INCOMPLETE_INPUT', 'MISSING_CURRENT_THICKNESS'),
    };
  }

  if (missing(inputs.years_between_inspections)) {
    return {
      corrosion_rate_mm_y: null,
      ...baseResult(formulaVersionUsed, 'INCOMPLETE_INPUT', 'MISSING_YEARS_BETWEEN_INSPECTIONS'),
    };
  }

  if (!isFiniteNumber(inputs.previous_thickness_mm) || !isFiniteNumber(inputs.current_thickness_mm)) {
    return {
      corrosion_rate_mm_y: null,
      ...baseResult(formulaVersionUsed, 'INCOMPLETE_INPUT', 'MISSING_PREVIOUS_THICKNESS'),
    };
  }

  if (!isFiniteNumber(inputs.years_between_inspections) || inputs.years_between_inspections <= 0) {
    return {
      corrosion_rate_mm_y: null,
      ...baseResult(formulaVersionUsed, 'INCOMPLETE_INPUT', 'INVALID_YEARS_BETWEEN_INSPECTIONS'),
    };
  }

  const corrosionRate = round(
    (inputs.previous_thickness_mm - inputs.current_thickness_mm) / inputs.years_between_inspections,
  );

  if (hasMissingEvidence(inputs)) {
    return {
      corrosion_rate_mm_y: corrosionRate,
      ...baseResult(formulaVersionUsed, 'BLOCKED_MISSING_EVIDENCE', 'MISSING_EVIDENCE_REFERENCE'),
    };
  }

  if (corrosionRate < 0) {
    return {
      corrosion_rate_mm_y: corrosionRate,
      ...baseResult(formulaVersionUsed, 'DATA_REVIEW_REQUIRED', 'NEGATIVE_CORROSION_RATE_REVIEW_REQUIRED'),
    };
  }

  if (corrosionRate === 0) {
    return {
      corrosion_rate_mm_y: corrosionRate,
      ...baseResult(formulaVersionUsed, 'OK_ZERO_RATE_REVIEW', 'ZERO_CORROSION_RATE_REVIEW_REQUIRED'),
    };
  }

  return {
    corrosion_rate_mm_y: corrosionRate,
    ...baseResult(formulaVersionUsed, 'OK', null),
  };
}

export function calculateRemainingLifeMvpV1(
  inputs: ShellThicknessMvpInputs & { corrosion_rate_mm_y?: number | null },
  options: FormulaExecutionOptions = { allowUnapprovedForValidation: true },
): RemainingLifeResult {
  const formula = requireFormula('remaining_life', options);
  const formulaVersionUsed = `${formula.formulaCode}@${formula.versionNo}`;

  if (hasUnitMismatch(inputs)) {
    return {
      remaining_life_y: 'N/A',
      ...baseResult(formulaVersionUsed, 'UNIT_REVIEW_REQUIRED', 'UNIT_MISMATCH'),
    };
  }

  if (missing(inputs.current_thickness_mm)) {
    return {
      remaining_life_y: 'N/A',
      ...baseResult(formulaVersionUsed, 'INCOMPLETE_INPUT', 'MISSING_CURRENT_THICKNESS'),
    };
  }

  if (missing(inputs.minimum_required_thickness_mm)) {
    return {
      remaining_life_y: 'N/A',
      ...baseResult(formulaVersionUsed, 'INCOMPLETE_INPUT', 'MISSING_MINIMUM_REQUIRED_THICKNESS'),
    };
  }

  const corrosionRate = inputs.corrosion_rate_mm_y;

  if (!isFiniteNumber(corrosionRate)) {
    return {
      remaining_life_y: 'N/A',
      ...baseResult(formulaVersionUsed, 'INCOMPLETE_INPUT', 'MISSING_PREVIOUS_THICKNESS'),
    };
  }

  if (corrosionRate < 0) {
    return {
      remaining_life_y: 'N/A',
      ...baseResult(formulaVersionUsed, 'DATA_REVIEW_REQUIRED', 'NEGATIVE_CORROSION_RATE_REVIEW_REQUIRED'),
    };
  }

  if (corrosionRate === 0) {
    return {
      remaining_life_y: 'N/A',
      ...baseResult(formulaVersionUsed, 'OK_ZERO_RATE_REVIEW', 'ZERO_CORROSION_RATE_REVIEW_REQUIRED'),
    };
  }

  if (!isFiniteNumber(inputs.current_thickness_mm) || !isFiniteNumber(inputs.minimum_required_thickness_mm)) {
    return {
      remaining_life_y: 'N/A',
      ...baseResult(formulaVersionUsed, 'INCOMPLETE_INPUT', 'MISSING_CURRENT_THICKNESS'),
    };
  }

  const remainingLife = round((inputs.current_thickness_mm - inputs.minimum_required_thickness_mm) / corrosionRate);

  if (hasMissingEvidence(inputs)) {
    return {
      remaining_life_y: remainingLife,
      ...baseResult(formulaVersionUsed, 'BLOCKED_MISSING_EVIDENCE', 'MISSING_EVIDENCE_REFERENCE'),
    };
  }

  if (inputs.current_thickness_mm < inputs.minimum_required_thickness_mm) {
    return {
      remaining_life_y: remainingLife,
      ...baseResult(formulaVersionUsed, 'BELOW_MIN_REVIEW', 'CURRENT_BELOW_MINIMUM_REQUIRED_THICKNESS'),
    };
  }

  return {
    remaining_life_y: remainingLife,
    ...baseResult(formulaVersionUsed, 'OK', null),
  };
}

export function calculateStatusLogicMvpV1(
  inputs: ShellThicknessMvpInputs & { corrosion_rate_mm_y?: number | null; remaining_life_y?: number | 'N/A' | null },
  options: FormulaExecutionOptions = { allowUnapprovedForValidation: true },
): CalculationBaseResult {
  const formula = requireFormula('status_logic', options);
  const formulaVersionUsed = `${formula.formulaCode}@${formula.versionNo}`;

  if (hasUnitMismatch(inputs)) {
    return baseResult(formulaVersionUsed, 'UNIT_REVIEW_REQUIRED', 'UNIT_MISMATCH');
  }

  if (missing(inputs.previous_thickness_mm)) {
    return baseResult(formulaVersionUsed, 'INCOMPLETE_INPUT', 'MISSING_PREVIOUS_THICKNESS');
  }

  if (hasMissingEvidence(inputs)) {
    return baseResult(formulaVersionUsed, 'BLOCKED_MISSING_EVIDENCE', 'MISSING_EVIDENCE_REFERENCE');
  }

  if (isFiniteNumber(inputs.corrosion_rate_mm_y) && inputs.corrosion_rate_mm_y < 0) {
    return baseResult(formulaVersionUsed, 'DATA_REVIEW_REQUIRED', 'NEGATIVE_CORROSION_RATE_REVIEW_REQUIRED');
  }

  if (isFiniteNumber(inputs.corrosion_rate_mm_y) && inputs.corrosion_rate_mm_y === 0) {
    return baseResult(formulaVersionUsed, 'OK_ZERO_RATE_REVIEW', 'ZERO_CORROSION_RATE_REVIEW_REQUIRED');
  }

  if (
    isFiniteNumber(inputs.current_thickness_mm) &&
    isFiniteNumber(inputs.minimum_required_thickness_mm) &&
    inputs.current_thickness_mm < inputs.minimum_required_thickness_mm
  ) {
    return baseResult(formulaVersionUsed, 'BELOW_MIN_REVIEW', 'CURRENT_BELOW_MINIMUM_REQUIRED_THICKNESS');
  }

  const threshold = inputs.remaining_life_action_threshold_y ?? DEFAULT_REMAINING_LIFE_ACTION_THRESHOLD_Y;
  if (isFiniteNumber(inputs.remaining_life_y) && inputs.remaining_life_y < threshold) {
    return baseResult(formulaVersionUsed, 'ACTION_REQUIRED', 'REMAINING_LIFE_BELOW_MVP_THRESHOLD');
  }

  return baseResult(formulaVersionUsed, 'OK', null);
}

/**
 * Runs the approved MVP shell-thickness fixture chain in a deterministic order:
 * corrosion rate -> remaining life -> status logic.
 *
 * This is a controlled built-in fixture. It intentionally does not reproduce
 * proprietary API/ASME clauses or use dynamic expression evaluation.
 */
export function evaluateShellThicknessMvpV1(
  inputs: ShellThicknessMvpInputs,
  options: FormulaExecutionOptions = { allowUnapprovedForValidation: true },
): ShellThicknessMvpResult {
  const corrosion = calculateCorrosionRateMvpV1(inputs, options);
  const remainingLife = calculateRemainingLifeMvpV1(
    { ...inputs, corrosion_rate_mm_y: corrosion.corrosion_rate_mm_y },
    options,
  );
  const status = calculateStatusLogicMvpV1(
    {
      ...inputs,
      corrosion_rate_mm_y: corrosion.corrosion_rate_mm_y,
      remaining_life_y: remainingLife.remaining_life_y,
    },
    options,
  );

  return {
    corrosion_rate_mm_y: corrosion.corrosion_rate_mm_y,
    remaining_life_y: remainingLife.remaining_life_y,
    calculation_status: status.calculation_status,
    warning_code: status.warning_code,
    formula_version_used: 'shell_thickness_mvp_v1@1.0.0',
    disclaimer: ENGINEERING_REVIEW_DISCLAIMER,
    blocking: status.blocking,
    review_required: status.review_required,
  };
}
