import CalculationEngineClient from '../../../calculations/CalculationEngineClient';

type AssetCalculationsPageProps = { params: { assetId: string } };

export default function AssetCalculationsPage({ params }: AssetCalculationsPageProps) {
  return <CalculationEngineClient fixedAssetId={params.assetId} assetScoped />;
}
