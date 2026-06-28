import FindingsClient from '../../../findings/FindingsClient';

type AssetFindingsPageProps = { params: { assetId: string } };

export default function AssetFindingsPage({ params }: AssetFindingsPageProps) {
  return <FindingsClient fixedAssetId={params.assetId} assetScoped />;
}
