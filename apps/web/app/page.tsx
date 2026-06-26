import Link from 'next/link';

const navigationItems = [
  { href: '/login', label: 'Login', description: 'Start a JWT-authenticated AIM session.' },
  { href: '/calculations', label: 'Calculations', description: 'Review deterministic calculation runs and engineering warnings.' },
  { href: '/evidence', label: 'Evidence', description: 'Open the evidence repository and linkage workspace.' },
  { href: '/integrity-decisions', label: 'Integrity Decisions', description: 'Review integrity decisions and evidence gates.' },
  { href: '/reports', label: 'Reports', description: 'Review report readiness gates and issue controls.' },
  { href: '/work-orders', label: 'Work Orders', description: 'Manage internal AIM work-order fallback actions.' },
  { href: '/audit-logs', label: 'Audit Logs', description: 'View read-only, redacted governance audit trail entries.' }
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">AIM Tank Integrity</p>
        <h1>Controlled engineering workspace</h1>
        <p>
          Use this landing page to access JWT-authenticated AIM modules. The root route intentionally avoids a 404 while preserving
          the source-of-truth rule that AIM remains the system of record and final engineering actions remain human gated.
        </p>
        <div className="action-row">
          <Link className="primary-button" href="/login">Login</Link>
          <Link className="secondary-button" href="/integrity-decisions">Review Integrity Decisions</Link>
        </div>
      </section>

      <section className="cards" aria-label="AIM module navigation">
        {navigationItems.map((item) => (
          <article key={item.href}>
            <h2><Link href={item.href}>{item.label}</Link></h2>
            <p>{item.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
