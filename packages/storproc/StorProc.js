/* eslint-env worker */
import { NFTStorage } from 'nft.storage'
import { CID } from 'multiformats/cid'

/** @typedef {{ cid: string, pinStatus: import('./types/psa').Status }} StoreResult */

export class StorProc {
  /**
   * @param {{ client: NFTStorage }} config
   */
  constructor ({ client }) {
    /**
     * @readonly
     */
    this.client = client
  }

  /**
   * @param {string} asset Asset to store, could be a CID or a URL.
   * @returns {Promise<StoreResult>}
   */
  async store (asset) {
    if (!asset) {
      throw new Error('missing asset URL or CID')
    }
    if (typeof asset !== 'string') {
      throw new Error('invalid asset')
    }

    let cid = asset.split('/').find(p => {
      try {
        return CID.parse(p)
      } catch (_) {
        return false
      }
    })
    if (cid) {
      const url = new URL('/api/pins', this.client.endpoint)
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: NFTStorage.auth(this.client.token),
        body: JSON.stringify({ cid })
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`${res.status} status fetching asset: ${url} response: ${text}`)
      }
      /** @type import('./types/psa').PinStatus */
      const pinStatus = await res.json()
      return { cid, pinStatus: pinStatus.status }
    }

    let url
    try {
      url = new URL(asset)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('not a HTTP URL')
      }
    } catch (err) {
      throw new Error(`invalid URL: ${err.message}`)
    }
    const res = await fetch(url.toString())
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`${res.status} status fetching asset: ${url} response: ${text}`)
    }
    const data = await res.blob()
    cid = await this.client.storeBlob(data)
    return { cid, pinStatus: 'pinned' }
  }
}
