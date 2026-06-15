import AssetDetailClient from './AssetDetailClient';

export default function AssetDetailPage({ params }: { params: { assetId: string } }) {
  return <AssetDetailClient assetId={params.assetId} />;
}
