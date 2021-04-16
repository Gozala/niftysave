export type PendingStatus = import('./Followup').PendingStatus
export type PendingPin = import('./Followup').PendingPin

export class FollowupAPI {
  constructor (config: { endpoint: URL, username: string, password: string })
  register (pins: Iterable<PendingPin>): Promise<void>
}
