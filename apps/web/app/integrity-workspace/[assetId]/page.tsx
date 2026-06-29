import IntegrityWorkspaceDetailClient from './IntegrityWorkspaceDetailClient';

export default function IntegrityWorkspaceDetailPage({ params }: { params: { assetId: string } }) {
  return <IntegrityWorkspaceDetailClient assetId={params.assetId} />;
}
