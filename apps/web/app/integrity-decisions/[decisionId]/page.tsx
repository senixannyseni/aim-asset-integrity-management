import IntegrityDecisionDetailClient from './IntegrityDecisionDetailClient';

export default function IntegrityDecisionDetailPage({ params }: { params: { decisionId: string } }) {
  return <IntegrityDecisionDetailClient decisionId={params.decisionId} />;
}
