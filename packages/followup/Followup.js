/* eslint-env worker */
import CID from 'multiformats/cid'

const HOUR = 1000 * 60 * 60
const MAX_AGE = 4 * HOUR

/**
 * @typedef {{ pinStatus: 'queued'|'pinning'|'failed', registeredAt: Date }} FollowupMeta
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

    // asset must not yet be pinned already
    if (!['queued', 'pinning', 'failed'].includes(pinStatus)) {
      throw new Error(`invalid pin status: ${pinStatus}`)
    }

    const exists = await this.store.get(cid)
    if (exists != null) return // already following up

    /** @type {FollowupMeta} */
    const metadata = { pinStatus, registeredAt: new Date() }
    await this.store.put(cid, '', { metadata })
  }

  async followup () {
    const list = await this.store.list({ limit: 10 })
    for (const key of list.keys) {
      const cid = key.name
      if (key.metadata == null) {
        console.warn('missing metadata', cid)
        continue
      }

      /** @type {FollowupMeta} */
      // @ts-ignore
      const metadata = { ...key.metadata, registeredAt: new Date(key.metadata.registeredAt) }

      let assetPinStatus, assetSize
      try {
        const status = await this.client.status(cid)
        assetPinStatus = status.pin.status
        assetSize = status.size
      } catch (err) {
        console.error('fetching status', cid, err)
        if (Date.now() - metadata.registeredAt.getTime() > this.maxAge) {
          await this.vinyl.updateAsset(cid, { pinStatus: 'failed', size: assetSize })
          await this.store.delete(cid)
        }
        continue
      }

      try {
        switch (assetPinStatus) {
          case 'pinned':
          case 'failed':
            await this.vinyl.updateAsset(cid, { pinStatus: assetPinStatus, size: assetSize })
            // TODO: retry on fail?
            await this.store.delete(cid)
            break
          default:
            // too old, remove
            if (Date.now() - metadata.registeredAt.getTime() > this.maxAge) {
              await this.vinyl.updateAsset(cid, { pinStatus: 'failed', size: assetSize })
              await this.store.delete(cid)
            } else {
              if (assetPinStatus !== metadata.pinStatus) {
                await this.vinyl.updateAsset(cid, { pinStatus: assetPinStatus, size: assetSize })
              }
              await this.store.put(cid, '', { metadata: { ...metadata, pinStatus: assetPinStatus } })
            }
        }
      } catch (err) {
        console.error('updating asset info', cid, assetPinStatus, assetSize)
        continue
      }
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
