import AssetDetailClient from './AssetDetailClient';

export default function AssetDetailPage({ params }: { params: { assetId: string } }) {
  const assetId = params.assetId;
  return <div data-rc4h-findings-route={`/assets/${assetId}/findings`}><AssetDetailClient assetId={assetId} /></div>;
}
