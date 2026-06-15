export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">AIM+n8n Tank Integrity Module</p>
        <h1>Foundation Sprint</h1>
        <p>
          Monorepo, RBAC baseline, migration scaffold, seed data, and health checks are ready.
          Engineering calculations are intentionally not implemented in this sprint.
        </p>
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
      </section>
    </main>
  );
}
