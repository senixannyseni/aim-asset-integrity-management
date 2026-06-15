import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">AIM+n8n Tank Integrity Module</p>
        <h1>Engineering Master Data Sprint</h1>
        <p>
          Monorepo, RBAC baseline, migration scaffold, seed data, health checks, and the Tank Asset Register are ready.
          Engineering calculations are intentionally not implemented yet.
        </p>
        <div className="action-row">
          <Link className="primary-button" href="/assets">Open Tank Asset Register</Link>
          <a className="secondary-button" href="http://localhost:4000/health" target="_blank" rel="noreferrer">API Health</a>
        </div>
      </section>
      <section className="cards">
        <article>
          <h2>AIM Boundary</h2>
          <p>AIM remains the system of record. n8n calls AIM backend APIs only.</p>
        </article>
        <article>
          <h2>Evidence First</h2>
          <p>Evidence metadata and links are modeled before engineering approval workflows.</p>
        </article>
        <article>
          <h2>Formula Controlled</h2>
          <p>Future calculations must use approved Formula Registry versions only.</p>
        </article>
        <article>
          <h2>Tank Master Data</h2>
          <p>Asset, geometry, shell courses, and materials are captured with validation and audit logs.</p>
        </article>
      </section>
    </main>
  );
}
