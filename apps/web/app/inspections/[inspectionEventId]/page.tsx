import InspectionEventDetailClient from './InspectionEventDetailClient';

export default function InspectionEventDetailPage({ params }: { params: { inspectionEventId: string } }) {
  return <InspectionEventDetailClient inspectionEventId={params.inspectionEventId} />;
}
