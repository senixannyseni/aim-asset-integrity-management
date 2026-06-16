'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type AssetOption = {
  asset_id: string;
  tank_tag: string;
  asset_name: string;
};

type CalculationResponse = {
  run_id: string;
  run_status: string;
  validation_status: string;
  formula_set_version: string;
  input_snapshot_hash: string;
  output_summary: Record<string, unknown>;
  calculation: {
    validation_status: string;
    validation_result: {
      blocking_count: number;
      warning_count: number;
      info_count: number;
      issues: Array<Record<string, unknown>>;
    };
    corrosion_rates: Array<Record<string, unknown>>;
    remaining_life: Array<Record<string, unknown>>;
    warnings: Array<Record<string, unknown>>;
  };
};

const defaultPayload = JSON.stringify(
  {
    calculation_scope: 'thickness_screening',
    formula_id: 'AIM-UNIVERSAL-THICKNESS-CORROSION-ENGINE',
    calculation_request: {
      thickness_check_requested: true,
      retirement_thickness_mm: 8,
      ffs_trigger_evaluation_requested: true,
      rbi_trigger_evaluation_requested: true
    },
    thresholds: {
      high_corrosion_rate_mm_per_year: 0.5,
      low_remaining_life_years: 5
    }
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

export default function CalculationEngineClient() {
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [assetId, setAssetId] = useState('');
  const [payloadText, setPayloadText] = useState(defaultPayload);
  const [result, setResult] = useState<CalculationResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadAssets() {
      const response = await apiFetch('/api/v1/assets', { cache: 'no-store' });
      const payload = await response.json();
      if (response.ok) {
        const rows = (payload.data ?? []) as AssetOption[];
        setAssets(rows);
        if (rows[0]?.asset_id) setAssetId(rows[0].asset_id);
      }
    }
    void loadAssets();
  }, []);

  async function runCalculation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setResult(null);

    let payload: Record<string, unknown>;
    try {
      const parsed = JSON.parse(payloadText) as unknown;
      payload = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      setMessage('Calculation payload must be valid JSON.');
      setSaving(false);
      return;
    }

    const response = await apiFetch('/api/v1/engineering/calculate', {
      method: 'POST',
      body: JSON.stringify({ ...payload, asset_id: assetId })
    });
    const apiResult = await response.json();
    setSaving(false);

    if (!response.ok && response.status !== 422) {
      setMessage(apiResult?.error?.message ?? 'Calculation failed.');
      return;
    }

    setResult(apiResult.data);
    setMessage(response.status === 422 ? 'Calculation blocked by validation result. Run snapshot was stored.' : 'Calculation completed and stored.');
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Sprint 6</p>
          <h1>Deterministic Calculation Engine</h1>
          <p>Universal deterministic calculations for unit conversion, corrosion rate, remaining life screening, warnings, and traceable calculation runs.</p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/validation">Validation</Link>
          <Link className="secondary-button" href="/formulas">Formula Registry</Link>
          <Link className="secondary-button" href="/ndt">NDT</Link>
        </div>
      </header>

      <section className="grid-two">
        <form className="panel" onSubmit={runCalculation}>
          <div className="panel-heading">
            <h2>Run Calculation</h2>
            <p>Calculation is blocked when deterministic validation returns blocking severity. API/API-ASME formulas are not hard-coded.</p>
          </div>
          <label>
            <span>Asset</span>
            <select value={assetId} onChange={(event) => setAssetId(event.target.value)} required>
              {assets.map((asset) => (
                <option key={asset.asset_id} value={asset.asset_id}>{asset.tank_tag} — {asset.asset_name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Calculation payload JSON</span>
            <textarea value={payloadText} onChange={(event) => setPayloadText(event.target.value)} rows={18} />
          </label>
          <button className="primary-button" type="submit" disabled={saving || !assetId}>{saving ? 'Running...' : 'Run Deterministic Calculation'}</button>
          {message && <div className="notice">{message}</div>}
        </form>

        <section className="panel">
          <div className="panel-heading">
            <h2>Calculation Result</h2>
            <p>Stored output is traceable to formula version and input snapshot hash.</p>
          </div>
          {!result ? (
            <p>No calculation run yet.</p>
          ) : (
            <>
              <div className="cards compact-cards">
                <article><h2>{result.calculation.corrosion_rates.length}</h2><p>Corrosion Rates</p></article>
                <article><h2>{result.calculation.remaining_life.length}</h2><p>Remaining Life Rows</p></article>
                <article><h2>{result.calculation.warnings.length}</h2><p>Warnings</p></article>
              </div>
              <p><strong>Run:</strong> {result.run_id}</p>
              <p><strong>Status:</strong> {result.run_status}</p>
              <p><strong>Validation:</strong> {result.validation_status}</p>
              <p><strong>Formula set:</strong> {result.formula_set_version}</p>
              <p><strong>Input hash:</strong> <code>{result.input_snapshot_hash}</code></p>
              <h3>Output Summary</h3>
              <textarea readOnly value={renderJson(result.output_summary)} rows={8} />
              <h3>Warnings</h3>
              <textarea readOnly value={renderJson(result.calculation.warnings)} rows={10} />
            </>
          )}
        </section>
      </section>
    </main>
  );
}
