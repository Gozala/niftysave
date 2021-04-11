/* eslint-env mocha */
import assert from 'assert'
import { MemKV } from 'cf-workers-memkv'
import { Vinyl } from './Vinyl.js'
import { nfts } from './fixtures.js'

/**
 * @param {import('./Vinyl.js').NFTInfo} info
 * @returns {string}
 */
const getRootKey = info => [info.chain, info.contract, info.tokenID].join(':')

describe('Vinyl', () => {
  /** @type KVNamespace */
  let store
  /** @type Vinyl */
  let vy

  beforeEach(() => {
    store = new MemKV()
    vy = new Vinyl({ store })
  })

  it('interface', () => {
    assert.strictEqual(typeof Vinyl, 'function')
    assert.strictEqual(typeof vy.register, 'function')
    assert.strictEqual(typeof vy.updateAsset, 'function')
  })

  it('register', async () => {
    await vy.register(nfts[0].info, nfts[0].metadata, nfts[0].assets)

    const rootKey = getRootKey(nfts[0].info)

    const info = await store.get(`info:${rootKey}`, 'json')
    assert.deepStrictEqual(info, nfts[0].info)

    const metadata = await store.get(`metadata:${rootKey}`, 'json')
    assert.deepStrictEqual(metadata, nfts[0].metadata)

    const assets = await store.get(`assets:${rootKey}`, 'json')
    assert.deepStrictEqual(assets, Object.keys(nfts[0].assets))

    for (const [cid, info] of Object.entries(nfts[0].assets)) {
      /** @type {{ value: import('./Vinyl.js').AssetInfo | null, metadata: { size: number } | null }} */
      const asset = await store.getWithMetadata(`asset:${info.pinStatus}:${cid}`, 'json')
      assert.deepStrictEqual(asset.value, info)
      assert.deepStrictEqual(asset.metadata, { size: info.size })
    }
  })
})
