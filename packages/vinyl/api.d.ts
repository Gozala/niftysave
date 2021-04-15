export type NFTInfo = import('./Vinyl').NFTInfo
export type Link = import('./Vinyl').Link
export type Pin = import('./Vinyl').Pin

export class VinylAPI {
  constructor (config: { endpoint: URL, username: string, password: string })
  addNFT (info: NFTInfo, metadata: any, links: Link[]): Promise<void>
  updatePin (pin: Pin): Promise<void>
}
