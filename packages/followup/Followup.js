/* eslint-env worker */
import { CID } from 'multiformats/cid'

const MINUTE = 1000 * 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24

export const MAX_AGE = DAY * 7 // if we can't pin it in 7 days it is probably lost forever
export const BACKOFF = MINUTE // time between checks, multiplied by the number of checks

/**
 * @typedef {'queued'|'pinning'|'failed'} PendingStatus
 * @typedef {{ cid: string, status: PendingStatus }} PendingPin
 * @typedef {{ cid: string, status: PendingStatus, checks: number, updated: Date, created: Date }} FollowingPin
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
   * @param {Iterable<PendingPin>} pins
   * @returns {Promise<void>}
   */
  async register (pins) {
    for (const pin of pins) {
      validatePin(pin)
    }
    for (const pin of pins) {
      const exists = await this.store.get(pin.cid)
      if (exists != null) return // already following up

      const now = new Date()
      /** @type {FollowingPin} */
      const info = { cid: pin.cid, status: pin.status, checks: 0, updated: now, created: now }
      await this.store.put(pin.cid, '', { metadata: info })
    }
  }

  /**
   * Follow-up on the next n assets.
   * @param {number} limit
   */
  async followup (limit = 25) {
    const pins = await this.getNextPins(limit)
    /** @type {Error[]} */
    const errors = []
    for (const pin of pins) {
      try {
        await this.followupPin(pin)
      } catch (err) {
        err.message = `follow-up on ${pin.cid}: ${err.message}`
        errors.push(err)
      }
    }
    if (errors.length) {
      // eslint-disable-next-line no-undef
      throw new AggregateError(errors, 'follow-up failures')
    }
  }

  /**
   * Fetch the next n pins to follow up on.
   * @private
   * @param {number} limit
   * @returns {Promise<FollowingPin[]>}
   */
  async getNextPins (limit) {
    /** @type {FollowingPin[]} */
    const pins = []
    let cursor
    const now = Date.now()
    while (true) {
      // @ts-ignore
      const list = await this.store.list({ limit: 1000, cursor })
      for (const key of list.keys) {
        const pin = {
          cid: key.name,
          status: key.metadata.pinStatus,
          checks: key.metadata.checks,
          updated: new Date(key.metadata.updated),
          created: new Date(key.metadata.created)
        }
        if (now - pin.updated.getTime() > (pin.checks * BACKOFF)) {
          pins.push(pin)
        }
        if (pins.length >= limit) {
          break
        }
      }
      if (pins.length >= limit || list.list_complete) {
        break
      }
      cursor = list.cursor
    }
    return pins
  }

  /**
   * @private
   * @param {FollowingPin} pin
   * @returns {boolean}
   */
  isExpired (pin) {
    return Date.now() - pin.created.getTime() > this.maxAge
  }

  /**
   * @private
   * @param {FollowingPin} pin
   */
  async followupPin (pin) {
    let status, size
    try {
      const res = await this.client.status(pin.cid)
      status = res.pin.status
      size = res.size
    } catch (err) {
      if (this.isExpired(pin)) {
        await this.vinyl.updatePin({ cid: pin.cid, status: 'failed', size: 0 })
        await this.store.delete(pin.cid)
      } else {
        await this.store.put(pin.cid, '', {
          metadata: { ...pin, checks: pin.checks + 1, updated: new Date() }
        })
      }
      err.message = `fetching status: ${err.message}`
      throw err
    }

    try {
      switch (status) {
        case 'pinned':
        case 'failed':
          await this.vinyl.updatePin({ cid: pin.cid, status, size })
          // TODO: retry on fail?
          await this.store.delete(pin.cid)
          break
        default:
          if (this.isExpired(pin)) {
            await this.vinyl.updatePin({ cid: pin.cid, status: 'failed', size: 0 })
            await this.store.delete(pin.cid)
            break
          }
          if (status !== pin.status) {
            await this.vinyl.updatePin({ cid: pin.cid, status, size })
          }
          await this.store.put(pin.cid, '', {
            metadata: { ...pin, checks: pin.checks + 1, updated: new Date(), status }
          })
      }
    } catch (err) {
      err.message = `updating pin status: ${status} size: ${size} info: ${err.message}`
      throw err
    }
  }
}

/**
 * @param {PendingPin} pin 
 */
function validatePin (pin) {
  validateCID(pin.cid)
  validatePinStatus(pin.status)
}

/**
 * @param {string} cid
 */
function validateCID (cid) {
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
