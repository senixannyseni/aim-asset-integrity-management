'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type DashboardSection = Record<string, unknown>;

type DashboardOverview = {
  generated_at: string;
  permission_required: string;
  read_only: boolean;
  source_of_truth: string;
  redaction_notice: string;
  sections: Record<string, DashboardSection>;
  traceability_links: Array<{ label: string; href: string; entity_type: string }>;
  prohibited_controls: string[];
};

const SECTION_TITLES: Record<string, string> = {
  asset_inspection_coverage: 'Asset & Inspection Coverage',
  evidence_readiness: 'Evidence Readiness',
  ai_extraction_review_queue: 'AI Extraction Review Queue',
  staging_promotion_readiness: 'Staging Readiness',
  calculation_review_readiness: 'Calculation / Review Readiness',
  report_issue_readiness: 'Report Gate Readiness',
  work_order_follow_up: 'Work Order Follow-up',
  governance_warnings: 'Governance / Audit Warnings',
  not_available: 'Not Available'
};

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function visibleEntries(section: DashboardSection): Array<[string, unknown]> {
  return Object.entries(section).filter(([key]) => key !== 'link');
}

export default function GovernanceDashboardClient() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setMessage(null);
      try {
        const response = await apiFetch('/api/v1/governance-dashboard/overview', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message ?? 'Could not load governance dashboard.');
        setOverview(payload.data);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not load governance dashboard. Confirm dashboard.view permission.');
      } finally {
        setLoading(false);
      }
    }
    void loadDashboard();
  }, []);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC3-F Governance Dashboard</p>
          <h1>Governance Dashboard Readiness Overview</h1>
          <p>
            Read-only overview of AIM readiness queues, evidence status, report gates, work-order follow-up, and governance warnings.
            The dashboard summarizes existing AIM state only and does not run engineering calculations or change records.
          </p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/evidence">Evidence</Link>
          <Link className="secondary-button" href="/reports">Reports</Link>
          <Link className="secondary-button" href="/audit-logs">Audit Logs</Link>
        </div>
      </header>

      {message && <div className="notice"><p>{message}</p></div>}
      {loading && <div className="notice"><p>Loading governance dashboard...</p></div>}

      {overview && (
        <>
          <section className="panel wide-panel">
            <div className="panel-heading row-between">
              <div>
                <h2>Dashboard Boundary</h2>
                <p>{overview.source_of_truth}</p>
                <p>{overview.redaction_notice}</p>
              </div>
              <span className="badge">Read-only · {overview.permission_required}</span>
            </div>
          </section>

          <section className="cards" aria-label="Governance readiness sections">
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
            <h2>Traceability Links</h2>
            <div className="action-row">
              {overview.traceability_links.map((link) => (
                <Link key={link.href} className="secondary-button" href={link.href}>{link.label}</Link>
              ))}
            </div>
          </section>

          <section className="panel wide-panel">
            <h2>Read-only Controls Boundary</h2>
            <p>
              This page provides visibility only. It contains no mutation controls, no n8n workflow execution, no direct database editor,
              no audit log edit/delete controls, no NDT visualization, and no hypercare dashboard.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
