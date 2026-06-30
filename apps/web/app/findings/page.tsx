import { Suspense } from 'react';
import FindingsClient from './FindingsClient';

export default function FindingsPage() {
  return (
    <Suspense fallback={<main className="container"><section className="notice">Loading findings workspace…</section></main>}>
      <FindingsClient />
    </Suspense>
  );
}
