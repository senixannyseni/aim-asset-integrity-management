'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type AssetOption = {
  asset_id: string;
  tank_tag: string;
  asset_name: string;
};

type FfsCase = {
  id: string;
  case_id: string;
  asset_id: string;
  component: string;
  damage_mechanism: string;
  trigger_source: string;
  trigger_reason: string;
  trigger_rule_id: string;
  severity: string;
  evidence_links: unknown[];
  trigger_measurements: unknown[];
  required_next_action: string;
  status: string;
  due_date: string;
  final_disposition?: string | null;
};

const manualDefault = JSON.stringify(
  {
    component: 'shell',
    damage_mechanism: 'local_thin_area',
    trigger_source: 'manual_finding',
    trigger_rule_id: 'FFS-TRIG-LOCAL-THIN-AREA',
    trigger_reason: 'Manual finding indicates local thin area requiring FFS trigger review.',
    severity: 'blocking',
    supporting_measurements: [
      {
        measurement_id: 'manual-finding-001',
        component: 'shell',
        note: 'Supporting measurement/evidence reference entered by engineer.'
      }
    ],
    evidence_links: [],
    required_next_action: 'Engineer review required. FFS trigger does not declare fitness for service.'
  },
  null,
  2
);

function renderJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function FfsWorkflowClient() {
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [assetId, setAssetId] = useState('');
  const [cases, setCases] = useState<FfsCase[]>([]);
  const [manualText, setManualText] = useState(manualDefault);
  const [calculationRunId, setCalculationRunId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<FfsCase | null>(null);

  async function loadAssets() {
    const response = await apiFetch('/api/v1/assets', { cache: 'no-store' });
    const payload = await response.json();
    if (response.ok) {
      const rows = (payload.data ?? []) as AssetOption[];
      setAssets(rows);
      if (!assetId && rows[0]?.asset_id) setAssetId(rows[0].asset_id);
    }
  }

  async function loadCases() {
    const path = assetId ? `/api/v1/ffs/cases?asset_id=${encodeURIComponent(assetId)}` : '/api/v1/ffs/cases';
    const response = await apiFetch(path, { cache: 'no-store' });
    const payload = await response.json();
    if (response.ok) {
      setCases((payload.data ?? []) as FfsCase[]);
    }
  }

  useEffect(() => {
    void loadAssets();
  }, []);

  useEffect(() => {
    void loadCases();
  }, [assetId]);

  async function createManualCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    let payload: Record<string, unknown>;
    try {
      const parsed = JSON.parse(manualText) as unknown;
      payload = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      setMessage('Manual FFS case payload must be valid JSON.');
      return;
    }
    const response = await apiFetch('/api/v1/ffs/cases', {
      method: 'POST',
      body: JSON.stringify({ ...payload, asset_id: assetId })
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result?.error?.message ?? 'Manual FFS case create failed.');
      return;
    }
    setMessage(`FFS case ${result.data.case_id} created for engineer review.`);
    setSelected(result.data as FfsCase);
    await loadCases();
  }

  async function triggerFromCalculation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const response = await apiFetch('/api/v1/ffs/cases/from-calculation', {
      method: 'POST',
      body: JSON.stringify({ calculation_run_id: calculationRunId })
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result?.error?.message ?? 'FFS calculation trigger failed.');
      return;
    }
    setMessage(`${(result.data ?? []).length} FFS case(s) created from calculation warnings.`);
    await loadCases();
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Sprint 7</p>
          <h1>FFS Trigger Workflow</h1>
          <p>API 579-1/ASME FFS-1 governance trigger workflow. Trigger cases require engineer review, RC4-S detail-level FFS Disposition Readiness, and never auto-declare fitness.</p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/calculations">Calculations</Link>
          <Link className="secondary-button" href="/evidence">Evidence</Link>
          <Link className="secondary-button" href="/ndt">NDT</Link>
          <Link className="secondary-button" href="/reports">Reports</Link>
        </div>
      </header>

      <section className="grid-two">
        <section className="panel">
          <div className="panel-heading">
            <h2>Create FFS Trigger Case</h2>
            <p>Manual finding route. This creates a review case only; it does not make a final FFS decision.</p>
          </div>
          <form onSubmit={createManualCase}>
            <label>
              <span>Asset</span>
              <select value={assetId} onChange={(event) => setAssetId(event.target.value)} required>
                {assets.map((asset) => (
                  <option key={asset.asset_id} value={asset.asset_id}>{asset.tank_tag} — {asset.asset_name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Manual FFS case JSON</span>
              <textarea value={manualText} onChange={(event) => setManualText(event.target.value)} rows={16} />
            </label>
            <button className="primary-button" type="submit" disabled={!assetId}>Create Manual FFS Case</button>
          </form>

          <form onSubmit={triggerFromCalculation} className="stacked-form">
            <h3>Create from Calculation Warning</h3>
            <p>Use a calculation run UUID or run_id that contains FFS trigger candidate warnings.</p>
            <label>
              <span>Calculation Run ID</span>
              <input value={calculationRunId} onChange={(event) => setCalculationRunId(event.target.value)} placeholder="CALC-... or UUID" required />
            </label>
            <button className="secondary-button" type="submit">Create FFS Case(s) from Calculation</button>
          </form>
          {message && <div className="notice">{message}</div>}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>FFS Cases</h2>
            <p>Review trigger reason, supporting measurements, evidence, and required next action.</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Status</th>
                  <th>Severity</th>
                  <th>Damage Mechanism</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cases.length === 0 ? (
                  <tr><td colSpan={5}>No FFS cases found.</td></tr>
                ) : cases.map((item) => (
                  <tr key={item.id}>
                    <td>{item.case_id}</td>
                    <td><span className="badge">{item.status}</span></td>
                    <td>{item.severity}</td>
                    <td>{item.damage_mechanism}</td>
                    <td>
                      <div className="action-row">
                        <button className="secondary-button" type="button" onClick={() => setSelected(item)}>View</button>
                        <Link className="secondary-button" href={`/ffs/${item.id}`}>Detail</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selected && (
            <div className="detail-card">
              <h3>{selected.case_id}</h3>
              <Link className="secondary-button" href={`/ffs/${selected.id}`}>Open FFS Disposition Readiness</Link>
              <p><strong>Trigger:</strong> {selected.trigger_reason}</p>
              <p><strong>Next action:</strong> {selected.required_next_action}</p>
              <p><strong>Due:</strong> {selected.due_date}</p>
              <h4>Supporting measurements</h4>
              <textarea readOnly value={renderJson(selected.trigger_measurements)} rows={6} />
              <h4>Evidence links</h4>
              <textarea readOnly value={renderJson(selected.evidence_links)} rows={6} />
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
