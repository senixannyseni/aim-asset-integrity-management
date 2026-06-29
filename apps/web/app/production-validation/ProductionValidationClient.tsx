'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type ProductionValidationGate = {
  gate_type: string;
  gate_status: string;
  blocking: boolean;
  message: string;
  metadata?: Record<string, unknown>;
};

type ProductionValidationReadiness = {
  generated_at: string;
  permission_required: string;
  read_only: boolean;
  production_validation_status: string;
  ready_for_go_live_without_conditions: boolean;
  release_candidate_ready_for_human_go_no_go_review: boolean;
  completion_estimate: Record<string, unknown>;
  gate_summary: Record<string, unknown>;
  production_validation_chain: string[];
  readiness_gates: ProductionValidationGate[];
  production_evidence_pack: Array<Record<string, unknown>>;
  final_signoff_roles: Array<Record<string, unknown>>;
  smoke_test_matrix: Array<Record<string, unknown>>;
  prohibited_controls: string[];
  safe_navigation_links: Array<{ label: string; href: string }>;
};

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function statusLabel(status: string): string {
  return status.replaceAll('_', ' ');
}

export default function ProductionValidationClient() {
  const [readiness, setReadiness] = useState<ProductionValidationReadiness | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProductionValidation() {
      setLoading(true);
      setMessage(null);
      try {
        const response = await apiFetch('/api/v1/production-validation/readiness', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message ?? 'Could not load production validation readiness.');
        setReadiness(payload.data);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not load production validation readiness. Confirm golive_readiness.view permission.');
      } finally {
        setLoading(false);
      }
    }
    void loadProductionValidation();
  }, []);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC4-V Production Environment Validation + Release Candidate Signoff Evidence</p>
          <h1>Production Validation Readiness</h1>
          <p>
            Evidence checklist for deployment verification, smoke testing, backup/restore, monitoring, security checks,
            rollback drill, and human go/no-go signoff. This page is read-only and cannot approve production launch.
          </p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/release-closure">Release Closure</Link>
          <Link className="secondary-button" href="/integrity-workspace">Integrity Workspace</Link>
          <Link className="secondary-button" href="/golive-readiness">Go-Live Readiness</Link>
          <Link className="secondary-button" href="/dashboard">Governance Dashboard</Link>
        </div>
      </header>

      {message && <div className="notice"><p>{message}</p></div>}
      {loading && <div className="notice"><p>Loading production validation readiness...</p></div>}

      {readiness && (
        <>
          <section className="panel wide-panel">
            <div className="panel-heading row-between">
              <div>
                <h2>Production Environment Validation Status</h2>
                <p>
                  RC4-V separates technical release-candidate readiness from final production go-live approval. Environment
                  evidence remains required before unconditional launch.
                </p>
              </div>
              <span className="badge">Read-only · {readiness.permission_required}</span>
            </div>
            <div className="metric-row">
              <dt>production validation status</dt>
              <dd><code>{statusLabel(readiness.production_validation_status)}</code></dd>
            </div>
            <div className="metric-row">
              <dt>ready for human go/no-go review</dt>
              <dd><code>{renderValue(readiness.release_candidate_ready_for_human_go_no_go_review)}</code></dd>
            </div>
            <div className="metric-row">
              <dt>ready for go-live without conditions</dt>
              <dd><code>{renderValue(readiness.ready_for_go_live_without_conditions)}</code></dd>
            </div>
          </section>

          <section className="cards" aria-label="production completion estimates">
            {Object.entries(readiness.completion_estimate).map(([key, value]) => (
              <article key={key}>
                <h2>{key.replaceAll('_', ' ')}</h2>
                <p><code>{renderValue(value)}</code></p>
              </article>
            ))}
          </section>

          <section className="panel wide-panel">
            <h2>Production Validation Chain</h2>
            <p>{readiness.production_validation_chain.join(' → ')}</p>
          </section>

          <section className="cards" aria-label="production validation readiness gates">
            {readiness.readiness_gates.map((gate) => (
              <article key={gate.gate_type}>
                <h2>{gate.gate_type.replaceAll('_', ' ')}</h2>
                <p><strong>{statusLabel(gate.gate_status)}</strong>{gate.blocking ? ' · blocking' : ' · non-blocking'}</p>
                <p>{gate.message}</p>
                {gate.metadata && Object.keys(gate.metadata).length > 0 && <p><code>{renderValue(gate.metadata)}</code></p>}
              </article>
            ))}
          </section>

          <section className="panel wide-panel">
            <h2>Production Evidence Pack</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Artifact</th><th>Required for Final Signoff</th></tr>
                </thead>
                <tbody>
                  {readiness.production_evidence_pack.map((item, index) => (
                    <tr key={`${String(item.path)}-${index}`}>
                      <td><code>{renderValue(item.path)}</code></td>
                      <td>{renderValue(item.required_for_final_signoff)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel wide-panel">
            <h2>Smoke Test Matrix</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Area</th><th>Required</th><th>Expected Evidence</th></tr>
                </thead>
                <tbody>
                  {readiness.smoke_test_matrix.map((item, index) => (
                    <tr key={`${String(item.area)}-${index}`}>
                      <td>{renderValue(item.area)}</td>
                      <td>{renderValue(item.required)}</td>
                      <td>{renderValue(item.expected_evidence)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel wide-panel">
            <h2>Final Human Signoff Roles</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Role</th><th>Required</th><th>Evidence Required</th></tr>
                </thead>
                <tbody>
                  {readiness.final_signoff_roles.map((item, index) => (
                    <tr key={`${String(item.role)}-${index}`}>
                      <td>{renderValue(item.role)}</td>
                      <td>{renderValue(item.required)}</td>
                      <td>{renderValue(item.evidence_required)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel wide-panel">
            <h2>Safe Navigation</h2>
            <div className="action-row">
              {readiness.safe_navigation_links.map((link) => (
                <Link key={link.href} className="secondary-button" href={link.href}>{link.label}</Link>
              ))}
            </div>
          </section>

          <section className="panel wide-panel">
            <h2>Read-only Controls Boundary</h2>
            <ul>
              {readiness.prohibited_controls.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
