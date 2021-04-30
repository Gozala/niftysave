export {}

declare global {
  const WORKER_POOL_SIZE: string
  const PAGE_SIZE: string
  const TIME_BUDGET: string
  const DEBUG: string
  const LOCATION: string
  const EIP721_TOKENS: KVNamespace
  const EIP721_CURSOR: KVNamespace
  const EIP721_SCAN: KVNamespace
}
