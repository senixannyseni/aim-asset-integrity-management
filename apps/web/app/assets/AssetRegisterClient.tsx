'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type AssetRecord = {
  asset_id: string;
  tank_tag: string;
  asset_name: string;
  facility: string;
  location: string;
  service_fluid: string;
  tank_type: string;
  construction_year: number;
  original_design_code: string;
  current_assessment_code: string;
  code_edition: string;
  owner: string;
  operating_status: string;
  inspection_due_date: string;
  record_status: string;
};

type ValidationIssue = { field: string; message: string; severity: string };

const API_BASE = process.env.NEXT_PUBLIC_AIM_API_BASE_URL ?? 'http://localhost:4000';
const DEMO_HEADERS = {
  'Content-Type': 'application/json',
  'x-aim-demo-roles': 'admin',
  'x-aim-demo-email': 'admin@aim.local'
};

const formPlaceholders = {
  tank_tag: 'ex. TK-101',
  asset_name: 'ex. Crude Oil Storage Tank 101',
  facility: 'ex. Tank Farm A',
  location: 'ex. Area A',
  service_fluid: 'ex. Water / Diesel / Crude Oil',
  tank_type: 'aboveground_storage_tank',
  construction_year: 'ex. 2015',
  original_design_code: 'ex. API 650',
  current_assessment_code: 'ex. API 653',
  code_edition: 'ex. API 650 12th Ed. / API 653 5th Ed.',
  owner: 'ex. Operations',
  operating_status: 'in_service',
  inspection_due_date: ''
};

function fieldValue(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value : '';
}

export default function AssetRegisterClient() {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationIssue[]>([]);

  const filteredAssets = useMemo(() => assets, [assets]);

  async function loadAssets(query = '') {
    setLoading(true);
    setMessage(null);
    const url = new URL('/api/v1/assets', API_BASE);
    if (query) url.searchParams.set('search', query);
    const response = await fetch(url, { headers: DEMO_HEADERS, cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload?.error?.message ?? 'Failed to load assets.');
      setLoading(false);
      return;
    }
    setAssets(payload.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void loadAssets();
  }, []);

  async function createAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setErrors([]);

    const form = event.currentTarget;
    const payload = {
      tank_tag: fieldValue(form, 'tank_tag'),
      asset_name: fieldValue(form, 'asset_name'),
      facility: fieldValue(form, 'facility'),
      location: fieldValue(form, 'location'),
      service_fluid: fieldValue(form, 'service_fluid'),
      tank_type: fieldValue(form, 'tank_type'),
      construction_year: Number(fieldValue(form, 'construction_year')),
      original_design_code: fieldValue(form, 'original_design_code'),
      current_assessment_code: fieldValue(form, 'current_assessment_code'),
      code_edition: fieldValue(form, 'code_edition'),
      owner: fieldValue(form, 'owner'),
      operating_status: fieldValue(form, 'operating_status'),
      inspection_due_date: fieldValue(form, 'inspection_due_date')
    };

    const response = await fetch(`${API_BASE}/api/v1/assets`, {
      method: 'POST',
      headers: DEMO_HEADERS,
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessage(result?.error?.message ?? 'Asset create failed.');
      setErrors(result?.error?.details ?? []);
      return;
    }

    setMessage(`Tank asset ${result.data.tank_tag} created. Audit log: ${result.auditLogId ?? 'created'}`);
    form.reset();
    await loadAssets(search);
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Sprint 2</p>
          <h1>Tank Asset Register</h1>
          <p>Engineering master data for aboveground storage tanks. No calculation logic is implemented in this module.</p>
        </div>
        <Link className="secondary-button" href="/">Foundation Home</Link>
      </header>

      <section className="grid-two">
        <form className="panel form-grid" onSubmit={createAsset}>
          <div className="panel-heading">
            <h2>Create Tank Asset</h2>
            <p>Required engineering fields are explicit. Code edition is mandatory.</p>
          </div>

          {Object.entries(formPlaceholders).map(([key, placeholder]) => (
            <label key={key}>
              <span>{key.replaceAll('_', ' ')}</span>

              {key === 'operating_status' ? (
                <select name={key} defaultValue="in_service" required>
                  <option value="in_service">in_service</option>
                  <option value="out_of_service">out_of_service</option>
                  <option value="mothballed">mothballed</option>
                  <option value="retired">retired</option>
                </select>
              ) : (
                <input
                  name={key}
                  placeholder={placeholder}
                  type={
                    key === 'inspection_due_date'
                     ? 'date'
                     : key === 'construction_year'
                       ? 'number'
                       : 'text'
                }
                required
                />
              )}
            </label>
          ))}

          <button className="primary-button" disabled={saving} type="submit">
            {saving ? 'Saving...' : 'Create Tank Asset'}
          </button>
        </form>

        <section className="panel">
          <div className="panel-heading row-between">
            <div>
              <h2>Asset List</h2>
              <p>Open an asset to enter geometry and shell course master data.</p>
            </div>
            <div className="search-row">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tag/name/facility" />
              <button className="secondary-button" type="button" onClick={() => void loadAssets(search)}>Search</button>
            </div>
          </div>

          {message && <div className="notice">{message}</div>}
          {errors && errors.length > 0 && (
            <div className="error-list">
              {errors.map((error) => (
                <p key={`${error.field}-${error.message}`}><strong>{error.field}</strong>: {error.message}</p>
              ))}
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tank Tag</th>
                  <th>Name</th>
                  <th>Facility</th>
                  <th>Code / Edition</th>
                  <th>Status</th>
                  <th>Inspection Due</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6}>Loading assets...</td></tr>
                ) : filteredAssets.length === 0 ? (
                  <tr><td colSpan={6}>No tank assets found.</td></tr>
                ) : (
                  filteredAssets.map((asset) => (
                    <tr key={asset.asset_id}>
                      <td><Link href={`/assets/${asset.asset_id}`}>{asset.tank_tag}</Link></td>
                      <td>{asset.asset_name}</td>
                      <td>{asset.facility}</td>
                      <td>{asset.original_design_code} / {asset.code_edition}</td>
                      <td><span className="badge">{asset.operating_status}</span></td>
                      <td>{asset.inspection_due_date?.slice(0, 10)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
