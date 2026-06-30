import { Suspense } from 'react';
import NdtDataRoomClient from './NdtDataRoomClient';

export default function NdtPage() {
  return (
    <Suspense fallback={<main className="container"><section className="notice">Loading NDT data room…</section></main>}>
      <NdtDataRoomClient />
    </Suspense>
  );
}
