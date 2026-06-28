import FindingDetailClient from './FindingDetailClient';

type FindingDetailPageProps = { params: { findingId: string } };

export default function FindingDetailPage({ params }: FindingDetailPageProps) {
  return <FindingDetailClient findingId={params.findingId} />;
}
