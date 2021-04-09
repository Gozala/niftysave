/* eslint-env worker */
import { NFTStorage } from 'nft.storage'
import { StorProc } from './StorProc.js'

// @ts-ignore
const client = new NFTStorage({ token: self.NFT_STORAGE_TOKEN, endpoint: self.NFT_STORAGE_ENDPOINT })
const sp = new StorProc({ client })

/**
 * @param {FetchEvent} event
 * @returns {Promise<Response>}
 */
async function onFetch (event) {
  const url = new URL(event.request.url)
  let status = 200
  /** @type import('./StorProc').StoreResult | { message: string } */
  let result

  try {
    if (url.pathname !== '/store') {
      throw Object.assign(new Error('not found'), { status: 404 })
    }
    const data = await event.request.json()
    result = await sp.store(data.asset)
  } catch (err) {
    console.error(err)
    status = err.status || 500
    result = { message: err.message }
  }

  return new Response(JSON.stringify(result), {
    status,
    headers: { 'Content-Type': 'application/json;charset=UTF-8' }
  })
}

addEventListener('fetch', event => event.respondWith(onFetch(event)))
