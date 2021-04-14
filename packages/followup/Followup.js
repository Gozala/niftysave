/* eslint-env worker */
import { CID } from 'multiformats/cid'

const MINUTE = 1000 * 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24

export const MAX_AGE = DAY * 7 // if we can't pin it in 7 days it is probably lost forever
export const BACKOFF = MINUTE // time between checks, multiplied by the number of checks

/**
 * @typedef {{
 *  cid: string,
 *  pinStatus: 'queued'|'pinning'|'failed',
 *  checks: number,
 *  updated: Date,
 *  created: Date
 * }} Asset
 */

export class Followup {
  /**
   * @param {{
   *  store: KVNamespace,
   *  client: import('nft.storage').NFTStorage,
   *  vinyl: import('@niftysave/vinyl/api').VinylAPI
   *  maxAge?: number
   * }} config
   */
  constructor ({ store, client, vinyl, maxAge = MAX_AGE }) {
    /**
     * @readonly
     */
    this.store = store
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
    this.maxAge = maxAge
  }

  /**
   * @param {string} cid
   * @param {'queued'|'pinning'|'failed'} pinStatus
   * @returns {Promise<void>}
   */
  async register (cid, pinStatus) {
    validateAssetCID(cid)
    validatePinStatus(pinStatus)

    const exists = await this.store.get(cid)
    if (exists != null) return // already following up

    const now = new Date()
    /** @type {Asset} */
    const info = { cid, pinStatus, checks: 0, updated: now, created: now }
    await this.store.put(cid, '', { metadata: info })
  }

  /**
   * Follow-up on the next n assets.
   * @param {number} limit
   */
  async followup (limit = 10) {
    const assets = await this.getNextAssets(limit)
    /** @type {Error[]} */
    const errors = []
    for (const asset of assets) {
      try {
        await this.followupAsset(asset)
      } catch (err) {
        err.message = `follow-up on ${asset.cid}: ${err.message}`
        errors.push(err)
      }
    }
    if (errors.length) {
      // eslint-disable-next-line no-undef
      throw new AggregateError(errors, 'follow-up failures')
    }
  }

  /**
   * Fetch the next n assets to follow up on.
   * @private
   * @param {number} limit
   * @returns {Promise<Asset[]>}
   */
  async getNextAssets (limit) {
    /** @type {Asset[]} */
    const assets = []
    let cursor
    const now = Date.now()
    while (true) {
      // @ts-ignore
      const list = await this.store.list({ limit: 1000, cursor })
      for (const key of list.keys) {
        const asset = {
          cid: key.name,
          pinStatus: key.metadata.pinStatus,
          checks: key.metadata.checks,
          updated: new Date(key.metadata.updated),
          created: new Date(key.metadata.created)
        }
        if (now - asset.updated.getTime() > (asset.checks * BACKOFF)) {
          assets.push(asset)
        }
        if (assets.length >= limit) {
          break
        }
      }
      if (assets.length >= limit || list.list_complete) {
        break
      }
      cursor = list.cursor
    }
    return assets
  }

  /**
   * @private
   * @param {Asset} asset
   * @returns {boolean}
   */
  isExpired (asset) {
    return Date.now() - asset.created.getTime() > this.maxAge
  }

  /**
   * @private
   * @param {Asset} asset
   */
  async followupAsset (asset) {
    let pinStatus, size
    try {
      const status = await this.client.status(asset.cid)
      pinStatus = status.pin.status
      size = status.size
    } catch (err) {
      if (this.isExpired(asset)) {
        await this.vinyl.updateAsset(asset.cid, { pinStatus: 'failed', size: size || 0 })
        await this.store.delete(asset.cid)
      } else {
        await this.store.put(asset.cid, '', {
          metadata: { ...asset, checks: asset.checks + 1, updated: new Date() }
        })
      }
      err.message = `fetching status: ${err.message}`
      throw err
    }

    try {
      switch (pinStatus) {
        case 'pinned':
        case 'failed':
          await this.vinyl.updateAsset(asset.cid, { pinStatus, size })
          // TODO: retry on fail?
          await this.store.delete(asset.cid)
          break
        default:
          if (this.isExpired(asset)) {
            await this.vinyl.updateAsset(asset.cid, { pinStatus: 'failed', size })
            await this.store.delete(asset.cid)
            break
          }
          if (pinStatus !== asset.pinStatus) {
            await this.vinyl.updateAsset(asset.cid, { pinStatus, size })
          }
          await this.store.put(asset.cid, '', {
            metadata: { ...asset, checks: asset.checks + 1, updated: new Date(), pinStatus }
          })
      }
    } catch (err) {
      err.message = `updating pin status: ${pinStatus} size: ${size} info: ${err.message}`
      throw err
    }
  }
}

/**
 * @param {string} cid
 */
function validateAssetCID (cid) {
  try {
    CID.parse(cid)
  } catch (err) {
    throw new Error(`invalid asset CID: ${cid}: ${err.message}`)
  }
}

/**
 * @param {string} status
 */
function validatePinStatus (status) {
  // asset must not yet be pinned already
  if (!['queued', 'pinning', 'failed'].includes(status)) {
    throw new Error(`invalid pin status: ${status}`)
  }
}
