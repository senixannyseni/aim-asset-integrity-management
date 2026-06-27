'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type GoliveSection = Record<string, unknown>;

type GoliveReadinessOverview = {
  generated_at: string;
  permission_required: string;
  read_only: boolean;
  overall_readiness_status: string;
  readiness_score_percent: number | 'not_available';
  source_of_truth: string;
  boundary_notice: string;
  no_calculation_notice: string;
  redaction_notice: string;
  sections: Record<string, GoliveSection>;
  traceability_links: Array<{ label: string; href: string; entity_type: string }>;
  prohibited_controls: string[];
};

const SECTION_TITLES: Record<string, string> = {
  overall_go_live_readiness_status: 'Overall Go-Live Readiness Status',
  readiness_gate_checklist: 'Readiness Gate Checklist',
  evidence_readiness_gate: 'Evidence Readiness Gate',
  ai_review_readiness_gate: 'AI Review Readiness Gate',
  staging_promotion_readiness_gate: 'Staging Promotion Readiness Gate',
  calculation_review_readiness_gate: 'Calculation/Review Readiness Gate',
  report_issue_gate_readiness: 'Report Issue Gate Readiness',
  ndt_readiness_gate: 'NDT Readiness Gate',
  workflow_notification_readiness_gate: 'Workflow/Notification Readiness Gate',
  audit_admin_governance_readiness: 'Audit/Admin Governance Readiness',
  uat_documentation_readiness: 'UAT Documentation Readiness',
  recent_blockers_and_warnings: 'Recent Blockers and Warnings',
  not_available: 'Not Available'
};

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function visibleEntries(section: GoliveSection): Array<[string, unknown]> {
  return Object.entries(section).filter(([key]) => key !== 'link');
}

export default function GoliveReadinessClient() {
  const [overview, setOverview] = useState<GoliveReadinessOverview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGoliveReadiness() {
      setLoading(true);
      setMessage(null);
      try {
        const response = await apiFetch('/api/v1/golive-readiness/overview', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message ?? 'Could not load go-live readiness.');
        setOverview(payload.data);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not load go-live readiness. Confirm golive_readiness.view permission.');
      } finally {
        setLoading(false);
      }
    }
    void loadGoliveReadiness();
  }, []);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC3-I Hypercare / Go-Live Readiness</p>
          <h1>Hypercare / Go-Live Readiness Dashboard</h1>
          <p>
            Read-only readiness visibility for blockers, gate status, workflow errors, failed notifications, pending reviews,
            evidence blockers, NDT evidence blockers, report gates, and UAT readiness indicators. This page summarizes existing AIM state only.
          </p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/dashboard">Governance Dashboard</Link>
          <Link className="secondary-button" href="/workflow-console">Workflow Console</Link>
          <Link className="secondary-button" href="/ndt-data-room">NDT Data Room</Link>
          <Link className="secondary-button" href="/audit-logs">Audit Logs</Link>
        </div>
      </header>

      {message && <div className="notice"><p>{message}</p></div>}
      {loading && <div className="notice"><p>Loading go-live readiness...</p></div>}

      {overview && (
        <>
          <section className="panel wide-panel">
            <div className="panel-heading row-between">
              <div>
                <h2>Overall Readiness Status</h2>
                <p>{overview.source_of_truth}</p>
                <p>{overview.boundary_notice}</p>
                <p>{overview.no_calculation_notice}</p>
                <p>{overview.redaction_notice}</p>
              </div>
              <span className="badge">Read-only · {overview.permission_required}</span>
            </div>
            <div className="metric-row">
              <dt>overall readiness status</dt>
              <dd><code>{overview.overall_readiness_status}</code></dd>
            </div>
            <div className="metric-row">
              <dt>readiness score percent</dt>
              <dd><code>{renderValue(overview.readiness_score_percent)}</code></dd>
            </div>
          </section>

          <section className="cards" aria-label="go-live readiness visibility sections">
            {Object.entries(overview.sections).map(([sectionKey, section]) => (
              <article key={sectionKey}>
                <h2>{SECTION_TITLES[sectionKey] ?? sectionKey}</h2>
                <dl>
                  {visibleEntries(section).map(([key, value]) => (
                    <div key={key} className="metric-row">
                      <dt>{key.replaceAll('_', ' ')}</dt>
                      <dd><code>{renderValue(value)}</code></dd>
                    </div>
                  ))}
                </dl>
                {typeof section.link === 'string' ? <Link href={section.link}>Open related workspace</Link> : <span>Related workspace not available</span>}
              </article>
            ))}
          </section>

          <section className="panel wide-panel">
            <h2>Safe Traceability Links</h2>
            <div className="action-row">
              {overview.traceability_links.map((link) => (
                <Link key={link.href} className="secondary-button" href={link.href}>{link.label}</Link>
              ))}
            </div>
          </section>

          <section className="panel wide-panel">
            <h2>Read-only Controls Boundary</h2>
            <p>
              This go-live readiness dashboard contains no approve/reject/correct/promote controls, no calculate/run FFS/run RBI controls,
              no report issue controls, no evidence delete controls, no admin mutation controls, no audit log edit/delete controls,
              no n8n execute/retry workflow controls, no close hypercare issue controls, and no override readiness status controls.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
