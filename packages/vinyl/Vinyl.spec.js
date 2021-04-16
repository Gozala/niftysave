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
  let nftStore
  /** @type KVNamespace */
  let pinStore
  /** @type Vinyl */
  let vy

  beforeEach(() => {
    nftStore = new MemKV()
    pinStore = new MemKV()
    vy = new Vinyl({ nftStore, pinStore })
  })

  it('interface', () => {
    assert.strictEqual(typeof Vinyl, 'function')
    assert.strictEqual(typeof vy.addNFT, 'function')
    assert.strictEqual(typeof vy.updatePin, 'function')
  })

  it('addNFT', async () => {
    await vy.addNFT(nfts[0])
    const rootKey = getRootKey(nfts[0].info)
    /** @type {import('./Vinyl.js').NFT | null} */
    const nft = await nftStore.get(rootKey, 'json')
    assert(nft)
    assert.deepStrictEqual(nft, nfts[0])
  })

  it('addNFT validation', async () => {
    await assert.rejects(
      // @ts-ignore
      vy.addNFT({ ...nfts[0], info: { chain: 'fil', contract: '0x', tokenID: '12345' } }),
      { message: 'unsupported chain: fil' }
    )
    await assert.rejects(
      // @ts-ignore
      vy.addNFT({ ...nfts[0], info: { chain: 'eth', tokenID: '12345' } }),
      { message: 'missing contract hash' }
    )
    await assert.rejects(
      // @ts-ignore
      vy.addNFT({ ...nfts[0], info: { chain: 'eth', contract: '0x' } }),
      { message: 'missing token ID' }
    )
    await assert.rejects(
      vy.addNFT({ ...nfts[0], links: [{ cid: 'not a cid', name: 'test' }] }),
      /invalid CID:/
    )
    const cid = 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    await assert.rejects(
      // @ts-ignore
      vy.addNFT({ ...nfts[0], links: [{ cid }] }),
      { message: 'invalid link name' }
    )
  })

  it('updatePin', async () => {
    const cid = 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    await pinStore.put(`pinning/${cid}`, '', { metadata: { size: 0 } })

    await vy.updatePin({ cid, status: 'pinned' })

    const pin = await pinStore.get(`pinned/${cid}`)
    assert.notStrictEqual(pin, null)
  })

  it('updatePin same status', async () => {
    const cid = 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    await pinStore.put(`pinned/${cid}`, '')
    // should succeed without error
    await vy.updatePin({ cid, status: 'pinned' })
  })

  it('updatePin validation', async () => {
    await assert.rejects(
      // @ts-ignore
      vy.updatePin({ cid: 'b invalid cid', status: 'pinned' }),
      /invalid CID:/
    )
    const cid = 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    await assert.rejects(
      // @ts-ignore
      vy.updatePin({ cid, status: 'punned' }),
      { message: 'invalid status: punned' }
    )
    await assert.rejects(
      // @ts-ignore
      vy.updatePin({ cid, status: 'pinned', size: 'not a number' }),
      { message: 'invalid size: not a number' }
    )
  })
})
