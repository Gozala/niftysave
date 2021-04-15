export type StoreResult = import('./StorProc').StoreResult

export class StorProcAPI {
  constructor (config: { endpoint: URL, username: string, password: string })
  store (asset: string): Promise<StoreResult>
}
