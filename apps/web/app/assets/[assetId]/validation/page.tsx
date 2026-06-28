import AssetValidationClient from './AssetValidationClient';

type AssetValidationPageProps = { params: { assetId: string } };

export default function AssetValidationPage({ params }: AssetValidationPageProps) {
  return <AssetValidationClient assetId={params.assetId} />;
}
