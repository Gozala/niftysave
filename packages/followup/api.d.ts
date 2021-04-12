export class FollowupAPI {
  constructor (config: { endpoint: URL, username: string, password: string })
  register (cid: string, pinStatus: 'queued'|'pinning'|'failed'): Promise<void>
}
