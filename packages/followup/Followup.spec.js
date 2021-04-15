/* eslint-env mocha */
import { VinylAPI } from '@niftysave/vinyl/api.js'
import assert from 'assert'
import { MemKV } from 'cf-workers-memkv'
import { NFTStorage } from 'nft.storage'
import { Followup, BACKOFF, MAX_AGE } from './Followup.js'

const TOKEN = 'secret'
const ENDPOINT = new URL('https://vinyl.nft.storage')
const USERNAME = 'user'
const PASSWORD = 'pass'

/**
 * @param {any} meta
 * @returns {import('./Followup.js').Asset}
 */
function metaToAsset (meta) {
  return { ...meta, created: new Date(meta.created), updated: new Date(meta.updated) }
}

/**
 * @param {NFTStorage} client
 * @param {...InstanceType<typeof NFTStorage>['status']} calls
 */
function mockClientStatus (client, ...calls) {
  client.status = cid => {
    const call = calls.shift()
    if (call == null) throw new Error('unexpected status call')
    return call(cid)
  }
}

/**
 * @param {VinylAPI} vinyl
 * @param  {...InstanceType<typeof VinylAPI>['updateAsset']} calls
 */
function mockVinylUpdateAsset (vinyl, ...calls) {
  vinyl.updateAsset = (cid, info) => {
    const call = calls.shift()
    if (call == null) throw new Error('unexpected updateAsset call')
    return call(cid, info)
  }
}

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
      fup.register([{ cid: 'bad cid', pinStatus: 'queued' }]),
      /invalid asset CID:/
    )
    const cid = 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    await assert.rejects(
      // @ts-ignore
      fup.register([{ cid, pinStatus: 'pinned' }]),
      { message: 'invalid pin status: pinned' }
    )
  })

  it('register', async () => {
    const cid = 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    await fup.register([{ cid, pinStatus: 'pinning' }])
    const result = await store.getWithMetadata(cid)
    const asset = metaToAsset(result.metadata)
    assert.strictEqual(asset.pinStatus, 'pinning')
    assert.strictEqual(asset.checks, 0)
    assert(Date.now() - new Date(asset.updated).getTime() < 1000)
    assert(Date.now() - new Date(asset.created).getTime() < 1000)
  })

  it('register asset exists', async () => {
    const cid = 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    await store.put(cid, '', { metadata: { pinStatus: 'pinning' } })
    await fup.register([{ cid, pinStatus: 'queued' }])
    const result = await store.getWithMetadata(cid)
    const asset = metaToAsset(result.metadata)
    assert.strictEqual(asset.pinStatus, 'pinning')
  })

  it('followup', async () => {
    const cid = 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    const now = new Date(Date.now() - 1)
    const then = new Date(now.getTime() - BACKOFF - 1)

    await store.put(cid, '', {
      metadata: { cid, pinStatus: 'queued', checks: 0, updated: then, created: then }
    })

    mockClientStatus(
      client,
      // queued => pinning
      async c => {
        assert.strictEqual(c, cid)
        /** @type import('nft.storage/dist/src/lib/interface').Pin */
        const pin = { cid, status: 'pinning', created: then }
        /** @type import('nft.storage/dist/src/lib/interface').OngoingDeals */
        const deals = { status: 'ongoing', deals: [] }
        return { cid, pin, deals, size: 0, created: then }
      },
      // pinning => pinned
      async c => {
        assert.strictEqual(c, cid)
        /** @type import('nft.storage/dist/src/lib/interface').Pin */
        const pin = { cid, status: 'pinned', created: then }
        /** @type import('nft.storage/dist/src/lib/interface').OngoingDeals */
        const deals = { status: 'ongoing', deals: [] }
        return { cid, pin, deals, size: 1234, created: then }
      }
    )

    mockVinylUpdateAsset(
      vy,
      // queued => pinning
      async (c, info) => {
        assert.strictEqual(c, cid)
        assert.strictEqual(info.pinStatus, 'pinning')
        assert.strictEqual(info.size, 0)
      },
      // pinning => pinned
      async (c, info) => {
        assert.strictEqual(c, cid)
        assert.strictEqual(info.pinStatus, 'pinned')
        assert.strictEqual(info.size, 1234)
      }
    )

    await fup.followup()

    const { metadata } = await store.getWithMetadata(cid)
    const asset = metaToAsset(metadata)
    assert.strictEqual(asset.pinStatus, 'pinning')
    assert.strictEqual(asset.checks, 1)
    assert.deepStrictEqual(asset.created, then)
    assert(asset.updated.getTime() > now.getTime())

    // wind back the clock so this CID is considered in the next call to followup
    await store.put(cid, '', { metadata: { ...asset, updated: then } })

    await fup.followup()

    assert.strictEqual(await store.get(cid), null)
  })

  it('followup no pin status change', async () => {
    const cid = 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    const now = new Date(Date.now() - 1)
    const then = new Date(now.getTime() - BACKOFF - 1)

    await store.put(cid, '', {
      metadata: { cid, pinStatus: 'pinning', checks: 0, updated: then, created: then }
    })

    mockClientStatus(
      client,
      async c => {
        assert.strictEqual(c, cid)
        /** @type import('nft.storage/dist/src/lib/interface').Pin */
        const pin = { cid, status: 'pinning', created: then }
        /** @type import('nft.storage/dist/src/lib/interface').OngoingDeals */
        const deals = { status: 'ongoing', deals: [] }
        return { cid, pin, deals, size: 0, created: then }
      }
    )

    mockVinylUpdateAsset(vy, () => assert.fail('updateAsset called for non-change to pin status'))

    await fup.followup()

    const { metadata } = await store.getWithMetadata(cid)
    const asset = metaToAsset(metadata)
    assert.strictEqual(asset.pinStatus, 'pinning')
    assert.strictEqual(asset.checks, 1)
    assert.deepStrictEqual(asset.created, then)
    assert(asset.updated.getTime() > now.getTime())
  })

  it('followup on expired asset', async () => {
    const cid = 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    const now = new Date(Date.now() - 1)
    const then = new Date(now.getTime() - MAX_AGE - 1)

    await store.put(cid, '', {
      metadata: { cid, pinStatus: 'pinning', checks: 0, updated: then, created: then }
    })

    mockClientStatus(
      client,
      async c => {
        assert.strictEqual(c, cid)
        /** @type import('nft.storage/dist/src/lib/interface').Pin */
        const pin = { cid, status: 'pinning', created: then }
        /** @type import('nft.storage/dist/src/lib/interface').OngoingDeals */
        const deals = { status: 'ongoing', deals: [] }
        return { cid, pin, deals, size: 0, created: then }
      }
    )

    mockVinylUpdateAsset(vy, async (c, info) => {
      assert.strictEqual(c, cid)
      assert.strictEqual(info.pinStatus, 'failed')
      assert.strictEqual(info.size, 0)
    })

    await fup.followup()

    // expired asset should have been deleted
    assert.strictEqual(await store.get(cid), null)
  })

  it('followup nft.storage status fail', async () => {
    const cid = 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    const now = new Date(Date.now() - 1)
    const then = new Date(now.getTime() - BACKOFF - 1)

    await store.put(cid, '', {
      metadata: { cid, pinStatus: 'queued', checks: 0, updated: then, created: then }
    })

    mockClientStatus(client, () => { throw new Error('boom') })

    await assert.rejects(fup.followup(), err => {
      // eslint-disable-next-line no-undef
      if (!(err instanceof AggregateError)) {
        return false
      }
      assert.strictEqual(err.message, 'follow-up failures')
      assert(err.errors[0].message.includes('boom'))
      return true
    })

    const { metadata } = await store.getWithMetadata(cid)
    const asset = metaToAsset(metadata)
    assert.strictEqual(asset.pinStatus, 'queued')
    assert.strictEqual(asset.checks, 1)
    assert.deepStrictEqual(asset.created, then)
    assert(asset.updated.getTime() > now.getTime())
  })

  it('followup nft.storage status fail on expired asset', async () => {
    const cid = 'QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
    const now = new Date(Date.now() - 1)
    const then = new Date(now.getTime() - MAX_AGE - 1)

    await store.put(cid, '', {
      metadata: { cid, pinStatus: 'queued', checks: 0, updated: then, created: then }
    })

    mockClientStatus(client, () => { throw new Error('boom') })

    mockVinylUpdateAsset(
      vy,
      // queued => failed
      async (c, info) => {
        assert.strictEqual(c, cid)
        assert.strictEqual(info.pinStatus, 'failed')
        assert.strictEqual(info.size, 0)
      }
    )

    await assert.rejects(fup.followup(), err => {
      // eslint-disable-next-line no-undef
      if (!(err instanceof AggregateError)) {
        return false
      }
      assert.strictEqual(err.message, 'follow-up failures')
      assert(err.errors[0].message.includes('boom'))
      return true
    })

    // expired asset should have been deleted
    assert.strictEqual(await store.get(cid), null)
  })
})
