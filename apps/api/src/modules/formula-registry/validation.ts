export const FORMULA_TYPES = [
  'universal_deterministic',
  'api_controlled',
  'rbi_rule',
  'ffs_trigger',
  'report_phrase_rule'
] as const;

export type FormulaType = (typeof FORMULA_TYPES)[number];

export const FORMULA_STATUSES = ['draft', 'under_review', 'approved', 'deprecated', 'locked'] as const;
export type FormulaStatus = (typeof FORMULA_STATUSES)[number];

export const EXPRESSION_TYPES = ['none', 'controlled_placeholder', 'engineer_entered', 'json_logic', 'text_rule'] as const;
export type ExpressionType = (typeof EXPRESSION_TYPES)[number];

export type ValidationIssue = {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
};

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
}

export function asJsonObject(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}

export function asJsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function isFormulaType(value: unknown): value is FormulaType {
  return typeof value === 'string' && (FORMULA_TYPES as readonly string[]).includes(value);
}

export function isFormulaStatus(value: unknown): value is FormulaStatus {
  return typeof value === 'string' && (FORMULA_STATUSES as readonly string[]).includes(value);
}

export function isExpressionType(value: unknown): value is ExpressionType {
  return typeof value === 'string' && (EXPRESSION_TYPES as readonly string[]).includes(value);
}

export function isApiControlledFormula(value: unknown): boolean {
  return value === 'api_controlled' || value === 'rbi_rule' || value === 'ffs_trigger';
}

export function isFormulaUsableInProduction(row: { status?: unknown; locked_flag?: unknown }): boolean {
  return row.status === 'approved' || row.status === 'locked';
}

export function nextFormulaVersion(version: unknown): string {
  const value = asString(version) ?? '0.0.0';
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!match) return `${value}-next-${Date.now()}`;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]) + 1;
  return `${major}.${minor}.${patch}`;
}

export function validateFormulaPayload(payload: Record<string, unknown>, mode: 'create' | 'update' = 'create'): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const required = [
    'formula_id',
    'formula_name',
    'code_basis',
    'code_edition',
    'clause_reference',
    'formula_type',
    'expression_type',
    'formula_expression_source',
    'input_schema',
    'output_schema',
    'unit_rules',
    'validation_rules'
  ];

  if (mode === 'create') {
    for (const field of required) {
      const value = payload[field];
      if (field.endsWith('_schema') || field.endsWith('_rules')) {
        if (!isPlainObject(value) && !Array.isArray(value)) {
          issues.push({ field, message: `${field} must be provided as JSON.`, severity: 'error' });
        }
      } else if (!asString(value)) {
        issues.push({ field, message: `${field} is required.`, severity: 'error' });
      }
    }
  }

  const formulaType = asString(payload.formula_type);
  if (formulaType && !isFormulaType(formulaType)) {
    issues.push({ field: 'formula_type', message: `Formula type must be one of: ${FORMULA_TYPES.join(', ')}.`, severity: 'error' });
  }

  const expressionType = asString(payload.expression_type);
  if (expressionType && !isExpressionType(expressionType)) {
    issues.push({ field: 'expression_type', message: `Expression type must be one of: ${EXPRESSION_TYPES.join(', ')}.`, severity: 'error' });
  }

  const status = asString(payload.status);
  if (status && !isFormulaStatus(status)) {
    issues.push({ field: 'status', message: `Status must be one of: ${FORMULA_STATUSES.join(', ')}.`, severity: 'error' });
  }


  const formulaExpressionSource = asString(payload.formula_expression_source);
  if (isApiControlledFormula(formulaType) && formulaExpressionSource && formulaExpressionSource !== 'controlled_placeholder_manual_entry' && !formulaExpressionSource.startsWith('licensed_engineer_entry')) {
    issues.push({
      field: 'formula_expression_source',
      message: 'API-controlled formula source must be a controlled placeholder or licensed engineer entry reference; no copied standard text is allowed.',
      severity: 'error'
    });
  }

  if (isApiControlledFormula(formulaType)) {
    const expressionBody = asString(payload.expression_body);
    if (expressionBody && expressionBody !== 'CONTROLLED_PLACEHOLDER_REQUIRES_LICENSED_ENGINEER_ENTRY') {
      issues.push({
        field: 'expression_body',
        message: 'API-controlled formulas must use a controlled placeholder unless entered manually by an authorized engineer from a licensed standard.',
        severity: 'error'
      });
    }
  }

  return issues;
}

export function buildControlledPlaceholder(): string {
  return 'CONTROLLED_PLACEHOLDER_REQUIRES_LICENSED_ENGINEER_ENTRY';
}
