import { createHash } from 'node:crypto';
import { ENGINEERING_REVIEW_DISCLAIMER } from './formula-types.js';
import type {
  CalculationStatus,
  CalculationWarningCode,
  FormulaCode,
  FormulaLibraryTestCase,
  ShellThicknessMvpInputs,
  ShellThicknessMvpResult,
} from './formula-types.js';
import { evaluateShellThicknessMvpV1 } from './formula-engine.js';

export const FORMULA_LIBRARY_RUN_FORMULA_CODE: FormulaCode = 'status_logic';
export const FORMULA_LIBRARY_RUN_VERSION = '1.0.0';
export const FORMULA_LIBRARY_RUN_SET = 'shell_thickness_mvp_v1';

type JsonObject = Record<string, unknown>;

export type FormulaLibraryRunInput = ShellThicknessMvpInputs & {
  evidence_file_id?: string | null;
  source_entity_id?: string | null;
  component?: string | null;
  cml_tml_id?: string | null;
  grid_ref?: string | null;
};

export type FormulaLibraryRunRequest = {
  asset_id: string;
  inspection_event_id: string | null;
  formula_code: FormulaCode;
  formula_version: string;
  formula_set: typeof FORMULA_LIBRARY_RUN_SET;
  inputs: FormulaLibraryRunInput;
};

export type FormulaLibraryRunValidationIssue = {
  field: string;
  message: string;
  severity: 'error' | 'blocking';
};

export type FormulaLibraryRunInputRow = {
  name: string;
  rawValue: string;
  normalizedValue: number | null;
  rawUnit: string | null;
  normalizedUnit: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  evidenceFileId: string | null;
  validationStatus: 'valid' | 'warning' | 'blocked';
};

export type FormulaLibraryRunOutputRow = {
  name: string;
  value: number | null;
  unit: string | null;
  json: JsonObject;
  warningCode: string | null;
  warningMessage: string | null;
};

export type FormulaLibraryRunArtifacts = {
  result: ShellThicknessMvpResult;
  validationStatus: 'passed' | 'blocked';
  runStatus: 'completed' | 'blocked';
  status: 'ready_for_review' | 'validation_failed';
  finalUseStatus: 'requires_engineering_review' | 'blocked';
  finalUseBlockers: string[];
  inputSnapshot: JsonObject;
  normalizedInputSnapshot: JsonObject;
  validationResult: JsonObject;
  outputSnapshot: JsonObject;
  inputSnapshotHash: string;
  outputSnapshotHash: string;
  inputRows: FormulaLibraryRunInputRow[];
  outputRows: FormulaLibraryRunOutputRow[];
};

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asNullableString(value: unknown): string | null {
  return asString(value) ?? null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, nestedValue: unknown) => {
    if (!isPlainObject(nestedValue)) return nestedValue;
    return Object.keys(nestedValue)
      .sort()
      .reduce<JsonObject>((accumulator, key) => {
        accumulator[key] = nestedValue[key];
        return accumulator;
      }, {});
  });
}

function hashSnapshot(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function warningMessage(code: CalculationWarningCode): string | null {
  if (!code) return null;
  const messages: Record<Exclude<CalculationWarningCode, null>, string> = {
    CURRENT_BELOW_MINIMUM_REQUIRED_THICKNESS: 'Current thickness is below the minimum required thickness and requires engineering review.',
    ZERO_CORROSION_RATE_REVIEW_REQUIRED: 'Zero corrosion rate avoids divide-by-zero and requires engineering review before final use.',
    NEGATIVE_CORROSION_RATE_REVIEW_REQUIRED: 'Negative corrosion rate indicates source data, unit, or inspection sequence requires review.',
    MISSING_PREVIOUS_THICKNESS: 'Previous thickness is required for corrosion-rate calculation.',
    MISSING_CURRENT_THICKNESS: 'Current thickness is required for shell-thickness calculation.',
    MISSING_MINIMUM_REQUIRED_THICKNESS: 'Minimum required thickness is required for remaining-life calculation.',
    MISSING_YEARS_BETWEEN_INSPECTIONS: 'Years between inspections is required for corrosion-rate calculation.',
    INVALID_YEARS_BETWEEN_INSPECTIONS: 'Years between inspections must be greater than zero.',
    MISSING_EVIDENCE_REFERENCE: 'Evidence reference is mandatory before promotion or final engineering use.',
    UNIT_MISMATCH: 'MVP shell-thickness library accepts millimeter inputs only until engineer-reviewed conversion is implemented.',
    REMAINING_LIFE_BELOW_MVP_THRESHOLD: 'Remaining life is below the configured MVP action threshold.',
    FORMULA_VERSION_NOT_APPROVED: 'Formula version is not approved for production execution.',
    FORMULA_VERSION_RETIRED: 'Formula version is retired and cannot be used for new calculation runs.',
    UNSUPPORTED_FORMULA_ENGINE_REFERENCE: 'Formula engine reference is not supported by the controlled calculation library.',
  };
  return messages[code];
}

function finalUseBlockers(result: ShellThicknessMvpResult): string[] {
  const blockers: string[] = [];
  if (result.blocking) {
    blockers.push(result.calculation_status);
  }
  if (result.warning_code) {
    blockers.push(result.warning_code);
  }
  return Array.from(new Set(blockers));
}

function numericInputRow(
  name: keyof Pick<FormulaLibraryRunInput, 'previous_thickness_mm' | 'current_thickness_mm' | 'minimum_required_thickness_mm' | 'years_between_inspections'>,
  input: FormulaLibraryRunInput,
  validationStatus: 'valid' | 'warning' | 'blocked',
): FormulaLibraryRunInputRow {
  const unit = name === 'years_between_inspections' ? 'year' : 'mm';
  const value = input[name];
  return {
    name,
    rawValue: value === undefined ? '' : String(value),
    normalizedValue: asNumber(value),
    rawUnit: unit,
    normalizedUnit: unit,
    sourceEntityType: 'formula_library_fixture_input',
    sourceEntityId: input.source_entity_id ?? null,
    evidenceFileId: input.evidence_file_id ?? null,
    validationStatus,
  };
}

export function normalizeFormulaLibraryRunRequest(body: unknown): {
  request?: FormulaLibraryRunRequest;
  issues: FormulaLibraryRunValidationIssue[];
} {
  const issues: FormulaLibraryRunValidationIssue[] = [];
  if (!isPlainObject(body)) {
    return {
      issues: [{ field: 'body', message: 'JSON object body is required.', severity: 'error' }],
    };
  }

  const assetId = asString(body.asset_id);
  if (!assetId) {
    issues.push({ field: 'asset_id', message: 'asset_id is required.', severity: 'error' });
  }

  const formulaCode = asString(body.formula_code);
  if (formulaCode !== FORMULA_LIBRARY_RUN_FORMULA_CODE) {
    issues.push({
      field: 'formula_code',
      message: `formula_code must be explicit and equal to ${FORMULA_LIBRARY_RUN_FORMULA_CODE} for the MVP shell-thickness library run.`,
      severity: 'error',
    });
  }

  const formulaVersion = asString(body.formula_version);
  if (formulaVersion !== FORMULA_LIBRARY_RUN_VERSION) {
    issues.push({
      field: 'formula_version',
      message: `formula_version must be explicit and equal to ${FORMULA_LIBRARY_RUN_VERSION}. Silent/default formula selection is not allowed.`,
      severity: 'error',
    });
  }

  const formulaSet = asString(body.formula_set) ?? FORMULA_LIBRARY_RUN_SET;
  if (formulaSet !== FORMULA_LIBRARY_RUN_SET) {
    issues.push({ field: 'formula_set', message: `formula_set must be ${FORMULA_LIBRARY_RUN_SET}.`, severity: 'error' });
  }

  const rawInputs = isPlainObject(body.inputs) ? body.inputs : body;
  const inputs: FormulaLibraryRunInput = {
    previous_thickness_mm: asNumber(rawInputs.previous_thickness_mm),
    current_thickness_mm: asNumber(rawInputs.current_thickness_mm),
    minimum_required_thickness_mm: asNumber(rawInputs.minimum_required_thickness_mm),
    years_between_inspections: asNumber(rawInputs.years_between_inspections),
    reading_unit: asNullableString(rawInputs.reading_unit),
    evidence_code: asNullableString(rawInputs.evidence_code),
    evidence_file_id: asNullableString(rawInputs.evidence_file_id),
    source_entity_id: asNullableString(rawInputs.source_entity_id),
    component: asNullableString(rawInputs.component),
    cml_tml_id: asNullableString(rawInputs.cml_tml_id),
    grid_ref: asNullableString(rawInputs.grid_ref),
    remaining_life_action_threshold_y: asNumber(rawInputs.remaining_life_action_threshold_y),
  };

  if (!inputs.reading_unit) {
    issues.push({ field: 'inputs.reading_unit', message: 'reading_unit is required and must be mm for MVP.', severity: 'error' });
  }

  if (issues.length > 0 || !assetId || formulaCode !== FORMULA_LIBRARY_RUN_FORMULA_CODE || formulaVersion !== FORMULA_LIBRARY_RUN_VERSION || formulaSet !== FORMULA_LIBRARY_RUN_SET) {
    return { issues };
  }

  return {
    request: {
      asset_id: assetId,
      inspection_event_id: asNullableString(body.inspection_event_id),
      formula_code: FORMULA_LIBRARY_RUN_FORMULA_CODE,
      formula_version: FORMULA_LIBRARY_RUN_VERSION,
      formula_set: FORMULA_LIBRARY_RUN_SET,
      inputs,
    },
    issues,
  };
}

export function buildFormulaLibraryRunArtifacts(
  request: FormulaLibraryRunRequest,
  formulaVersionSnapshot: JsonObject,
): FormulaLibraryRunArtifacts {
  const result = evaluateShellThicknessMvpV1(request.inputs, { allowUnapprovedForValidation: true });
  const validationStatus: 'passed' | 'blocked' = result.blocking ? 'blocked' : 'passed';
  const inputRowStatus: 'valid' | 'warning' | 'blocked' = result.blocking ? 'blocked' : result.review_required ? 'warning' : 'valid';
  const blockers = finalUseBlockers(result);
  const inputSnapshot: JsonObject = {
    formula_code: request.formula_code,
    formula_version: request.formula_version,
    formula_set: request.formula_set,
    asset_id: request.asset_id,
    inspection_event_id: request.inspection_event_id,
    inputs: request.inputs,
    formula_version_snapshot: formulaVersionSnapshot,
    final_use_disclaimer: ENGINEERING_REVIEW_DISCLAIMER,
  };
  const normalizedInputSnapshot: JsonObject = {
    previous_thickness_mm: request.inputs.previous_thickness_mm ?? null,
    current_thickness_mm: request.inputs.current_thickness_mm ?? null,
    minimum_required_thickness_mm: request.inputs.minimum_required_thickness_mm ?? null,
    years_between_inspections: request.inputs.years_between_inspections ?? null,
    reading_unit: request.inputs.reading_unit ?? null,
    evidence_code: request.inputs.evidence_code ?? null,
    evidence_file_id: request.inputs.evidence_file_id ?? null,
  };
  const validationResult: JsonObject = {
    validation_status: validationStatus,
    calculation_status: result.calculation_status,
    warning_code: result.warning_code,
    blocking: result.blocking,
    review_required: result.review_required,
    final_use_blockers: blockers,
  };
  const outputSnapshot: JsonObject = {
    formula_set: request.formula_set,
    deterministic_engine_references: [
      'AIM_ENGINE_BUILTIN:CORROSION_RATE_MVP_V1',
      'AIM_ENGINE_BUILTIN:REMAINING_LIFE_MVP_V1',
      'AIM_ENGINE_BUILTIN:STATUS_LOGIC_MVP_V1',
    ],
    result,
    final_use_status: result.blocking ? 'blocked' : 'requires_engineering_review',
    final_use_disclaimer: ENGINEERING_REVIEW_DISCLAIMER,
    final_use_blockers: blockers,
  };

  const inputRows: FormulaLibraryRunInputRow[] = [
    numericInputRow('previous_thickness_mm', request.inputs, inputRowStatus),
    numericInputRow('current_thickness_mm', request.inputs, inputRowStatus),
    numericInputRow('minimum_required_thickness_mm', request.inputs, inputRowStatus),
    numericInputRow('years_between_inspections', request.inputs, inputRowStatus),
    {
      name: 'reading_unit',
      rawValue: request.inputs.reading_unit ?? '',
      normalizedValue: null,
      rawUnit: null,
      normalizedUnit: request.inputs.reading_unit ?? null,
      sourceEntityType: 'formula_library_fixture_input',
      sourceEntityId: request.inputs.source_entity_id ?? null,
      evidenceFileId: request.inputs.evidence_file_id ?? null,
      validationStatus: inputRowStatus,
    },
    {
      name: 'evidence_code',
      rawValue: request.inputs.evidence_code ?? '',
      normalizedValue: null,
      rawUnit: null,
      normalizedUnit: null,
      sourceEntityType: 'evidence_link',
      sourceEntityId: request.inputs.source_entity_id ?? null,
      evidenceFileId: request.inputs.evidence_file_id ?? null,
      validationStatus: request.inputs.evidence_code ? inputRowStatus : 'blocked',
    },
  ];

  const outputRows: FormulaLibraryRunOutputRow[] = [
    {
      name: 'corrosion_rate_mm_y',
      value: result.corrosion_rate_mm_y,
      unit: 'mm/year',
      json: { value: result.corrosion_rate_mm_y, final_use_disclaimer: ENGINEERING_REVIEW_DISCLAIMER },
      warningCode: null,
      warningMessage: null,
    },
    {
      name: 'remaining_life_y',
      value: typeof result.remaining_life_y === 'number' ? result.remaining_life_y : null,
      unit: 'year',
      json: { value: result.remaining_life_y, final_use_disclaimer: ENGINEERING_REVIEW_DISCLAIMER },
      warningCode: null,
      warningMessage: null,
    },
    {
      name: 'calculation_status',
      value: null,
      unit: null,
      json: { value: result.calculation_status, final_use_disclaimer: ENGINEERING_REVIEW_DISCLAIMER },
      warningCode: result.warning_code,
      warningMessage: warningMessage(result.warning_code),
    },
    {
      name: 'warning_code',
      value: null,
      unit: null,
      json: { value: result.warning_code, final_use_disclaimer: ENGINEERING_REVIEW_DISCLAIMER },
      warningCode: result.warning_code,
      warningMessage: warningMessage(result.warning_code),
    },
  ];

  return {
    result,
    validationStatus,
    runStatus: result.blocking ? 'blocked' : 'completed',
    status: result.blocking ? 'validation_failed' : 'ready_for_review',
    finalUseStatus: result.blocking ? 'blocked' : 'requires_engineering_review',
    finalUseBlockers: blockers,
    inputSnapshot,
    normalizedInputSnapshot,
    validationResult,
    outputSnapshot,
    inputSnapshotHash: hashSnapshot(inputSnapshot),
    outputSnapshotHash: hashSnapshot(outputSnapshot),
    inputRows,
    outputRows,
  };
}

export function formulaLibraryRunFixtureRequest(testCase: FormulaLibraryTestCase): FormulaLibraryRunRequest {
  return {
    asset_id: '33333333-3333-4333-8333-333333333333',
    inspection_event_id: null,
    formula_code: FORMULA_LIBRARY_RUN_FORMULA_CODE,
    formula_version: FORMULA_LIBRARY_RUN_VERSION,
    formula_set: FORMULA_LIBRARY_RUN_SET,
    inputs: {
      previous_thickness_mm: testCase.previous_thickness_mm,
      current_thickness_mm: testCase.current_thickness_mm,
      minimum_required_thickness_mm: testCase.minimum_required_thickness_mm,
      years_between_inspections: testCase.years_between_inspections,
      reading_unit: testCase.reading_unit,
      evidence_code: testCase.evidence_code,
      component: testCase.component,
    },
  };
}
