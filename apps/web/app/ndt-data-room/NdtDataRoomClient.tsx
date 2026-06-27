'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type NdtSection = Record<string, unknown>;

type NdtDataRoomOverview = {
  generated_at: string;
  permission_required: string;
  read_only: boolean;
  source_of_truth: string;
  boundary_notice: string;
  no_calculation_notice: string;
  redaction_notice: string;
  sections: Record<string, NdtSection>;
  traceability_links: Array<{ label: string; href: string; entity_type: string }>;
  prohibited_controls: string[];
};

const SECTION_TITLES: Record<string, string> = {
  ndt_method_summary: 'NDT Method Summary',
  component_coverage_summary: 'Component Coverage Summary',
  cml_tml_grid_coverage_summary: 'CML/TML/Grid Coverage Summary',
  evidence_linkage_status: 'Evidence Linkage Status',
  measurement_readiness: 'Measurement Readiness',
  latest_measurements: 'Latest Measurements',
  governance_warnings: 'Governance Warnings',
  not_available: 'Not Available'
};

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function visibleEntries(section: NdtSection): Array<[string, unknown]> {
  return Object.entries(section).filter(([key]) => key !== 'link');
}

export default function NdtDataRoomClient() {
  const [overview, setOverview] = useState<NdtDataRoomOverview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNdtDataRoom() {
      setLoading(true);
      setMessage(null);
      try {
        const response = await apiFetch('/api/v1/ndt-data-room/overview', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message ?? 'Could not load NDT data room.');
        setOverview(payload.data);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not load NDT data room. Confirm ndt_data_room.view permission.');
      } finally {
        setLoading(false);
      }
    }
    void loadNdtDataRoom();
  }, []);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC3-H NDT Data Room</p>
          <h1>NDT Data Room / Visualization Governance</h1>
          <p>
            Read-only NDT measurement and evidence-linkage visibility for UT, MFL, CML/TML/Grid and component coverage.
            This page summarizes existing AIM measurement records only and does not calculate FFS, RBI, corrosion rate, or remaining life.
          </p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/ndt">NDT Workspace</Link>
          <Link className="secondary-button" href="/evidence">Evidence</Link>
          <Link className="secondary-button" href="/audit-logs">Audit Logs</Link>
        </div>
      </header>

      {message && <div className="notice"><p>{message}</p></div>}
      {loading && <div className="notice"><p>Loading NDT data room...</p></div>}

      {overview && (
        <>
          <section className="panel wide-panel">
            <div className="panel-heading row-between">
              <div>
                <h2>NDT Data Room Boundary</h2>
                <p>{overview.source_of_truth}</p>
                <p>{overview.boundary_notice}</p>
                <p>{overview.no_calculation_notice}</p>
                <p>{overview.redaction_notice}</p>
              </div>
              <span className="badge">Read-only · {overview.permission_required}</span>
            </div>
          </section>

          <section className="cards" aria-label="NDT data room visibility sections">
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
              This NDT data room contains no approve/reject/correct/promote controls, no calculate/run FFS/run RBI controls,
              no report issue controls, no evidence delete controls, no admin mutation controls, no audit log edit/delete controls,
              no n8n workflow execution controls, and no NDT upload/change controls.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
