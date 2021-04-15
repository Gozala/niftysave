/* eslint-env mocha */
import assert from 'assert'
import { MemKV } from 'cf-workers-memkv'
import { Vinyl } from './Vinyl.js'
import { nfts } from './fixtures.js'

/**
 * @param {import('./Vinyl.js').NFTInfo} info
 * @returns {string}
 */
const getRootKey = info => [info.chain, info.contract, info.tokenID].join('/')

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
    assert.strictEqual(typeof vy.record, 'function')
    assert.strictEqual(typeof vy.updateAsset, 'function')
  })

  it('record', async () => {
    await vy.record(nfts[0].info, nfts[0].metadata, nfts[0].assets)

    const rootKey = getRootKey(nfts[0].info)

    const info = await store.get(`info:${rootKey}`, 'json')
    assert.deepStrictEqual(info, nfts[0].info)

    const metadata = await store.get(`metadata:${rootKey}`, 'json')
    assert.deepStrictEqual(metadata, nfts[0].metadata)

    const assets = await store.get(`assets:${rootKey}`, 'json')
    assert.deepStrictEqual(assets, Object.keys(nfts[0].assets))

    for (const [cid, info] of Object.entries(nfts[0].assets)) {
      /** @type {{ value: import('./Vinyl.js').Asset | null, metadata: { size: number } | null }} */
      const asset = await store.getWithMetadata(`asset:${info.pinStatus}:${cid}`, 'json')
      assert.deepStrictEqual(asset.value, info)
      assert.deepStrictEqual(asset.metadata, { size: info.size })
    }
  })

  it('record asset exists', async () => {
    const existingAssetInfo = { pinStatus: 'pinned', test: `data${Date.now()}` }
    const existingAssetCid = Object.keys(nfts[0].assets)[0]
    const assetKey = `asset:pinned:${existingAssetCid}`
    await store.put(assetKey, JSON.stringify(existingAssetInfo))

    // should not overwrite existing pinned asset
    await vy.record(nfts[0].info, nfts[0].metadata, nfts[0].assets)

    const assetInfo = await store.get(assetKey, 'json')
    assert.deepStrictEqual(assetInfo, existingAssetInfo)
  })

  it('record validation', async () => {
    await assert.rejects(
      // @ts-ignore
      vy.record({ chain: 'fil', contract: '0x', tokenID: '12345' }, nfts[0].metadata, nfts[0].assets),
      { message: 'unsupported chain: fil' }
    )
    await assert.rejects(
      // @ts-ignore
      vy.record({ chain: 'eth', tokenID: '12345' }, nfts[0].metadata, nfts[0].assets),
      { message: 'missing contract hash' }
    )
    await assert.rejects(
      // @ts-ignore
      vy.record({ chain: 'eth', contract: '0x' }, nfts[0].metadata, nfts[0].assets),
      { message: 'missing token ID' }
    )
    await assert.rejects(
      vy.record(nfts[0].info, nfts[0].metadata, { 'not a cid': { pinStatus: 'pinned' } }),
      /invalid asset CID:/
    )
    const cid = 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    await assert.rejects(
      // @ts-ignore
      vy.record(nfts[0].info, nfts[0].metadata, { [cid]: null }),
      { message: 'invalid asset info: null' }
    )
    await assert.rejects(
      // @ts-ignore
      vy.record(nfts[0].info, nfts[0].metadata, { [cid]: { pinStatus: 'punned' } }),
      { message: 'invalid pin status: punned' }
    )
    await assert.rejects(
      vy.record(nfts[0].info, nfts[0].metadata, { [cid]: { pinStatus: 'pinned', size: -1 } }),
      { message: 'invalid size: -1' }
    )
  })

  it('updateAsset', async () => {
    const cid = 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    await store.put(`asset:pinning:${cid}`, JSON.stringify({ pinStatus: 'pinning' }))

    await vy.updateAsset(cid, { pinStatus: 'pinned' })

    const deletedAsset = await store.get(`asset:pinning:${cid}`)
    assert.strictEqual(deletedAsset, null)

    const asset = await store.get(`asset:pinned:${cid}`)
    assert(asset)
  })

  it('updateAsset not found', async () => {
    const cid = 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    await assert.rejects(vy.updateAsset(cid, { pinStatus: 'pinned' }), { message: `not found: ${cid}` })
  })

  it('updateAsset same status', async () => {
    const cid = 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    /** @type import('./Vinyl.js').Asset */
    const info = { pinStatus: 'pinned' }
    const key = `asset:pinned:${cid}`
    await store.put(key, JSON.stringify(info))
    // should succeed without error
    await vy.updateAsset(cid, info)
  })

  it('updateAsset validation', async () => {
    await assert.rejects(
      // @ts-ignore
      vy.updateAsset('b invalid cid', { pinStatus: 'pinned' }),
      /invalid asset CID:/
    )
    const cid = 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    await assert.rejects(
      // @ts-ignore
      vy.updateAsset(cid, { pinStatus: 'punned' }),
      { message: 'invalid pin status: punned' }
    )
    await assert.rejects(
      // @ts-ignore
      vy.updateAsset(cid, { pinStatus: 'pinned', size: 'not a number' }),
      { message: 'invalid size: not a number' }
    )
  })
})
