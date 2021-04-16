export type NFTInfo = import('@niftysave/vinyl/api').NFTInfo
export type Metadata = import('@niftysave/vinyl/api').Metadata
export type FoundNFT = import('./StorProc').FoundNFT

export class StorProcAPI {
  constructor (config: { endpoint: URL, username: string, password: string })
  storeNFT (nft: FoundNFT): Promise<void>
}
