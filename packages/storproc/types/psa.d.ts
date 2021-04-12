export type Status = 'queued' | 'pinning' | 'pinned' | 'failed'

export type Pin = {
  cid: string,
  name?: string,
  origins?: string[],
  meta?: any
}

export type PinStatus = {
  requestid: string,
  status: Status,
  created: string,
  pin: Pin,
  delegates: string[],
  info?: any
}
