import WorkOrderDetailClient from './WorkOrderDetailClient';

export default function WorkOrderDetailPage({ params }: { params: { workOrderId: string } }) {
  return <WorkOrderDetailClient workOrderId={params.workOrderId} />;
}
