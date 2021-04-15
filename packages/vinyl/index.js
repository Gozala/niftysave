/* eslint-env worker */
import { Router, cors, postCors } from '@niftysave/router'
import { Vinyl } from './Vinyl.js'

/** @type KVNamespace */
// @ts-ignore
const nftStore = self.NFTS
// @ts-ignore
const pinStore = self.PINS
const vy = new Vinyl({ nftStore, pinStore })
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
r.add('post', '/api/nft', handleAddNFT, [postCors])
r.add('post', '/api/pin/:cid', handleUpdatePin, [postCors])

addEventListener('fetch', r.listen.bind(r))

/**
 * @param {FetchEvent} event
 */
async function handleAddNFT (event) {
  const { info, metadata, assets } = await event.request.json()
  await vy.addNFT(info, metadata, assets)
  return new Response()
}

/**
 * @param {FetchEvent} event
 * @param {Record<string, string>} params
 */
async function handleUpdatePin (event, params) {
  const pin = await event.request.json()
  await vy.updatePin({ ...pin, cid: params.cid })
  return new Response()
}
