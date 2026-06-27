'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type WorkflowSection = Record<string, unknown>;

type WorkflowConsoleOverview = {
  generated_at: string;
  permission_required: string;
  read_only: boolean;
  source_of_truth: string;
  boundary_notice: string;
  redaction_notice: string;
  sections: Record<string, WorkflowSection>;
  traceability_links: Array<{ label: string; href: string; entity_type: string }>;
  prohibited_controls: string[];
};

const SECTION_TITLES: Record<string, string> = {
  workflow_task_summary: 'Workflow Task Summary',
  pending_human_follow_ups: 'Pending Human Follow-ups',
  notification_delivery_status: 'Notification Delivery Status',
  workflow_failure_error_summary: 'Workflow Failure / Error Summary',
  recent_workflow_events: 'Recent Workflow Events',
  n8n_boundary: 'n8n Boundary Reminder',
  not_available: 'Not Available'
};

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function visibleEntries(section: WorkflowSection): Array<[string, unknown]> {
  return Object.entries(section).filter(([key]) => key !== 'link');
}

export default function WorkflowConsoleClient() {
  const [overview, setOverview] = useState<WorkflowConsoleOverview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWorkflowConsole() {
      setLoading(true);
      setMessage(null);
      try {
        const response = await apiFetch('/api/v1/workflow-console/overview', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message ?? 'Could not load workflow console.');
        setOverview(payload.data);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not load workflow console. Confirm workflow_console.view permission.');
      } finally {
        setLoading(false);
      }
    }
    void loadWorkflowConsole();
  }, []);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC3-G n8n Workflow Console</p>
          <h1>n8n Workflow Console / Orchestration Visibility</h1>
          <p>
            Read-only AIM-side visibility into workflow tasks, notification delivery, failed routing, pending human follow-ups,
            and recent n8n-related orchestration events. This page does not execute workflows or mutate engineering records.
          </p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/dashboard">Dashboard</Link>
          <Link className="secondary-button" href="/audit-logs">Audit Logs</Link>
          <Link className="secondary-button" href="/work-orders">Work Orders</Link>
        </div>
      </header>

      {message && <div className="notice"><p>{message}</p></div>}
      {loading && <div className="notice"><p>Loading workflow console...</p></div>}

      {overview && (
        <>
          <section className="panel wide-panel">
            <div className="panel-heading row-between">
              <div>
                <h2>Workflow Console Boundary</h2>
                <p>{overview.source_of_truth}</p>
                <p>{overview.boundary_notice}</p>
                <p>{overview.redaction_notice}</p>
              </div>
              <span className="badge">Read-only · {overview.permission_required}</span>
            </div>
          </section>

          <section className="cards" aria-label="Workflow orchestration visibility sections">
            {Object.entries(overview.sections).map(([sectionKey, section]: [string, WorkflowSection]) => (
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
            <h2>Safe AIM Links</h2>
            <div className="action-row">
              {overview.traceability_links.map((link) => (
                <Link key={link.href} className="secondary-button" href={link.href}>{link.label}</Link>
              ))}
            </div>
          </section>

          <section className="panel wide-panel">
            <h2>Read-only Controls Boundary</h2>
            <p>
              This workflow console contains no execute/retry controls, no approve/reject/correct/promote controls, no report issue controls,
              no evidence delete controls, no admin mutation controls, no audit log edit/delete controls, no calculation runner,
              no n8n workflow editor or builder, and no credential or webhook secret editor.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
