import { describe, expect, it } from 'vitest';
import { hasPermission } from '../src/rbac/roles.js';
import {
  buildControlledPlaceholder,
  isFormulaUsableInProduction,
  nextFormulaVersion,
  validateFormulaPayload
} from '../src/modules/formula-registry/validation.js';

describe('Formula Registry governance', () => {
  const basePayload = {
    formula_id: 'FORMULA-001',
    formula_name: 'Controlled Formula',
    code_basis: 'API 653 / Engineering Basis',
    code_edition: 'User-supplied licensed edition',
    clause_reference: 'Manual reference only',
    formula_type: 'api_controlled',
    expression_type: 'controlled_placeholder',
    formula_expression_source: 'controlled_placeholder_manual_entry',
    expression_body: buildControlledPlaceholder(),
    input_schema: { thickness_mm: 'number' },
    output_schema: { status: 'string' },
    unit_rules: { thickness: 'mm' },
    validation_rules: { requires_approval: true },
    blocking_rules: ['draft formulas cannot be used in production calculation']
  };

  it('requires complete controlled formula metadata', () => {
    const issues = validateFormulaPayload({ formula_id: 'INCOMPLETE' }, 'create');
    expect(issues.map((issue) => issue.field)).toContain('formula_name');
    expect(issues.map((issue) => issue.field)).toContain('code_edition');
    expect(issues.map((issue) => issue.field)).toContain('input_schema');
  });

  it('requires formula_expression_source for create payloads', () => {
    const issues = validateFormulaPayload({ ...basePayload, formula_expression_source: undefined }, 'create');
    expect(issues.map((issue) => issue.field)).toContain('formula_expression_source');
  });

  it('blocks unauthorized API-controlled formula source labels', () => {
    const issues = validateFormulaPayload({ ...basePayload, formula_expression_source: 'copied_standard_clause' }, 'create');
    expect(issues.map((issue) => issue.field)).toContain('formula_expression_source');
  });

  it('does not grant Formula Registry approval permissions to qa_qc after policy alignment', () => {
    expect(hasPermission(['qa_qc'], 'formula.approve')).toBe(false);
    expect(hasPermission(['qa_qc'], 'formula.retire')).toBe(false);
    expect(hasPermission(['qa_qc'], 'formula.read')).toBe(true);
  });

  it('blocks API controlled formulas that include non-placeholder expression bodies', () => {
    const issues = validateFormulaPayload({ ...basePayload, expression_body: 'copied or invented API formula' }, 'create');
    expect(issues.map((issue) => issue.field)).toContain('expression_body');
  });

  it('allows controlled placeholder for API controlled formulas', () => {
    const issues = validateFormulaPayload(basePayload, 'create');
    expect(issues).toHaveLength(0);
  });

  it('prevents draft and deprecated formulas from production use', () => {
    expect(isFormulaUsableInProduction({ status: 'draft' })).toBe(false);
    expect(isFormulaUsableInProduction({ status: 'under_review' })).toBe(false);
    expect(isFormulaUsableInProduction({ status: 'deprecated' })).toBe(false);
    expect(isFormulaUsableInProduction({ status: 'approved' })).toBe(true);
    expect(isFormulaUsableInProduction({ status: 'locked' })).toBe(true);
  });

  it('calculates deterministic next patch version when possible', () => {
    expect(nextFormulaVersion('1.2.3')).toBe('1.2.4');
  });

  it('does not grant Formula Registry write or approval permissions to ai_agent', () => {
    expect(hasPermission(['ai_agent'], 'formula.create')).toBe(false);
    expect(hasPermission(['ai_agent'], 'formula.update')).toBe(false);
    expect(hasPermission(['ai_agent'], 'formula.approve')).toBe(false);
    expect(hasPermission(['ai_agent'], 'formula.retire')).toBe(false);
  });
});
