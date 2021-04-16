/* eslint-env worker */
/* global AggregateError */
import { NFTStorage, Blob } from 'nft.storage'
import { CID } from 'multiformats/cid'

/**
 * Max number of links an NFT is allowed to have.
 */
const MAX_LINKS = 10

/**
 * @typedef {{
 *   info: import('@niftysave/vinyl/api').NFTInfo,
 *   metadata: import('@niftysave/vinyl/api').Metadata
 * }} FoundNFT
 */

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
   * @param {FoundNFT} nft Information about an NFT found on a blockchain.
   * @returns {Promise<void>}
   */
  async storeNFT (nft) {
    validateFoundNFT(nft)
    const metadataLink = {
      name: 'metadata.json',
      cid: await this.client.storeBlob(new Blob([JSON.stringify(nft.metadata)]))
    }
    const links = [metadataLink, ...getLinks(nft.metadata)]
    /** @type import('@niftysave/followup/api').PendingPin[] */
    const pendingPins = []
    try {
      /** @type Error[] */
      const errors = []
      if (links.length > MAX_LINKS + 1) {
        errors.push(new Error(`exceeded maximum number of links: ${links.length - 1}`))
      }
      for (const link of links.slice(1, MAX_LINKS + 1)) {
        try {
          const { cid, status } = await this.pin(link)
          if (status !== 'pinned') {
            pendingPins.push({ cid, status })
          }
          link.cid = cid
        } catch (err) {
          err.message = `pinning ${link}: ${err.message}`
          errors.push(err)
          console.warn(err)
          continue
        }
      }
      if (errors.length) {
        throw new AggregateError(errors, 'pinning links')
      }
    } finally {
      await this.vinyl.addNFT({ ...nft, links })
      if (pendingPins.length) {
        await this.followup.register(pendingPins)
      }
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

/**
 * @param {FoundNFT} nft
 */
function validateFoundNFT (nft) {
  if (nft == null || typeof nft !== 'object') {
    throw new Error('invalid NFT')
  }
  if (nft.metadata == null || typeof nft.metadata !== 'object') {
    throw new Error('missing or invalid NFT metadata')
  }
}
