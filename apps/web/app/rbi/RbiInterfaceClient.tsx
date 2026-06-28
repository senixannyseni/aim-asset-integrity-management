'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type RbiCase = {
  id: string;
  case_id: string;
  asset_id: string;
  inspection_event_id?: string | null;
  calculation_run_id?: string | null;
  system: string;
  component: string;
  damage_mechanism: string;
  probability_driver: string;
  consequence_driver: string;
  risk_category: string;
  recommended_interval: string;
  inspection_plan_reference: string;
  evidence_links?: Array<Record<string, unknown>>;
  input_placeholders?: Record<string, unknown>;
  trigger_source: string;
  trigger_reason: string;
  trigger_rule_id: string;
  calculation_basis: string;
  calculation_basis_note: string;
  status: string;
};

type ValidationIssue = { field: string; message: string; severity: string };
type ApiErrorPayload = { error?: { code?: string; message?: string; details?: ValidationIssue[]; existing_case?: RbiCase } };
type CurrentUser = { permissions?: string[]; roles?: string[] };

const defaultGuidedValues = {
  asset_id: '',
  inspection_event_id: '',
  system: 'tank_integrity',
  component: 'shell',
  damage_mechanism: 'corrosion_screening',
  probability_driver: 'engineering_review_placeholder',
  consequence_driver: 'consequence_placeholder_required',
  risk_category: 'screening_required',
  recommended_interval: 'engineer_review_required',
  inspection_plan_reference: 'not_assigned',
  trigger_reason: 'Manual RBI interface case created from engineering review. Quantitative API RP 581 rules are not implemented.',
  evidence_file_id: ''
};

const riskBuckets = ['screening_required', 'medium', 'medium_high', 'high'];

function fieldValue(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function renderJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function normalizePayloadError(payload: ApiErrorPayload, fallback: string): { message: string; issues: ValidationIssue[] } {
  return {
    message: payload.error?.message ?? fallback,
    issues: payload.error?.details ?? []
  };
}

function permissionSet(user: CurrentUser | null): Set<string> {
  return new Set([...(user?.permissions ?? []), ...(user?.roles?.includes('admin') ? ['admin'] : [])]);
}

function hasPermission(user: CurrentUser | null, permission: string): boolean {
  const granted = permissionSet(user);
  return granted.has('admin') || granted.has(permission);
}

function buildGuidedPayload(form: HTMLFormElement): Record<string, unknown> {
  const evidenceFileId = fieldValue(form, 'evidence_file_id');
  return {
    asset_id: fieldValue(form, 'asset_id'),
    inspection_event_id: fieldValue(form, 'inspection_event_id') || undefined,
    system: fieldValue(form, 'system') || 'tank_integrity',
    component: fieldValue(form, 'component') || 'shell',
    damage_mechanism: fieldValue(form, 'damage_mechanism') || 'engineering_review_required',
    probability_driver: fieldValue(form, 'probability_driver') || 'engineering_review_placeholder',
    consequence_driver: fieldValue(form, 'consequence_driver') || 'consequence_placeholder_required',
    risk_category: fieldValue(form, 'risk_category') || 'screening_required',
    recommended_interval: fieldValue(form, 'recommended_interval') || 'engineer_review_required',
    inspection_plan_reference: fieldValue(form, 'inspection_plan_reference') || 'not_assigned',
    trigger_source: 'engineering_review',
    trigger_reason: fieldValue(form, 'trigger_reason') || defaultGuidedValues.trigger_reason,
    input_placeholders: {
      consequence_of_failure: 'placeholder_required',
      probability_of_failure: fieldValue(form, 'probability_driver') || 'engineering_review_placeholder',
      damage_mechanism: fieldValue(form, 'damage_mechanism') || 'engineering_review_required',
      inspection_effectiveness: 'placeholder_required',
      fluid_service: 'placeholder_required',
      inventory: 'placeholder_required',
      operating_severity: 'placeholder_required',
      mitigation_controls: 'placeholder_required',
      calculation_basis: 'qualitative_or_semi_quantitative_placeholder_only_no_api_581_rules'
    },
    evidence_links: evidenceFileId ? [{ evidence_file_id: evidenceFileId, source_entity_type: 'engineering_review' }] : []
  };
}

function validateGuidedPayload(payload: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const field of ['asset_id', 'component', 'damage_mechanism', 'risk_category', 'recommended_interval']) {
    if (!payload[field]) issues.push({ field, message: `${field} is required.`, severity: 'error' });
  }
  return issues;
}

function RiskMatrix({ cases }: { cases: RbiCase[] }) {
  const matrixRows = [
    { consequence: 'Consequence placeholder: high', label: 'High consequence placeholder' },
    { consequence: 'Consequence placeholder: medium', label: 'Medium consequence placeholder' },
    { consequence: 'Consequence placeholder: low', label: 'Low consequence placeholder' }
  ];

  return (
    <div className="risk-matrix" aria-label="Placeholder RBI risk matrix">
      <div className="risk-cell risk-axis">Consequence / Probability</div>
      {riskBuckets.map((bucket) => <div className="risk-cell risk-axis" key={bucket}>{bucket}</div>)}
      {matrixRows.map((row) => (
        <div className="risk-row-fragment" key={row.label}>
          <div className="risk-cell risk-axis">{row.label}</div>
          {riskBuckets.map((bucket) => {
            const bucketCases = cases.filter((item) => item.risk_category === bucket);
            return <div className="risk-cell" key={`${row.label}-${bucket}`}><strong>{bucketCases.length}</strong><span>case(s)</span></div>;
          })}
        </div>
      ))}
    </div>
  );
}

export default function RbiInterfaceClient() {
  const [cases, setCases] = useState<RbiCase[]>([]);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [calculationRunId, setCalculationRunId] = useState('');
  const [findingAssetId, setFindingAssetId] = useState('');
  const [findingId, setFindingId] = useState('');

  const canCreate = hasPermission(user, 'rbi.interface.create');
  const canRead = hasPermission(user, 'rbi.interface.read');

  const statusCounts = useMemo(() => cases.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {}), [cases]);

  async function loadUser() {
    try {
      const response = await apiFetch('/api/v1/auth/me', { cache: 'no-store' });
      const payload = await response.json();
      if (response.ok) setUser(payload?.data?.user ?? null);
    } catch {
      setUser(null);
    }
  }

  async function loadCases() {
    setListLoading(true);
    const response = await apiFetch('/api/v1/rbi/cases', { cache: 'no-store' });
    const payload = await response.json() as { data?: RbiCase[] } & ApiErrorPayload;
    setListLoading(false);
    if (!response.ok) {
      setMessage(payload?.error?.message ?? 'Failed to load RBI cases.');
      return;
    }
    setCases(payload.data ?? []);
  }

  useEffect(() => {
    void loadUser();
    void loadCases();
  }, []);

  async function createGuidedCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrors([]);
    const form = event.currentTarget;
    const payload = buildGuidedPayload(form);
    const validationIssues = validateGuidedPayload(payload);
    if (validationIssues.length > 0) {
      setLoading(false);
      setErrors(validationIssues);
      setMessage('Please complete the guided RBI fields before submitting.');
      return;
    }
    const response = await apiFetch('/api/v1/rbi/cases', { method: 'POST', body: JSON.stringify(payload) });
    const result = await response.json() as { data?: RbiCase; auditLogId?: string } & ApiErrorPayload;
    setLoading(false);
    if (!response.ok) {
      const error = normalizePayloadError(result, 'RBI case creation failed.');
      setMessage(error.message);
      setErrors(error.issues);
      return;
    }
    setMessage(`RBI case ${result.data?.case_id ?? ''} created. Audit log: ${result.auditLogId ?? 'created'}`);
    form.reset();
    await loadCases();
  }

  async function createFromCalculation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrors([]);
    const response = await apiFetch('/api/v1/rbi/cases/from-calculation', {
      method: 'POST',
      body: JSON.stringify({ calculation_run_id: calculationRunId, component: 'shell', damage_mechanism: 'corrosion_screening' })
    });
    const result = await response.json() as { data?: RbiCase; auditLogId?: string } & ApiErrorPayload;
    setLoading(false);
    if (!response.ok) {
      setMessage(result.error?.existing_case ? `${result.error.message} Existing case: ${result.error.existing_case.case_id}` : result.error?.message ?? 'Calculation-triggered RBI creation failed.');
      setErrors(result.error?.details ?? []);
      return;
    }
    setMessage(`RBI case ${result.data?.case_id ?? ''} created from calculation warnings.`);
    setCalculationRunId('');
    await loadCases();
  }

  async function createFromFindingHistory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrors([]);
    const response = await apiFetch('/api/v1/rbi/cases/from-finding-history', {
      method: 'POST',
      body: JSON.stringify({ asset_id: findingAssetId || undefined, finding_id: findingId || undefined, minimum_occurrences: 2 })
    });
    const result = await response.json() as { data?: RbiCase; auditLogId?: string } & ApiErrorPayload;
    setLoading(false);
    if (!response.ok) {
      setMessage(result.error?.existing_case ? `${result.error.message} Existing case: ${result.error.existing_case.case_id}` : result.error?.message ?? 'Finding-history RBI creation failed.');
      setErrors(result.error?.details ?? []);
      return;
    }
    setMessage(`RBI case ${result.data?.case_id ?? ''} created from repeated findings/anomaly history.`);
    setFindingAssetId('');
    setFindingId('');
    await loadCases();
  }

  const previewPayload = {
    ...defaultGuidedValues,
    trigger_source: 'engineering_review',
    input_placeholders: {
      consequence_of_failure: 'placeholder_required',
      probability_of_failure: defaultGuidedValues.probability_driver,
      damage_mechanism: defaultGuidedValues.damage_mechanism,
      inspection_effectiveness: 'placeholder_required',
      fluid_service: 'placeholder_required',
      inventory: 'placeholder_required',
      operating_severity: 'placeholder_required',
      mitigation_controls: 'placeholder_required',
      calculation_basis: 'qualitative_or_semi_quantitative_placeholder_only_no_api_581_rules'
    },
    evidence_links: []
  };

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC4-I</p>
          <h1>RBI Workflow</h1>
          <p>Guided API RP 580/581 interface workflow. Risk matrix and drivers remain placeholder/semi-quantitative unless approved Formula Registry rules are supplied.</p>
        </div>
        <Link className="secondary-button" href="/">Foundation Home</Link>
      </header>

      {message && <div className="notice">{message}</div>}
      {errors.length > 0 && <div className="error-list">{errors.map((error) => <p key={`${error.field}-${error.message}`}><strong>{error.field}</strong>: {error.message}</p>)}</div>}

      <section className="grid-two">
        <form className="panel form-grid" onSubmit={createGuidedCase}>
          <div className="panel-heading">
            <h2>Guided RBI Case Input</h2>
            <p>Replaces JSON-only entry with controlled fields. Backend RBAC, validation, evidence checks, and audit logs remain authoritative.</p>
          </div>
          <label><span>Asset ID</span><input name="asset_id" defaultValue={defaultGuidedValues.asset_id} required /></label>
          <label><span>Inspection Event ID</span><input name="inspection_event_id" defaultValue={defaultGuidedValues.inspection_event_id} /></label>
          <label><span>System</span><input name="system" defaultValue={defaultGuidedValues.system} /></label>
          <label><span>Component</span><input name="component" defaultValue={defaultGuidedValues.component} /></label>
          <label><span>Damage mechanism</span><input name="damage_mechanism" defaultValue={defaultGuidedValues.damage_mechanism} /></label>
          <label><span>Probability driver</span><input name="probability_driver" defaultValue={defaultGuidedValues.probability_driver} /></label>
          <label><span>Consequence driver</span><input name="consequence_driver" defaultValue={defaultGuidedValues.consequence_driver} /></label>
          <label><span>Risk category</span><select name="risk_category" defaultValue={defaultGuidedValues.risk_category}>{riskBuckets.map((bucket) => <option key={bucket} value={bucket}>{bucket}</option>)}</select></label>
          <label><span>Recommended interval</span><input name="recommended_interval" defaultValue={defaultGuidedValues.recommended_interval} /></label>
          <label><span>Inspection plan reference</span><input name="inspection_plan_reference" defaultValue={defaultGuidedValues.inspection_plan_reference} /></label>
          <label><span>Evidence file ID</span><input name="evidence_file_id" defaultValue={defaultGuidedValues.evidence_file_id} /></label>
          <label><span>Trigger reason</span><input name="trigger_reason" defaultValue={defaultGuidedValues.trigger_reason} /></label>
          <button className="primary-button" disabled={loading || !canCreate} type="submit">{loading ? 'Saving...' : 'Create guided RBI case'}</button>
          {!canCreate && <p className="error-list">Permission required: rbi.interface.create</p>}
        </form>

        <section className="panel">
          <div className="panel-heading">
            <h2>Risk Matrix Placeholder</h2>
            <p>Display-only, qualitative/semi-quantitative visualization. It does not implement API RP 581 quantitative probability or consequence formulas.</p>
          </div>
          <div className="stat-row">
            <div className="stat-card"><strong>{cases.length}</strong><span>Total cases</span></div>
            <div className="stat-card"><strong>{statusCounts.approved ?? 0}</strong><span>Approved</span></div>
            <div className="stat-card"><strong>{statusCounts.closed ?? 0}</strong><span>Closed</span></div>
          </div>
          <RiskMatrix cases={cases} />
          <div className="notice">Any production quantitative RBI rule must come from approved Formula Registry metadata and licensed engineering governance.</div>
        </section>
      </section>

      <section className="grid-two">
        <form className="panel" onSubmit={createFromCalculation}>
          <div className="panel-heading"><h2>Create from Calculation Warning</h2><p>Creates one RBI case from configured calculation warning codes and blocks duplicates for the same warning signature.</p></div>
          <label><span>Calculation run ID or run code</span><input value={calculationRunId} onChange={(event) => setCalculationRunId(event.target.value)} required /></label>
          <button className="primary-button" disabled={loading || !canCreate} type="submit">Create from calculation</button>
        </form>
        <form className="panel" onSubmit={createFromFindingHistory}>
          <div className="panel-heading"><h2>Create from Repeated Finding History</h2><p>Uses the RC4-H findings/anomaly module as the repeated-anomaly source. Requires at least two relevant active findings.</p></div>
          <label><span>Asset ID</span><input value={findingAssetId} onChange={(event) => setFindingAssetId(event.target.value)} /></label>
          <label><span>Seed finding ID/code</span><input value={findingId} onChange={(event) => setFindingId(event.target.value)} /></label>
          <button className="primary-button" disabled={loading || !canCreate || (!findingAssetId && !findingId)} type="submit">Create from findings history</button>
        </form>
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading"><h2>RBI Cases</h2><p>Open a case for review, status update, approval, export, close, evidence lineage, audit links, and source trigger context.</p></div>
        {!canRead ? <div className="error-list">Permission required: rbi.interface.read</div> : listLoading ? <p>Loading RBI cases...</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Case</th><th>Asset</th><th>Component</th><th>Damage Mechanism</th><th>Risk</th><th>Trigger</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {cases.length === 0 ? <tr><td colSpan={8}>No RBI cases yet.</td></tr> : cases.map((item) => (
                  <tr key={item.id}>
                    <td>{item.case_id}</td>
                    <td>{item.asset_id}</td>
                    <td>{item.component}</td>
                    <td>{item.damage_mechanism}</td>
                    <td><span className="badge">{item.risk_category}</span></td>
                    <td>{item.trigger_source}</td>
                    <td>{item.status}</td>
                    <td><Link href={`/rbi/${encodeURIComponent(item.case_id ?? item.id)}`}>Open detail</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading"><h2>Guided payload preview</h2><p>Reference shape only. Users submit through fields above; backend remains the source of truth.</p></div>
        <pre>{renderJson(previewPayload)}</pre>
      </section>
    </main>
  );
}
