/* eslint-env mocha */
import assert from 'assert'
import { NFTStorage } from 'nft.storage'
import { Headers, Response } from '@web-std/fetch'
import { StorProc } from './StorProc.js'
import { VinylAPI } from '@niftysave/vinyl/api.js'
import { FollowupAPI } from '@niftysave/followup/api.js'

const TOKEN = 'secret'
const VINYL_ENDPOINT = new URL('https://vinyl.nft.storage')
const FOLLOWUP_ENDPOINT = new URL('https://followup.nft.storage')
const USERNAME = 'user'
const PASSWORD = 'pass'

/** @typedef {(url: RequestInfo, init: RequestInit) => Promise<Response>} Fetch */

global.fetch = () => { throw new Error('missing fetch implementation') }

/**
 * @param {Fetch[]} calls
 */
function mockFetch (...calls) {
  // @ts-ignore
  global.fetch = async (url, init) => {
    const call = calls.shift()
    if (call == null) throw new Error(`unexpected fetch request: ${url}`)
    // @ts-ignore
    return call(url, init)
  }
}

/**
 * @param {NFTStorage} client
 * @param  {...InstanceType<typeof NFTStorage>['storeBlob']} calls
 */
function mockClientStoreBlob (client, ...calls) {
  client.storeBlob = async b => {
    const call = calls.shift()
    if (call == null) throw new Error(`unexpected storeBlob call: ${b}`)
    return call(b)
  }
}

/**
 * @param {VinylAPI} vy
 * @param  {...InstanceType<typeof VinylAPI>['addNFT']} calls
 */
function mockVinylAddNFT (vy, ...calls) {
  vy.addNFT = nft => {
    const call = calls.shift()
    if (call == null) throw new Error('unexpected addNFT call')
    return call(nft)
  }
}

/**
 * @param {FollowupAPI} fup
 * @param  {...InstanceType<typeof FollowupAPI>['register']} calls
 */
function mockFollowupRegister (fup, ...calls) {
  fup.register = pins => {
    const call = calls.shift()
    if (call == null) throw new Error('unexpected register call')
    return call(pins)
  }
}

/**
 * @returns {import('@niftysave/vinyl/api').NFTInfo}
 */
function fakeNFTInfo () {
  return {
    chain: 'eth',
    contract: '0xb932a70a57673d89f4acffbe830e8ed7f75fb9e0',
    tokenID: '6714',
    tokenURI: 'https://ipfs.pixura.io/ipfs/QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH'
  }
}

describe('StorProc', () => {
  /** @type NFTStorage */
  let client
  /** @type StorProc */
  let sp
  /** @type VinylAPI */
  let vy
  /** @type FollowupAPI */
  let fup

  beforeEach(() => {
    client = new NFTStorage({ token: TOKEN })
    vy = new VinylAPI({ endpoint: VINYL_ENDPOINT, username: USERNAME, password: PASSWORD })
    fup = new FollowupAPI({ endpoint: FOLLOWUP_ENDPOINT, username: USERNAME, password: PASSWORD })
    sp = new StorProc({ client, vinyl: vy, followup: fup })
  })

  it('interface', () => {
    assert.strictEqual(typeof StorProc, 'function')
    assert.strictEqual(typeof sp.storeNFT, 'function')
  })

  it('pins a CID', async () => {
    const info = fakeNFTInfo()
    const cid = 'bafybeibcepxovpzwu6ug3ofoyejj3a3z5dqqn6invyiqg3jhuzr27ticp4'
    const metadata = { image: cid }
    const metadataCID = 'QmdM4z5VNWssMUih4UbjFcdDU5FJG6QcA42fobDTqHcWfx'
    const pinStatus = 'pinning'

    let metadataUploaded = false
    mockClientStoreBlob(client, async b => {
      metadataUploaded = true
      const data = await b.text()
      assert.strictEqual(data, JSON.stringify(metadata))
      return metadataCID
    })

    let imagePinned = false
    mockFetch(async (url, init) => {
      imagePinned = true
      assert(typeof url === 'string')
      assert.strictEqual(new URL(url).pathname, '/api/pins')
      assert(init)
      assert.strictEqual(init.method, 'POST')
      const headers = new Headers(init.headers)
      assert.strictEqual(headers.get('Authorization'), `Bearer ${TOKEN}`)
      return new Response(JSON.stringify({ cid, status: pinStatus }))
    })

    let nftAdded = false
    mockVinylAddNFT(vy, async nft => {
      nftAdded = true
      assert.strictEqual(nft.info, info)
      assert.strictEqual(nft.metadata, metadata)
      assert.deepStrictEqual(nft.links, [
        { name: 'metadata.json', cid: metadataCID },
        { name: metadata.image, cid }
      ])
    })

    let followupRegistered = false
    mockFollowupRegister(fup, async pins => {
      followupRegistered = true
      assert.deepStrictEqual(Array.from(pins), [{ cid, status: pinStatus }])
    })

    await sp.storeNFT({ info, metadata })

    assert(metadataUploaded)
    assert(imagePinned)
    assert(nftAdded)
    assert(followupRegistered)
  })

  it('pins an ipfs:// URL asset', async () => {
    const info = fakeNFTInfo()
    const cid = 'bafybeibcepxovpzwu6ug3ofoyejj3a3z5dqqn6invyiqg3jhuzr27ticp4'
    const metadata = { image: `ipfs://${cid}/nft.jpg` }
    const metadataCID = 'QmdM4z5VNWssMUih4UbjFcdDU5FJG6QcA42fobDTqHcWfx'

    let metadataUploaded = false
    mockClientStoreBlob(client, async b => {
      metadataUploaded = true
      const data = await b.text()
      assert.strictEqual(data, JSON.stringify(metadata))
      return metadataCID
    })

    let imagePinned = false
    mockFetch(async (url, init) => {
      imagePinned = true
      assert(typeof url === 'string')
      assert.strictEqual(new URL(url).pathname, '/api/pins')
      assert(init)
      assert.strictEqual(init.method, 'POST')
      const headers = new Headers(init.headers)
      assert.strictEqual(headers.get('Authorization'), `Bearer ${TOKEN}`)
      return new Response(JSON.stringify({ cid, status: 'pinned' }))
    })

    let nftAdded = false
    mockVinylAddNFT(vy, async nft => {
      nftAdded = true
      assert.strictEqual(nft.info, info)
      assert.strictEqual(nft.metadata, metadata)
      assert.deepStrictEqual(nft.links, [
        { name: 'metadata.json', cid: metadataCID },
        { name: metadata.image, cid }
      ])
    })

    await sp.storeNFT({ info, metadata })

    assert(metadataUploaded)
    assert(imagePinned)
    assert(nftAdded)
  })

  it('uploads a https:// URL link', async () => {
    const info = fakeNFTInfo()
    const imageData = `test_NFT_${Date.now()}`
    const imageCID = 'bafybeibcepxovpzwu6ug3ofoyejj3a3z5dqqn6invyiqg3jhuzr27ticp4'
    const metadata = { image: 'https://example.org/nft.jpg' }
    const metadataCID = 'QmdM4z5VNWssMUih4UbjFcdDU5FJG6QcA42fobDTqHcWfx'

    let metadataUploaded = false
    let imageUploaded = false
    mockClientStoreBlob(
      client,
      async b => {
        metadataUploaded = true
        const data = await b.text()
        assert.strictEqual(data, JSON.stringify(metadata))
        return metadataCID
      },
      async b => {
        imageUploaded = true
        const data = await b.text()
        assert.strictEqual(data, imageData)
        return imageCID
      }
    )

    let imageDownloaded = false
    mockFetch(async u => {
      imageDownloaded = true
      assert(typeof u === 'string')
      assert.strictEqual(new URL(u).href, metadata.image)
      return new Response(imageData)
    })

    let nftAdded = false
    mockVinylAddNFT(vy, async nft => {
      nftAdded = true
      assert.strictEqual(nft.info, info)
      assert.strictEqual(nft.metadata, metadata)
      assert.deepStrictEqual(nft.links, [
        { name: 'metadata.json', cid: metadataCID },
        { name: metadata.image, cid: imageCID }
      ])
    })

    await sp.storeNFT({ info, metadata })

    assert(metadataUploaded)
    assert(imageDownloaded)
    assert(imageUploaded)
    assert(nftAdded)
  })

  it('does not upload non http URL link', async () => {
    const info = fakeNFTInfo()
    const metadata = { image: 'ftp://example.org/nft.jpg' }
    const metadataCID = 'QmdM4z5VNWssMUih4UbjFcdDU5FJG6QcA42fobDTqHcWfx'

    let metadataUploaded = false
    mockClientStoreBlob(client, async b => {
      metadataUploaded = true
      const data = await b.text()
      assert.strictEqual(data, JSON.stringify(metadata))
      return metadataCID
    })

    let nftAdded = false
    mockVinylAddNFT(vy, async nft => {
      nftAdded = true
      assert.strictEqual(nft.info, info)
      assert.strictEqual(nft.metadata, metadata)
      assert.deepStrictEqual(nft.links, [
        { name: 'metadata.json', cid: metadataCID }
      ])
    })

    await sp.storeNFT({ info, metadata })

    assert(metadataUploaded)
    assert(nftAdded)
  })
})
