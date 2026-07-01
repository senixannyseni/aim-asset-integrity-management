'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type EvidenceTraceabilityModule = {
  module_key: string;
  module_label: string;
  entity_type: string;
  table_name: string;
  frontend_path: string;
  required_for_issue: boolean;
  total_records: number;
  linked_records: number;
  missing_records: number;
  coverage_percent: number;
  governance_note: string;
};

type EvidenceLinkRow = {
  evidence_link_id: string;
  evidence_file_id: string;
  evidence_code: string;
  original_filename: string;
  linked_entity_type: string;
  linked_entity_id: string;
  link_reason: string;
  asset_id?: string;
  inspection_event_id?: string;
  evidence_status: string;
  created_at: string;
};

type EvidenceTraceabilityMatrix = {
  scope: { asset_id: string | null; inspection_event_id: string | null; filter_note: string };
  summary: {
    total_records: number;
    linked_records: number;
    missing_records: number;
    coverage_percent: number;
    module_count: number;
    modules_with_missing_evidence: number;
    required_module_count: number;
    required_modules_with_missing_evidence: number;
    ready_for_governance_review: boolean;
  };
  coverage_matrix: EvidenceTraceabilityModule[];
  missing_evidence: Array<{
    module_key: string;
    module_label: string;
    entity_type: string;
    missing_records: number;
    required_for_issue: boolean;
    recommended_action: string;
  }>;
  evidence_link_rows: EvidenceLinkRow[];
  traceability_links: Array<{ label: string; entity_type: string; href: string; missing_records: number }>;
  governance_notes: string[];
};

function renderStatus(value: boolean): string {
  return value ? 'ready' : 'missing evidence';
}

function buildQuery(assetId: string, inspectionEventId: string): string {
  const params = new URLSearchParams();
  if (assetId.trim()) params.set('asset_id', assetId.trim());
  if (inspectionEventId.trim()) params.set('inspection_event_id', inspectionEventId.trim());
  const query = params.toString();
  return `/api/v1/evidence/traceability-matrix${query ? `?${query}` : ''}`;
}

export default function EvidenceTraceabilityMatrixClient() {
  const [matrix, setMatrix] = useState<EvidenceTraceabilityMatrix | null>(null);
  const [assetId, setAssetId] = useState('');
  const [inspectionEventId, setInspectionEventId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMatrix(path = buildQuery(assetId, inspectionEventId)) {
    setLoading(true);
    setMessage(null);
    const response = await apiFetch(path, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload?.error?.message ?? 'Could not load evidence traceability matrix.');
      setMatrix(null);
      setLoading(false);
      return;
    }
    setMatrix(payload.data);
    setLoading(false);
  }

  useEffect(() => {
    void loadMatrix('/api/v1/evidence/traceability-matrix');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requiredBlockers = useMemo(
    () => matrix?.coverage_matrix.filter((module) => module.required_for_issue && module.missing_records > 0) ?? [],
    [matrix]
  );

  async function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadMatrix(buildQuery(assetId, inspectionEventId));
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC4-M evidence traceability matrix</p>
          <h1>Cross-Module Evidence Coverage</h1>
          <p>
            Read-only matrix for asset, inspection, NDT, findings, calculations, integrity decisions, RBI, reports, and work orders.
            This page highlights missing evidence links without approving, issuing, closing, uploading, downloading, or mutating records.
          </p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/evidence">Evidence Repository</Link>
          <Link className="secondary-button" href="/reports">Reports</Link>
          <Link className="secondary-button" href="/work-orders">Work Orders</Link>
        </div>
      </header>

      <section className="panel">
        <div className="panel-heading">
          <h2>Matrix Filters</h2>
          <p>Optional UUID filters narrow the read-only coverage view. Backend evidence gates remain authoritative.</p>
        </div>
        <form className="form-grid" onSubmit={applyFilters}>
          <label><span>Asset ID</span><input value={assetId} onChange={(event) => setAssetId(event.target.value)} /></label>
          <label><span>Inspection Event ID</span><input value={inspectionEventId} onChange={(event) => setInspectionEventId(event.target.value)} /></label>
          <button className="primary-button" type="submit">Refresh Evidence Coverage</button>
        </form>
        {message && <div className="notice">{message}</div>}
      </section>

      {loading && <section className="panel"><p>Loading evidence traceability matrix...</p></section>}

      {matrix && !loading && (
        <>
          <section className="cards evidence-summary-cards">
            <article><h2>{matrix.summary.coverage_percent}%</h2><p>Overall linked evidence coverage</p></article>
            <article><h2>{matrix.summary.linked_records}/{matrix.summary.total_records}</h2><p>Records with evidence links</p></article>
            <article><h2>{matrix.summary.modules_with_missing_evidence}</h2><p>Modules with missing evidence</p></article>
            <article><h2>{renderStatus(matrix.summary.ready_for_governance_review)}</h2><p>Required modules readiness</p></article>
          </section>

          <section className="panel">
            <div className="panel-heading row-between">
              <div>
                <h2>Coverage Matrix</h2>
                <p>{matrix.scope.filter_note}</p>
              </div>
              <span className="badge">required blockers: {requiredBlockers.length}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Module</th><th>Entity</th><th>Coverage</th><th>Linked</th><th>Missing</th><th>Required</th><th>Open</th></tr>
                </thead>
                <tbody>
                  {matrix.coverage_matrix.map((module) => (
                    <tr key={module.module_key}>
                      <td><strong>{module.module_label}</strong><br /><small>{module.governance_note}</small></td>
                      <td>{module.entity_type}</td>
                      <td><span className="badge">{module.coverage_percent}%</span></td>
                      <td>{module.linked_records}</td>
                      <td>{module.missing_records}</td>
                      <td>{module.required_for_issue ? 'yes' : 'no'}</td>
                      <td><Link href={module.frontend_path}>Open</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid-two">
            <article className="panel">
              <div className="panel-heading"><h2>Missing Evidence Indicators</h2><p>These are coverage warnings only, not engineering decisions.</p></div>
              {matrix.missing_evidence.length === 0 ? <p>No missing evidence indicators for the current scope.</p> : matrix.missing_evidence.map((item) => (
                <div className="callout" key={item.module_key}>
                  <strong>{item.module_label}</strong>
                  <p>{item.missing_records} missing {item.entity_type} evidence link(s). Required for issue: {item.required_for_issue ? 'yes' : 'no'}.</p>
                  <p>{item.recommended_action}</p>
                </div>
              ))}
            </article>
            <article className="panel">
              <div className="panel-heading"><h2>Governance Notes</h2><p>Evidence matrix boundaries.</p></div>
              <ul>
                {matrix.governance_notes.map((note) => <li key={note}>{note}</li>)}
              </ul>
            </article>
          </section>

          <section className="panel">
            <div className="panel-heading"><h2>Recent Evidence Links</h2><p>Latest normalized evidence_links rows in the current scope.</p></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Evidence</th><th>Filename</th><th>Linked Entity</th><th>Reason</th><th>Status</th><th>Created</th></tr></thead>
                <tbody>
                  {matrix.evidence_link_rows.length === 0 ? <tr><td colSpan={6}>No evidence links found for this scope.</td></tr> : matrix.evidence_link_rows.map((row) => (
                    <tr key={row.evidence_link_id}>
                      <td>{row.evidence_code}</td>
                      <td>{row.original_filename}</td>
                      <td>{row.linked_entity_type}<br /><small>{row.linked_entity_id}</small></td>
                      <td>{row.link_reason}</td>
                      <td><span className="badge">{row.evidence_status}</span></td>
                      <td>{row.created_at?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
