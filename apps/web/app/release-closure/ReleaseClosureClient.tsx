'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type ReleaseGate = {
  gate_type: string;
  gate_status: string;
  blocking: boolean;
  message: string;
  metadata?: Record<string, unknown>;
};

type ReleaseClosureReadiness = {
  generated_at: string;
  permission_required: string;
  read_only: boolean;
  overall_release_closure_status: string;
  ready_for_go_live_without_conditions: boolean;
  release_candidate_ready_for_human_go_no_go_review: boolean;
  completion_estimate: Record<string, unknown>;
  gate_summary: Record<string, unknown>;
  release_chain: string[];
  readiness_gates: ReleaseGate[];
  uat_evidence_pack: Array<Record<string, unknown>>;
  production_closure_checklists: Array<Record<string, unknown>>;
  signoff_matrix: Array<Record<string, unknown>>;
  known_exclusions: string[];
  safe_navigation_links: Array<{ label: string; href: string }>;
  prohibited_controls: string[];
};

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function statusLabel(status: string): string {
  return status.replaceAll('_', ' ');
}

export default function ReleaseClosureClient() {
  const [readiness, setReadiness] = useState<ReleaseClosureReadiness | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReleaseClosure() {
      setLoading(true);
      setMessage(null);
      try {
        const response = await apiFetch('/api/v1/release-closure/readiness', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message ?? 'Could not load release closure readiness.');
        setReadiness(payload.data);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not load release closure readiness. Confirm golive_readiness.view permission.');
      } finally {
        setLoading(false);
      }
    }
    void loadReleaseClosure();
  }, []);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC4-U Final UAT Evidence Pack + Production Readiness Closure</p>
          <h1>Release Closure Readiness</h1>
          <p>
            Final release-candidate closure dashboard for UAT evidence, deployment verification, rollback, hypercare,
            known exclusions, and human go/no-go signoff. This page is read-only and summarizes closure evidence only.
          </p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/integrity-workspace">Integrity Workspace</Link>
          <Link className="secondary-button" href="/golive-readiness">Go-Live Readiness</Link>
          <Link className="secondary-button" href="/dashboard">Governance Dashboard</Link>
          <Link className="secondary-button" href="/audit-logs">Audit Logs</Link>
        </div>
      </header>

      {message && <div className="notice"><p>{message}</p></div>}
      {loading && <div className="notice"><p>Loading release closure readiness...</p></div>}

      {readiness && (
        <>
          <section className="panel wide-panel">
            <div className="panel-heading row-between">
              <div>
                <h2>Final Release Closure Status</h2>
                <p>
                  Release candidate readiness is separated from final go-live signoff. Environment evidence and human approvals
                  remain required before production launch.
                </p>
              </div>
              <span className="badge">Read-only · {readiness.permission_required}</span>
            </div>
            <div className="metric-row">
              <dt>overall release closure status</dt>
              <dd><code>{statusLabel(readiness.overall_release_closure_status)}</code></dd>
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

          <section className="cards" aria-label="release completion estimates">
            {Object.entries(readiness.completion_estimate).map(([key, value]) => (
              <article key={key}>
                <h2>{key.replaceAll('_', ' ')}</h2>
                <p><code>{renderValue(value)}</code></p>
              </article>
            ))}
          </section>

          <section className="panel wide-panel">
            <h2>Release Candidate Consolidation Chain</h2>
            <p>{readiness.release_chain.join(' → ')}</p>
          </section>

          <section className="cards" aria-label="release closure readiness gates">
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
            <h2>UAT Evidence Pack</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Artifact</th><th>Required for Final Signoff</th></tr>
                </thead>
                <tbody>
                  {readiness.uat_evidence_pack.map((item, index) => (
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
            <h2>Production Closure Checklists</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Path</th></tr>
                </thead>
                <tbody>
                  {readiness.production_closure_checklists.map((item, index) => (
                    <tr key={`${String(item.path)}-${index}`}>
                      <td>{renderValue(item.name)}</td>
                      <td><code>{renderValue(item.path)}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel wide-panel">
            <h2>Release Signoff Matrix</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Role</th><th>Required</th><th>Signoff Focus</th></tr>
                </thead>
                <tbody>
                  {readiness.signoff_matrix.map((item, index) => (
                    <tr key={`${String(item.role)}-${index}`}>
                      <td>{renderValue(item.role)}</td>
                      <td>{renderValue(item.required)}</td>
                      <td>{renderValue(item.signoff_focus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel wide-panel">
            <h2>Known Exclusions</h2>
            <ul>
              {readiness.known_exclusions.map((item) => <li key={item}>{item}</li>)}
            </ul>
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
