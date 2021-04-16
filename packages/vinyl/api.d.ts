export type NFTInfo = import('./Vinyl').NFTInfo
export type Metadata = import('./Vinyl').Metadata
export type NFT = import('./Vinyl').NFT
export type Link = import('./Vinyl').Link
export type Pin = import('./Vinyl').Pin

export class VinylAPI {
  constructor (config: { endpoint: URL, username: string, password: string })
  addNFT (nft: NFT): Promise<void>
  updatePin (pin: Pin): Promise<void>
}
