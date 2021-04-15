/* eslint-env worker */
import { NFTStorage } from 'nft.storage'
import { CID } from 'multiformats/cid'

export class StorProc {
  /**
   * @param {{
   *   client: NFTStorage,
   *   vinyl: import('@niftysave/vinyl/api').VinylAPI,
   *   followup: import('@niftysave/followup/api').FollowupAPI
   * }} config
   */
  constructor ({ client, vinyl, followup }) {
    /**
     * @readonly
     */
    this.client = client
    /**
     * @readonly
     */
    this.vinyl = vinyl
    /**
     * @readonly
     */
    this.followup = followup
  }

  /**
   * @param {import('@niftysave/vinyl/api').NFTInfo} info Information about the NFT.
   * @param {any} metadata NFT metadata (usually in ERC-721 or ERC-1155 format).
   * @returns {Promise<void>}
   */
  async store (info, metadata) {
    const metadataLink = {
      name: 'metadata.json',
      cid: await this.client.storeBlob(new Blob([JSON.stringify(metadata)]))
    }
    const links = [
      metadataLink,
      ...getLinks(metadata)
    ]
    await this.vinyl.addNFT(info, metadata, links)
    /** @type import('@niftysave/vinyl/api').Pin[] */
    const pins = []
    try {
      for (const link of links.slice(1)) {
        try {
          const pin = await this.pin(link)
          pins.push(pin)
        } catch (err) {
          console.warn('failed to store link', link, err)
          continue
        }
      }
    } finally {
      await this.followup.register(pins.filter(p => p.status !== 'pinned'))
    }
  }

  /**
   * @private
   * @param {import('@niftysave/vinyl/api').Link} link Link to an asset to store, could be a CID or a URL.
   * @returns {Promise<import('@niftysave/vinyl/api').Pin>}
   */
  async pin (link) {
    if (link.cid) {
      const url = new URL('/api/pins', this.client.endpoint)
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: NFTStorage.auth(this.client.token),
        body: JSON.stringify({ cid: link.cid })
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`${res.status} status fetching asset: ${url} response: ${text}`)
      }
      /** @type import('./types/psa').PinStatus */
      const pinStatus = await res.json()
      return { cid: link.cid, status: pinStatus.status }
    }

    let url
    try {
      url = new URL(link.name)
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
    const cid = await this.client.storeBlob(data)
    return { cid, status: 'pinned' }
  }
}

/**
 * @param {any} obj
 * @returns {import('@niftysave/vinyl/api').Link[]}
 */
function getLinks (obj) {
  if (Array.isArray(obj)) {
    return obj.map(getLinks).flat()
  }
  if (typeof obj === 'string') {
    const link = getLink(obj)
    return link ? [link] : []
  }
  if (typeof obj === 'object') {
    return Object.values(obj).map(getLinks).flat()
  }
  return []
}

/**
 * @param {string} str
 * @returns {import('@niftysave/vinyl/api').Link | null}
 */
function getLink (str) {
  if (str.startsWith('ipfs://') || str.startsWith('https://') || str.startsWith('http://') || str.startsWith('/ipfs') || isCID(str)) {
    const cid = str.split('/').find(isCID)
    return cid ? { name: str, cid } : { name: str }
  }
  return null
}

/**
 * @param {string} str
 * @returns {boolean}
 */
function isCID (str) {
  try {
    CID.parse(str)
    return true
  } catch (_) {
    return false
  }
}
