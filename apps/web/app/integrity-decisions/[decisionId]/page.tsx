'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

function renderJson(value: unknown): string {
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

export default function IntegrityDecisionDetailPage({ params }: { params: { decisionId: string } }) {
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    async function load() {
      const response = await apiFetch(`/api/v1/integrity-decisions/${params.decisionId}`, { cache: 'no-store' });
      setPayload(await response.json());
    }
    void load();
  }, [params.decisionId]);

  return (
    <main>
      <h1>Integrity Decision Detail</h1>
      <nav><Link href="/integrity-decisions">Back to Integrity Decisions</Link> | <Link href="/evidence">Evidence</Link></nav>
      <pre>{payload ? renderJson(payload) : 'Loading...'}</pre>
    </main>
  );
}
