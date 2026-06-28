import NdtDataRoomClient from '../../../ndt/NdtDataRoomClient';

type AssetNdtPageProps = { params: { assetId: string } };

export default function AssetNdtPage({ params }: AssetNdtPageProps) {
  return <NdtDataRoomClient fixedAssetId={params.assetId} assetScoped />;
}
