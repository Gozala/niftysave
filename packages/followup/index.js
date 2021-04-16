/* eslint-env worker */
import { Router, cors, postCors } from '@niftysave/router'
import { VinylAPI } from '@niftysave/vinyl/api'
import { NFTStorage } from 'nft.storage'
import { Followup } from './Followup.js'

/** @type KVNamespace */
// @ts-ignore
const store = self.ASSETS
// @ts-ignore
const client = new NFTStorage({ token: self.NFT_STORAGE_TOKEN, endpoint: self.NFT_STORAGE_ENDPOINT })
// @ts-ignore
const vinyl = new VinylAPI({ endpoint: new URL(self.VINYL_ENDPOINT), username: self.VINYL_USERNAME, password: self.VINYL_PASSWORD })
const fup = new Followup({ store, client, vinyl })
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
r.add('post', '/api/register', handleRegister, [postCors])

addEventListener('fetch', r.listen.bind(r))

/**
 * @param {FetchEvent} event
 */
async function handleRegister (event) {
  const pins = await event.request.json()
  await fup.register(pins)
  return new Response()
}

addEventListener('scheduled', event => event.waitUntil(fup.followup()))
