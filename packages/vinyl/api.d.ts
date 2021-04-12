export type NFTInfo = import('./Vinyl').NFTInfo
export type AssetInfo = import('./Vinyl').AssetInfo

export class VinylAPI {
  constructor (config: { endpoint: URL, username: string, password: string })
  record (info: NFTInfo, metadata: any, assets: Record<string, AssetInfo>): Promise<void>
  updateAsset (cid: string, info: AssetInfo): Promise<void>
}
