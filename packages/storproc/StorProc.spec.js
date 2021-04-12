/* eslint-env mocha */
import assert from 'assert'
import { NFTStorage } from 'nft.storage'
import { Headers, Response } from '@web-std/fetch'
import { StorProc } from './StorProc.js'

const TOKEN = 'secret'

/** @typedef {(url: RequestInfo, init: RequestInit) => Promise<Response>} Fetch */

/** @type {Fetch} */
global.fetch = () => { throw new Error('missing fetch implementation') }

/**
 * @param {Fetch[]} calls
 */
function mockFetch (...calls) {
  global.fetch = async (url, init) => {
    const call = calls.shift()
    if (call == null) throw new Error(`unexpected fetch request: ${url}`)
    return call(url, init)
  }
}

/**
 * @param {NFTStorage} client
 * @param  {...((b: Blob) => Promise<string>)} calls
 */
function mockClientStoreBlob (client, ...calls) {
  client.storeBlob = async b => {
    const call = calls.shift()
    if (call == null) throw new Error(`unexpected storeBlob call: ${b}`)
    return call(b)
  }
}

describe('StorProc', () => {
  /** @type NFTStorage */
  let client
  /** @type StorProc */
  let sp

  beforeEach(() => {
    client = new NFTStorage({ token: TOKEN })
    sp = new StorProc({ client })
  })

  it('interface', () => {
    assert.strictEqual(typeof StorProc, 'function')
    assert.strictEqual(typeof sp.store, 'function')
  })

  it('error missing asset', async () => {
    // @ts-ignore
    await assert.rejects(sp.store(), { message: 'missing asset URL or CID' })
  })

  it('error non-string asset', async () => {
    // @ts-ignore
    await assert.rejects(sp.store(138), { message: 'invalid asset' })
  })

  it('pins a CID asset', async () => {
    const cid = 'bafybeibcepxovpzwu6ug3ofoyejj3a3z5dqqn6invyiqg3jhuzr27ticp4'
    const asset = cid
    const pinStatus = 'pinning'

    mockFetch(async (url, init) => {
      assert(typeof url === 'string')
      assert.strictEqual(new URL(url).pathname, '/api/pins')
      assert(init)
      assert.strictEqual(init.method, 'POST')
      const headers = new Headers(init.headers)
      assert.strictEqual(headers.get('Authorization'), `Bearer ${TOKEN}`)
      return new Response(JSON.stringify({ cid, status: pinStatus }))
    })

    const res = await sp.store(asset)
    assert.strictEqual(res.cid, cid)
    assert.strictEqual(res.pinStatus, pinStatus)
  })

  it('pins an ipfs:// URL asset', async () => {
    const cid = 'bafybeibcepxovpzwu6ug3ofoyejj3a3z5dqqn6invyiqg3jhuzr27ticp4'
    const asset = `ipfs://${cid}/nft.jpg`
    const pinStatus = 'pinning'

    mockFetch(async (url, init) => {
      assert(typeof url === 'string')
      assert.strictEqual(new URL(url).pathname, '/api/pins')
      assert(init)
      assert.strictEqual(init.method, 'POST')
      const headers = new Headers(init.headers)
      assert.strictEqual(headers.get('Authorization'), `Bearer ${TOKEN}`)
      return new Response(JSON.stringify({ cid, status: pinStatus }))
    })

    const res = await sp.store(asset)
    assert.strictEqual(res.cid, cid)
    assert.strictEqual(res.pinStatus, pinStatus)
  })

  it('uploads a https:// URL asset', async () => {
    const cid = 'bafybeibcepxovpzwu6ug3ofoyejj3a3z5dqqn6invyiqg3jhuzr27ticp4'
    const url = 'https://example.org/nft.jpg'
    const data = `test_NFT_${Date.now()}`
    const asset = url
    const pinStatus = 'pinned'

    mockFetch(async u => {
      assert(typeof u === 'string')
      assert.strictEqual(new URL(u).href, url)
      return new Response(data)
    })

    mockClientStoreBlob(client, async b => {
      const text = await b.text()
      assert.strictEqual(text, data)
      return cid
    })

    const res = await sp.store(asset)

    assert.strictEqual(res.cid, cid)
    assert.strictEqual(res.pinStatus, pinStatus)
  })

  it('error non http URL asset', async () => {
    const asset = 'ftp://example.org/nft.jpg'
    await assert.rejects(sp.store(asset), { message: 'invalid URL: not a HTTP URL' })
  })
})
