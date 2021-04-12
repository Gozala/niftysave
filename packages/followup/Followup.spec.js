/* eslint-env mocha */
import { VinylAPI } from '@niftysave/vinyl/api.js'
import assert from 'assert'
import { MemKV } from 'cf-workers-memkv'
import { NFTStorage } from 'nft.storage'
import { Followup } from './Followup.js'

const TOKEN = 'secret'
const ENDPOINT = new URL('https://vinyl.nft.storage')
const USERNAME = 'user'
const PASSWORD = 'pass'

// /**
//  * @param {NFTStorage} client
//  * @param  {...(() => Promise<import('nft.storage/dist/src/lib/interface').StatusResult>)} calls
//  */
// function mockClientStatus (client, ...calls) {
//   client.status = async () => {
//     const call = calls.shift()
//     if (call == null) throw new Error('unexpected status call')
//     return call()
//   }
// }

describe('Followup', () => {
  /** @type KVNamespace */
  let store
  /** @type NFTStorage  */
  let client
  /** @type VinylAPI */
  let vy
  /** @type Followup */
  let fup

  beforeEach(() => {
    client = new NFTStorage({ token: TOKEN })
    store = new MemKV()
    vy = new VinylAPI({ endpoint: ENDPOINT, username: USERNAME, password: PASSWORD })
    fup = new Followup({ store, vinyl: vy, client })
  })

  it('interface', () => {
    assert.strictEqual(typeof Followup, 'function')
    assert.strictEqual(typeof fup.register, 'function')
    assert.strictEqual(typeof fup.followup, 'function')
  })

  it('register validation', async () => {
    await assert.rejects(
      fup.register('bad cid', 'queued'),
      /invalid asset CID:/
    )
    const cid = 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    await assert.rejects(
      // @ts-ignore
      fup.register(cid, 'pinned'),
      { message: 'invalid pin status: pinned' }
    )
  })

  it('register asset exists', async () => {
    const cid = 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    await store.put(cid, '', { metadata: { pinStatus: 'pinning' } })
    await fup.register(cid, 'queued')
    const result = await store.getWithMetadata(cid)
    /** @type import('./Followup.js').FollowupMeta */
    // @ts-ignore
    const metadata = result.metadata
    assert(metadata)
    assert.strictEqual(metadata.pinStatus, 'pinning')
  })

  it('register', async () => {
    const cid = 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    await fup.register(cid, 'pinning')
    const result = await store.getWithMetadata(cid)
    /** @type import('./Followup.js').FollowupMeta */
    // @ts-ignore
    const metadata = result.metadata
    assert(metadata)
    assert.strictEqual(metadata.pinStatus, 'pinning')
    assert(Date.now() - new Date(metadata.registeredAt).getTime() < 1000)
  })
})
