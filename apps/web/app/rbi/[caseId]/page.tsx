import RbiCaseDetailClient from './RbiCaseDetailClient';

type RbiCaseDetailPageProps = { params: { caseId: string } };

export default function RbiCaseDetailPage({ params }: RbiCaseDetailPageProps) {
  return <RbiCaseDetailClient caseId={params.caseId} />;
}
