/* eslint-env worker */
import { Vinyl } from './Vinyl.js'

/** @type KVNamespace */
// @ts-ignore
const store = self.NFTS
const vy = new Vinyl({ store })

/**
 * @param {FetchEvent} event
 * @returns {Promise<Response>}
 */
async function onFetch (event) {
  const url = new URL(event.request.url)
  let status = 200
  let result

  try {
    if (url.pathname === '/api/register') {
      // TODO: basic auth
      const { info, metadata, assets } = await event.request.json()
      await vy.register(info, metadata, assets)
    } else if (url.pathname.startsWith('/api/asset/')) {
      // TODO: basic auth
      const cid = url.pathname.split('/')[3]
      const info = await event.request.json()
      await vy.updateAsset(cid, info)
    } else {
      throw Object.assign(new Error('not found'), { status: 404 })
    }
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
