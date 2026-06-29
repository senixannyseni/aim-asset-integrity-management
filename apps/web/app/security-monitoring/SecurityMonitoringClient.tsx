'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type SecurityMonitoringGate = {
  gate_type: string;
  gate_status: string;
  blocking: boolean;
  message: string;
  metadata?: Record<string, unknown>;
};

type SecurityMonitoringReadiness = {
  generated_at: string;
  permission_required: string;
  read_only: boolean;
  security_monitoring_status: string;
  ready_for_unconditional_go_live_without_security_conditions: boolean;
  release_candidate_ready_for_security_operations_review: boolean;
  completion_estimate: Record<string, unknown>;
  gate_summary: Record<string, unknown>;
  security_monitoring_closure_chain: string[];
  readiness_gates: SecurityMonitoringGate[];
  security_monitoring_evidence_pack: Array<Record<string, unknown>>;
  signoff_roles: Array<Record<string, unknown>>;
  monitoring_matrix: Array<Record<string, unknown>>;
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

export default function SecurityMonitoringClient() {
  const [readiness, setReadiness] = useState<SecurityMonitoringReadiness | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSecurityMonitoring() {
      setLoading(true);
      setMessage(null);
      try {
        const response = await apiFetch('/api/v1/security-monitoring/readiness', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message ?? 'Could not load security monitoring readiness.');
        setReadiness(payload.data);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not load security monitoring readiness. Confirm golive_readiness.view permission.');
      } finally {
        setLoading(false);
      }
    }
    void loadSecurityMonitoring();
  }, []);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC4-W Security Review Evidence + Operational Monitoring Closure</p>
          <h1>Security Monitoring Readiness</h1>
          <p>
            Read-only evidence dashboard for secrets review, RBAC verification, service-actor boundaries, vulnerability scan
            review, audit-log redaction, monitoring dashboards, alert routing, incident escalation, and operational signoff.
          </p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/production-validation">Production Validation</Link>
          <Link className="secondary-button" href="/release-closure">Release Closure</Link>
          <Link className="secondary-button" href="/dashboard">Governance Dashboard</Link>
          <Link className="secondary-button" href="/audit-logs">Audit Logs</Link>
        </div>
      </header>

      {message && <div className="notice"><p>{message}</p></div>}
      {loading && <div className="notice"><p>Loading security monitoring readiness...</p></div>}

      {readiness && (
        <>
          <section className="panel wide-panel">
            <div className="panel-heading row-between">
              <div>
                <h2>Security Monitoring Closure Status</h2>
                <p>
                  RC4-W separates security and monitoring evidence from final production go-live approval. The page cannot
                  approve access, resolve vulnerabilities, mutate monitoring configuration, or sign off production launch.
                </p>
              </div>
              <span className="badge">Read-only · {readiness.permission_required}</span>
            </div>
            <div className="metric-row">
              <dt>security monitoring status</dt>
              <dd><code>{statusLabel(readiness.security_monitoring_status)}</code></dd>
            </div>
            <div className="metric-row">
              <dt>ready for security/operations review</dt>
              <dd><code>{renderValue(readiness.release_candidate_ready_for_security_operations_review)}</code></dd>
            </div>
            <div className="metric-row">
              <dt>ready without security conditions</dt>
              <dd><code>{renderValue(readiness.ready_for_unconditional_go_live_without_security_conditions)}</code></dd>
            </div>
          </section>

          <section className="cards" aria-label="security monitoring completion estimates">
            {Object.entries(readiness.completion_estimate).map(([key, value]) => (
              <article key={key}>
                <h2>{key.replaceAll('_', ' ')}</h2>
                <p><code>{renderValue(value)}</code></p>
              </article>
            ))}
          </section>

          <section className="panel wide-panel">
            <h2>Security Monitoring Closure Chain</h2>
            <p>{readiness.security_monitoring_closure_chain.join(' → ')}</p>
          </section>

          <section className="cards" aria-label="security monitoring readiness gates">
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
            <h2>Security Monitoring Evidence Pack</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Artifact</th><th>Required for Security/Operations Signoff</th></tr>
                </thead>
                <tbody>
                  {readiness.security_monitoring_evidence_pack.map((item, index) => (
                    <tr key={`${String(item.path)}-${index}`}>
                      <td><code>{renderValue(item.path)}</code></td>
                      <td>{renderValue(item.required_for_security_operations_signoff)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel wide-panel">
            <h2>Monitoring Matrix</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Area</th><th>Required</th><th>Expected Evidence</th></tr>
                </thead>
                <tbody>
                  {readiness.monitoring_matrix.map((item, index) => (
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
            <h2>Security / Operations Signoff Roles</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Role</th><th>Required</th><th>Evidence Required</th></tr>
                </thead>
                <tbody>
                  {readiness.signoff_roles.map((item, index) => (
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
