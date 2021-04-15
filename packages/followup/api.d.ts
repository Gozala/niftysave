export type Status = 'queued'|'pinning'|'failed'
export type AssetReg = { cid: string, pinStatus: Status }

export class FollowupAPI {
  constructor (config: { endpoint: URL, username: string, password: string })
  register (assets: AssetReg[]): Promise<void>
}
