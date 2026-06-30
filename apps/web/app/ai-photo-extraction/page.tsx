import Link from 'next/link';

const reviewCards = [
  { title: 'Photo 12', page: 'Pg:12', component: 'Shell', defect: 'Coating defect', confidence: '82%', status: 'Needs Review', tone: 'badge-warning' },
  { title: 'Photo 15', page: 'Pg:16', component: 'Shell', defect: 'Corrosion', confidence: '55%', status: 'Needs Source', tone: 'badge-danger' },
  { title: 'Photo 18', page: 'Pg:27', component: 'Foundation', defect: 'Crack', confidence: '85%', status: 'Needs Review', tone: 'badge-warning' },
  { title: 'Photo 19', page: 'Pg:27', component: 'Dike', defect: 'Housekeeping', confidence: '76%', status: 'Needs Review', tone: 'badge-warning' }
];

export default function AiPhotoExtractionPage() {
  return (
    <div className="aim-preview-dashboard">
      <section className="aim-preview-grid-4" aria-label="AI photo extraction status">
        <div className="aim-kpi aim-kpi--navy"><span className="aim-kpi__label">Extraction Runs</span><span className="aim-kpi__value">3</span><span className="aim-kpi__sub">evidence packages processed</span></div>
        <div className="aim-kpi aim-kpi--amber"><span className="aim-kpi__label">Pending Review</span><span className="aim-kpi__value">7</span><span className="aim-kpi__sub">photos require engineer review</span></div>
        <div className="aim-kpi aim-kpi--red"><span className="aim-kpi__label">Needs Source</span><span className="aim-kpi__value">1</span><span className="aim-kpi__sub">source reference incomplete</span></div>
        <div className="aim-kpi aim-kpi--green"><span className="aim-kpi__label">Reviewed</span><span className="aim-kpi__value">29/36</span><span className="aim-kpi__sub">reviewed before promotion</span></div>
      </section>

      <section className="aim-panel">
        <div className="aim-panel__head">
          <span>📷</span>
          <span className="aim-panel__title">AI Photo Extraction Preview Alignment</span>
          <span className="badge badge-teal">Frontend UX</span>
        </div>
        <div className="aim-panel__body">
          <div className="aim-alert aim-alert--blue">
            This page is a frontend UX alignment workspace based on the AIM Preview reference. Backend photo-artifact endpoints should be wired in a later controlled package. AI photo output remains staging/supporting evidence and cannot approve engineering data.
          </div>
          <div className="action-row">
            <Link className="secondary-button" href="/evidence">Open Evidence Repository</Link>
            <Link className="secondary-button" href="/reviews">Open AI Field Review</Link>
            <Link className="secondary-button" href="/audit-logs">Open Audit Logs</Link>
          </div>
        </div>
      </section>

      <section className="aim-split-panels">
        <div className="aim-panel">
          <div className="aim-panel__head"><span>▶</span><span className="aim-panel__title">Extraction Runs</span></div>
          <div className="aim-table-wrap">
            <table>
              <thead><tr><th>Run</th><th>Evidence</th><th>Asset</th><th>Photos</th><th>Status</th></tr></thead>
              <tbody>
                <tr><td><code>run-001</code></td><td>EVD-2024-000001</td><td><code>AST-0042</code></td><td>36</td><td><span className="badge badge-warning">Partial Review</span></td></tr>
                <tr><td><code>run-002</code></td><td>EVD-2024-000002</td><td><code>AST-0043</code></td><td>22</td><td><span className="badge badge-success">Approved</span></td></tr>
                <tr><td><code>run-003</code></td><td>EVD-2025-000001</td><td><code>AST-0042</code></td><td>14</td><td><span className="badge badge-warning">Staged</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="aim-panel">
          <div className="aim-panel__head"><span>🧭</span><span className="aim-panel__title">Review Rules</span></div>
          <div className="aim-panel__body">
            <p>Reviewer must verify the image, caption, source page, component, defect classification, and evidence linkage before promotion.</p>
            <p>Corrections require reason, source reference, manual override/audit event, and backend gate validation.</p>
            <div className="aim-alert aim-alert--amber">Do not implement “approve all” without backend permission, evidence, and gate checks.</div>
          </div>
        </div>

        <div className="aim-panel">
          <div className="aim-panel__head"><span>🔗</span><span className="aim-panel__title">Linkage Targets</span></div>
          <Link className="aim-activity-row" href="/findings"><span>⚠️</span><span><strong>Findings</strong><br /><small>Photo supports anomaly/finding evidence</small></span></Link>
          <Link className="aim-activity-row" href="/reports"><span>📄</span><span><strong>Reports</strong><br /><small>Photo appendix and source traceability</small></span></Link>
          <Link className="aim-activity-row" href="/integrity-decisions"><span>🛡</span><span><strong>Integrity Decisions</strong><br /><small>Supporting evidence, never AI approval</small></span></Link>
        </div>
      </section>

      <section className="aim-panel">
        <div className="aim-panel__head"><span>👁</span><span className="aim-panel__title">Photo Review Queue</span></div>
        <div className="aim-panel__body">
          <div className="cards compact-cards">
            {reviewCards.map((card) => (
              <article key={card.title}>
                <div style={{ alignItems: 'center', background: '#f8fafc', borderRadius: 12, display: 'flex', height: 110, justifyContent: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 28 }}>📷</span>
                </div>
                <div className="row-between">
                  <h2 style={{ margin: 0 }}>{card.title}</h2>
                  <span className="badge">{card.page}</span>
                </div>
                <p>{card.component} · {card.defect}</p>
                <div className="row-between">
                  <span className={`badge ${card.tone}`}>{card.status}</span>
                  <code>{card.confidence}</code>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
