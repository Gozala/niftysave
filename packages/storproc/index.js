/* eslint-env worker */
import { Router, cors, postCors } from '@niftysave/router'
import { VinylAPI } from '@niftysave/vinyl/api'
import { FollowupAPI } from '@niftysave/followup/api'
import { NFTStorage } from 'nft.storage'
import { StorProc } from './StorProc.js'

// @ts-ignore
const client = new NFTStorage({ token: self.NFT_STORAGE_TOKEN, endpoint: self.NFT_STORAGE_ENDPOINT })
// @ts-ignore
const vy = new VinylAPI({ endpoint: new URL(self.VINYL_ENDPOINT), username: self.VINYL_USERNAME, password: self.VINYL_PASSWORD })
// @ts-ignore
const fup = new FollowupAPI({ endpoint: new URL(self.FOLLOWUP_ENDPOINT), username: self.FOLLOWUP_USERNAME, password: self.FOLLOWUP_PASSWORD })
const sp = new StorProc({ client, vinyl: vy, followup: fup })
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
r.add('post', '/api/nft', handleStoreNFT, [postCors])

addEventListener('fetch', r.listen.bind(r))

/**
 * @param {FetchEvent} event
 * @returns {Promise<Response>}
 */
async function handleStoreNFT (event) {
  const nft = await event.request.json()
  await sp.storeNFT(nft)
  return new Response()
}
