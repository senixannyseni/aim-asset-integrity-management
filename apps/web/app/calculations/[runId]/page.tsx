import CalculationDetailClient from './CalculationDetailClient';

export default function CalculationDetailPage({ params }: { params: { runId: string } }) {
  return <CalculationDetailClient runId={params.runId} />;
}
