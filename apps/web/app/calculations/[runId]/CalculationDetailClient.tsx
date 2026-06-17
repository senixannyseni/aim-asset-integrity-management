'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

function renderJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function CalculationDetailClient({ runId }: { runId: string }) {
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadDetail() {
      const response = await apiFetch(`/api/v1/engineering/calculations/${runId}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload?.error?.message ?? 'Failed to load calculation detail.');
        return;
      }
      setDetail(payload.data);
    }
    void loadDetail();
  }, [runId]);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Sprint 9</p>
          <h1>Calculation Detail and Audit Trail</h1>
          <p>Full traceability for calculation inputs, outputs, engineering reviews, approval records, overrides, and audit logs.</p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/calculations">Calculations</Link>
          <Link className="secondary-button" href="/reviews">Reviews</Link>
        </div>
      </header>
      <section className="panel">
        {message && <div className="notice">{message}</div>}
        {!detail ? <p>Loading calculation audit trail...</p> : <textarea readOnly rows={34} value={renderJson(detail)} />}
      </section>
    </main>
  );
}
