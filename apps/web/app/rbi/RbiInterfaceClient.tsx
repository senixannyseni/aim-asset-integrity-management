'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type RbiCase = {
  id: string;
  case_id: string;
  asset_id: string;
  system: string;
  component: string;
  damage_mechanism: string;
  probability_driver: string;
  consequence_driver: string;
  risk_category: string;
  recommended_interval: string;
  inspection_plan_reference: string;
  status: string;
  calculation_basis: string;
  calculation_basis_note: string;
  trigger_reason: string;
};

type ValidationIssue = { field: string; message: string; severity: string };

const defaultPayload = {
  asset_id: '',
  system: 'tank_integrity',
  component: 'shell',
  damage_mechanism: 'corrosion_screening',
  probability_driver: 'engineering_review_placeholder',
  consequence_driver: 'consequence_placeholder_required',
  risk_category: 'screening_required',
  recommended_interval: 'engineer_review_required',
  inspection_plan_reference: 'not_assigned',
  trigger_source: 'engineering_review',
  trigger_reason: 'Manual RBI interface case created from engineering review. Quantitative API RP 581 rules are not implemented.',
  input_placeholders: {
    consequence_of_failure: 'placeholder_required',
    probability_of_failure: 'placeholder_required',
    damage_mechanism: 'corrosion_screening',
    inspection_effectiveness: 'placeholder_required',
    fluid_service: 'placeholder_required',
    inventory: 'placeholder_required',
    operating_severity: 'placeholder_required',
    mitigation_controls: 'placeholder_required'
  },
  evidence_links: []
};

function renderJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function RbiInterfaceClient() {
  const [cases, setCases] = useState<RbiCase[]>([]);
  const [payloadText, setPayloadText] = useState(renderJson(defaultPayload));
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationIssue[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadCases() {
    const response = await apiFetch('/api/v1/rbi/cases', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload?.error?.message ?? 'Failed to load RBI cases.');
      return;
    }
    setCases(payload.data ?? []);
  }

  useEffect(() => {
    void loadCases();
  }, []);

  async function createCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrors([]);
    let payload: unknown;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      setLoading(false);
      setErrors([{ field: 'payload', message: 'Payload must be valid JSON.', severity: 'error' }]);
      return;
    }
    const response = await apiFetch('/api/v1/rbi/cases', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(result?.error?.message ?? 'RBI case creation failed.');
      setErrors(result?.error?.details ?? []);
      return;
    }
    setMessage(`RBI case ${result.data.case_id} created. Audit log: ${result.auditLogId ?? 'created'}`);
    await loadCases();
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Sprint 8</p>
          <h1>RBI Interface</h1>
          <p>API RP 580/581 governance-aligned interface. Quantitative API RP 581 rules are placeholders unless provided through Formula Registry.</p>
        </div>
        <Link className="secondary-button" href="/">Foundation Home</Link>
      </header>

      <section className="grid-two">
        <form className="panel" onSubmit={createCase}>
          <div className="panel-heading">
            <h2>Create RBI Case</h2>
            <p>Manual engineering-review case. Use calculation trigger endpoint when creating from high corrosion rate or short remaining life warnings.</p>
          </div>
          <label>
            <span>RBI Payload JSON</span>
            <textarea rows={22} value={payloadText} onChange={(event) => setPayloadText(event.target.value)} />
          </label>
          <button className="primary-button" disabled={loading} type="submit">{loading ? 'Saving...' : 'Create RBI Case'}</button>
          {message && <div className="notice">{message}</div>}
          {errors.length > 0 && (
            <div className="error-list">
              {errors.map((error) => <p key={`${error.field}-${error.message}`}><strong>{error.field}</strong>: {error.message}</p>)}
            </div>
          )}
        </form>

        <section className="panel">
          <div className="panel-heading">
            <h2>Risk Matrix Placeholder</h2>
            <p>Qualitative/semi-quantitative placeholder only. No proprietary API RP 581 quantitative calculation is implemented.</p>
          </div>
          <div className="stat-row">
            <div className="stat-card"><strong>{cases.length}</strong><span>RBI cases</span></div>
            <div className="stat-card"><strong>{cases.filter((item) => item.status === 'approved').length}</strong><span>Approved</span></div>
            <div className="stat-card"><strong>{cases.filter((item) => item.risk_category?.includes('high')).length}</strong><span>High category</span></div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Component</th>
                  <th>Damage Mechanism</th>
                  <th>Risk</th>
                  <th>Recommended Interval</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {cases.length === 0 ? (
                  <tr><td colSpan={6}>No RBI cases yet.</td></tr>
                ) : cases.map((item) => (
                  <tr key={item.id}>
                    <td>{item.case_id}</td>
                    <td>{item.component}</td>
                    <td>{item.damage_mechanism}</td>
                    <td><span className="badge">{item.risk_category}</span></td>
                    <td>{item.recommended_interval}</td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="notice">
            Inspection plan recommendations are interface placeholders until engineer review and approved Formula Registry rules are available.
          </div>
        </section>
      </section>
    </main>
  );
}
