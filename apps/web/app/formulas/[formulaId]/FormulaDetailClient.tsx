'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

function renderJson(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

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
  input_schema: unknown;
  output_schema: unknown;
  unit_rules: unknown;
  validation_rules: unknown;
  blocking_rules: unknown;
  status: string;
  version: string;
  locked_flag: boolean;
  production_usable: boolean;
  approval_date?: string | null;
  sync_status?: string | null;
  executable_formula_version_id?: string | null;
  executable_formula_status?: string | null;
  last_synced_at?: string | null;
};

export default function FormulaDetailClient({ formulaId }: { formulaId: string }) {
  const [versions, setVersions] = useState<FormulaRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [fromVersion, setFromVersion] = useState('');
  const [toVersion, setToVersion] = useState('');
  const [compareResult, setCompareResult] = useState<unknown>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selected = useMemo(() => versions.find((version) => version.record_id === selectedRecordId) ?? versions[0], [selectedRecordId, versions]);

  async function loadVersions() {
    const response = await apiFetch(`/api/v1/formulas/${encodeURIComponent(formulaId)}/versions`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload?.error?.message ?? 'Failed to load formula versions.');
      return;
    }
    setVersions(payload.data ?? []);
    if ((payload.data ?? []).length > 0) {
      setSelectedRecordId(payload.data[0].record_id);
      setFromVersion(payload.data[0].version);
      setToVersion(payload.data[0].version);
    }
  }

  useEffect(() => {
    void loadVersions();
  }, [formulaId]);

  async function postAction(path: string, success: string) {
    if (!selected) return;
    const response = await apiFetch(path, { method: 'POST', body: JSON.stringify({}) });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload?.error?.message ?? 'Action failed.');
      return;
    }
    setMessage(success);
    await loadVersions();
  }

  async function approve() {
    if (!selected) return;
    await postAction(`/api/v1/formulas/records/${selected.record_id}/approve`, 'Formula approved, locked, and synchronized to executable formula_versions.');
  }

  async function syncToExecutable() {
    if (!selected) return;
    await postAction(`/api/v1/formulas/records/${selected.record_id}/sync-to-executable`, 'Approved formula synchronized to executable formula_versions.');
  }

  async function deprecate() {
    if (!selected) return;
    await postAction(`/api/v1/formulas/records/${selected.record_id}/deprecate`, 'Formula deprecated.');
  }

  async function testRun() {
    if (!selected) return;
    await postAction(`/api/v1/formulas/records/${selected.record_id}/test-run`, 'Placeholder test run recorded. No expression was executed.');
  }

  async function compareVersions() {
    const response = await apiFetch(`/api/v1/formulas/${encodeURIComponent(formulaId)}/compare?from_version=${encodeURIComponent(fromVersion)}&to_version=${encodeURIComponent(toVersion)}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload?.error?.message ?? 'Compare failed.');
      return;
    }
    setCompareResult(payload.data);
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Formula Detail</p>
          <h1>{formulaId}</h1>
          <p>RC4-F version approval, executable formula_versions synchronization, deprecation, comparison, and placeholder test governance.</p>
        </div>
        <Link className="secondary-button" href="/formulas">Formula Registry</Link>
      </header>

      {message && <div className="notice">{message}</div>}

      <section className="grid-two">
        <section className="panel">
          <h2>Versions</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Version</th><th>Status</th><th>Type</th><th>Executable Sync</th><th>Select</th></tr></thead>
              <tbody>
                {versions.map((version) => (
                  <tr key={version.record_id}>
                    <td>{version.version}</td>
                    <td><span className="badge">{version.status}</span></td>
                    <td>{version.formula_type}</td>
                    <td><span className="badge">{version.sync_status ?? 'not_synchronized'}</span><br />{version.executable_formula_version_id ? <span className="muted-text">{version.executable_formula_version_id}</span> : <span className="muted-text">No executable version</span>}</td>
                    <td><button className="secondary-button" type="button" onClick={() => setSelectedRecordId(version.record_id)}>Select</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <h2>Selected Version</h2>
          {selected ? (
            <>
              <p><strong>{selected.formula_name}</strong></p>
              <p>Code basis: {selected.code_basis}</p>
              <p>Edition: {selected.code_edition}</p>
              <p>Clause reference: {selected.clause_reference}</p>
              <p>Expression type: {selected.expression_type}</p>
              <p>Expression body: {selected.expression_body ?? 'Not populated'}</p>
              <p>Registry production usability: {selected.production_usable ? 'approved/locked' : 'blocked'}</p>
              <p>Executable sync status: <span className="badge">{selected.sync_status ?? 'not_synchronized'}</span></p>
              <p>Executable formula_version_id: {selected.executable_formula_version_id ?? 'Not synchronized'}</p>
              <p>Last synced: {selected.last_synced_at ?? 'Not synchronized'}</p>
              <div className="action-row">
                <button className="primary-button" type="button" onClick={approve}>Approve</button>
                <button className="secondary-button" type="button" onClick={syncToExecutable}>Sync to Executable</button>
                <button className="secondary-button" type="button" onClick={deprecate}>Deprecate</button>
                <button className="secondary-button" type="button" onClick={testRun}>Run Placeholder Test</button>
              </div>
            </>
          ) : <p>No versions found.</p>}
        </section>
      </section>

      <section className="panel wide-panel">
        <h2>Compare Versions</h2>
        <div className="search-row">
          <input value={fromVersion} onChange={(event) => setFromVersion(event.target.value)} placeholder="from version" />
          <input value={toVersion} onChange={(event) => setToVersion(event.target.value)} placeholder="to version" />
          <button className="secondary-button" type="button" onClick={() => void compareVersions()}>Compare</button>
        </div>
        {compareResult !== null && compareResult !== undefined ? (
          <textarea readOnly value={renderJson(compareResult)} />
        ) : null}
      </section>
    </main>
  );
}
