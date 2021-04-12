/* eslint-env worker */
import { Router, cors, postCors } from '@niftysave/router'
import { NFTStorage } from 'nft.storage'
import { StorProc } from './StorProc.js'

// @ts-ignore
const client = new NFTStorage({ token: self.NFT_STORAGE_TOKEN, endpoint: self.NFT_STORAGE_ENDPOINT })
const sp = new StorProc({ client })
const r = new Router({
  onError: (_, err) => new Response(JSON.stringify({ message: err.message }), {
    // @ts-ignore
    status: err.status || 500,
    headers: { 'Content-Type': 'application/json;charset=UTF-8' }
  }),
  onNotFound: () => new Response(JSON.stringify({ message: 'not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json;charset=UTF-8' }
  })
})

r.add('options', '/api/*', cors)
// TODO: basic auth
r.add('post', '/api/store', handleStore, [postCors])

addEventListener('fetch', r.listen.bind(r))

/**
 * @param {FetchEvent} event
 * @returns {Promise<Response>}
 */
async function handleStore (event) {
  const data = await event.request.json()
  const result = await sp.store(data.asset)
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json;charset=UTF-8' }
  })
}
