import ReportDetailClient from './ReportDetailClient';

export default function ReportDetailPage({ params }: { params: { reportId: string } }) {
  return <ReportDetailClient reportId={params.reportId} />;
}
