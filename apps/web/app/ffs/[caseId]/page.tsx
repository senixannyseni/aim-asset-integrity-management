import FfsCaseDetailClient from './FfsCaseDetailClient';

export default function FfsCaseDetailPage({ params }: { params: { caseId: string } }) {
  return <FfsCaseDetailClient caseId={params.caseId} />;
}
