/* eslint-env worker */
import { Router, cors, postCors } from '@niftysave/router'
import { Vinyl } from './Vinyl.js'

/** @type KVNamespace */
// @ts-ignore
const store = self.NFTS
const vy = new Vinyl({ store })
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
r.add('post', '/api/record', handleRecord, [postCors])
r.add('post', '/api/asset/:cid', handleUpdateAsset, [postCors])

addEventListener('fetch', r.listen.bind(r))

/**
 * @param {FetchEvent} event
 */
async function handleRecord (event) {
  const { info, metadata, assets } = await event.request.json()
  await vy.record(info, metadata, assets)
  return new Response()
}

/**
 * @param {FetchEvent} event
 * @param {Record<string, string>} params
 */
async function handleUpdateAsset (event, params) {
  const info = await event.request.json()
  await vy.updateAsset(params.cid, info)
  return new Response()
}
