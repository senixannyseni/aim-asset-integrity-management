'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type FormulaRecord = {
  record_id: string;
  formula_id: string;
  formula_name: string;
  code_basis: string;
  code_edition: string;
  clause_reference: string;
  formula_type: string;
  expression_type: string;
  expression_body?: string | null;
  status: string;
  version: string;
  locked_flag: boolean;
  production_usable: boolean;
  sync_status?: string | null;
  executable_formula_version_id?: string | null;
  executable_formula_status?: string | null;
  last_synced_at?: string | null;
};

type ValidationIssue = { field: string; message: string; severity: string };

function formValue(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value : '';
}

function safeJson(value: string, fallback: unknown): unknown {
  try {
    return value.trim() ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export default function FormulaRegistryClient() {
  const [formulas, setFormulas] = useState<FormulaRecord[]>([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const filtered = useMemo(() => formulas, [formulas]);

  async function loadFormulas(query = '') {
    setLoading(true);
    const path = query ? `/api/v1/formulas?search=${encodeURIComponent(query)}` : '/api/v1/formulas';
    const response = await apiFetch(path, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload?.error?.message ?? 'Failed to load formulas.');
      setLoading(false);
      return;
    }
    setFormulas(payload.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void loadFormulas();
  }, []);

  async function createFormula(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrors([]);
    const form = event.currentTarget;
    const formulaType = formValue(form, 'formula_type');
    const payload = {
      formula_id: formValue(form, 'formula_id'),
      formula_name: formValue(form, 'formula_name'),
      code_basis: formValue(form, 'code_basis'),
      code_edition: formValue(form, 'code_edition'),
      clause_reference: formValue(form, 'clause_reference'),
      component: formValue(form, 'component'),
      damage_mechanism: formValue(form, 'damage_mechanism'),
      formula_type: formulaType,
      expression_type: formValue(form, 'expression_type'),
      formula_expression_source: formulaType === 'api_controlled' ? 'licensed_engineer_entry_required' : 'engineer_entered_or_fixture',
      expression_body: formulaType === 'api_controlled' ? 'LICENSED_ENGINEER_ENTRY_REQUIRED' : formValue(form, 'expression_body'),
      input_schema: safeJson(formValue(form, 'input_schema'), {}),
      output_schema: safeJson(formValue(form, 'output_schema'), {}),
      unit_rules: safeJson(formValue(form, 'unit_rules'), {}),
      validation_rules: safeJson(formValue(form, 'validation_rules'), {}),
      blocking_rules: safeJson(formValue(form, 'blocking_rules'), []),
      test_case_reference: formValue(form, 'test_case_reference'),
      status: 'draft',
      version: formValue(form, 'version') || '0.1.0',
      effective_date: formValue(form, 'effective_date')
    };

    const response = await apiFetch('/api/v1/formulas', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result?.error?.message ?? 'Formula create failed.');
      setErrors(result?.error?.details ?? []);
      return;
    }
    setMessage(`Formula ${result.data.formula_id} version ${result.data.version} created.`);
    form.reset();
    await loadFormulas(search);
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Sprint 5</p>
          <h1>Formula Registry</h1>
          <p>RC4-F controlled formula metadata, versioning, approval, executable sync status, and guardrail test governance. No engineering formula is executed here.</p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/validation">Validation</Link>
          <Link className="secondary-button" href="/">Home</Link>
        </div>
      </header>

      <section className="grid-two">
        <form className="panel form-grid" onSubmit={createFormula}>
          <div className="panel-heading">
            <h2>Create Controlled Formula</h2>
            <p>API-controlled expressions must remain guardrails until entered by an authorized engineer from a licensed standard.</p>
          </div>
          <label><span>Formula ID</span><input name="formula_id" required /></label>
          <label><span>Formula Name</span><input name="formula_name" required /></label>
          <label><span>Code Basis</span><input name="code_basis" required /></label>
          <label><span>Code Edition</span><input name="code_edition" required /></label>
          <label><span>Clause Reference</span><input name="clause_reference" required /></label>
          <label><span>Component</span><input name="component" /></label>
          <label><span>Damage Mechanism</span><input name="damage_mechanism" /></label>
          <label>
            <span>Formula Type</span>
            <select name="formula_type" defaultValue="api_controlled">
              <option value="universal_deterministic">universal_deterministic</option>
              <option value="api_controlled">api_controlled</option>
              <option value="rbi_rule">rbi_rule</option>
              <option value="ffs_trigger">ffs_trigger</option>
              <option value="report_phrase_rule">report_phrase_rule</option>
            </select>
          </label>
          <label>
            <span>Expression Type</span>
            <select name="expression_type" defaultValue="controlled_guardrail">
              <option value="controlled_guardrail">controlled_guardrail</option>
              <option value="engineer_entered">engineer_entered</option>
              <option value="json_logic">json_logic</option>
              <option value="text_rule">text_rule</option>
              <option value="none">none</option>
            </select>
          </label>
          <label><span>Version</span><input name="version" defaultValue="0.1.0" required /></label>
          <label><span>Effective Date</span><input name="effective_date" type="date" /></label>
          <label className="panel-heading"><span>Expression Body</span><input name="expression_body" /></label>
          <label><span>Input Schema JSON</span><textarea name="input_schema" defaultValue={'{"thickness_mm":"number"}'} /></label>
          <label><span>Output Schema JSON</span><textarea name="output_schema" defaultValue={'{"status":"string"}'} /></label>
          <label><span>Unit Rules JSON</span><textarea name="unit_rules" defaultValue={'{"thickness":"mm"}'} /></label>
          <label><span>Validation Rules JSON</span><textarea name="validation_rules" defaultValue={'{"requires_approved_formula":true}'} /></label>
          <label><span>Blocking Rules JSON</span><textarea name="blocking_rules" defaultValue={'["draft formulas cannot be used in production calculation"]'} /></label>
          <label><span>Test Case Reference</span><input name="test_case_reference" /></label>
          <button className="primary-button" type="submit">Create Draft Formula</button>
        </form>

        <section className="panel">
          <div className="panel-heading row-between">
            <div>
              <h2>Formula Versions</h2>
              <p>Approved or locked registry records must be synchronized to executable formula_versions before calculation services can use them.</p>
            </div>
            <div className="search-row">
              <input value={search} onChange={(event) => setSearch(event.target.value)} />
              <button className="secondary-button" type="button" onClick={() => void loadFormulas(search)}>Search</button>
            </div>
          </div>
          {message && <div className="notice">{message}</div>}
          {errors.length > 0 && <div className="error-list">{errors.map((error) => <p key={`${error.field}-${error.message}`}><strong>{error.field}</strong>: {error.message}</p>)}</div>}
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Formula</th><th>Version</th><th>Type</th><th>Registry Status</th><th>Executable Sync</th><th>Action</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6}>Loading formulas...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6}>No formulas found.</td></tr>
                ) : filtered.map((formula) => (
                  <tr key={formula.record_id}>
                    <td><strong>{formula.formula_id}</strong><br />{formula.formula_name}</td>
                    <td>{formula.version}</td>
                    <td>{formula.formula_type}</td>
                    <td><span className="badge">{formula.status}</span></td>
                    <td><span className="badge">{formula.sync_status ?? (formula.production_usable ? 'approved_not_synchronized' : 'not_executable')}</span><br />{formula.executable_formula_version_id ? <span className="muted-text">{formula.executable_formula_version_id}</span> : <span className="muted-text">No executable formula_version</span>}</td>
                    <td><Link href={`/formulas/${encodeURIComponent(formula.formula_id)}`}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
