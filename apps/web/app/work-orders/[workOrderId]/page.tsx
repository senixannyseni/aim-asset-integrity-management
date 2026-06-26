'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

function renderJson(value: unknown): string {
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

export default function WorkOrderDetailPage({ params }: { params: { workOrderId: string } }) {
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    async function load() {
      const response = await apiFetch(`/api/v1/work-orders/${params.workOrderId}`, { cache: 'no-store' });
      setPayload(await response.json());
    }
    void load();
  }, [params.workOrderId]);

  return (
    <main>
      <h1>Work Order Detail</h1>
      <nav><Link href="/work-orders">Back to Work Orders</Link> | <Link href="/reports">Reports</Link></nav>
      <pre>{payload ? renderJson(payload) : 'Loading...'}</pre>
    </main>
  );
}
