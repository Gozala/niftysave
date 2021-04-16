/* eslint-env worker */
import { CID } from 'multiformats/cid'

/**
 * @typedef {{
 *  chain: 'eth',
 *  contract: string,
 *  tokenID: string,
 *  tokenURI: string
 * }} EthNFTInfo
 * @typedef {EthNFTInfo} NFTInfo
 * @typedef {{
 *  cid: string,
 *  status: import('./types/psa').Status,
 *  size?: number
 * }} Pin
 * @typedef {Record<string, any>} Metadata NFT metadata (usually in ERC-721 or ERC-1155 format).
 * @typedef {{ name: string, cid?: string }} Link Links to assets referenced by the metadata.
 * @typedef {{ info: NFTInfo, metadata: Metadata, links: Link[] }} NFT Information about the NFT.
 */

const PIN_STATUSES = Object.freeze(['queued', 'pinning', 'pinned', 'failed'])

export class Vinyl {
  /**
   * TODO: save to a PostgreSQL
   * @param {{ nftStore: KVNamespace, pinStore: KVNamespace }} config
   */
  constructor ({ nftStore, pinStore }) {
    /**
     * @readonly
     */
    this.nftStore = nftStore
    /**
     * @readonly
     */
    this.pinStore = pinStore
  }

  /**
   * @param {NFT} nft Information about the NFT
   */
  async addNFT (nft) {
    validateNFT(nft)
    const rootKey = getRootKey(nft.info)
    await this.nftStore.put(rootKey, JSON.stringify(nft))
  }

  /**
   * @param {Pin} pin
   */
  async updatePin (pin) {
    validatePin(pin)
    const key = `${pin.status}/${pin.cid}`
    const exists = await this.pinStore.get(key)
    if (exists != null) return
    await this.pinStore.put(key, '', { metadata: { size: pin.size } })
  }
}

/**
 * FIXME: is this unique?
 * @param {NFTInfo} info
 * @returns {string}
 */
const getRootKey = info => [info.chain, info.contract, info.tokenID].join('/')

/**
 * @param {NFT} nft
 */
function validateNFT (nft) {
  if (nft == null || typeof nft !== 'object') {
    throw new Error('invalid NFT')
  }
  validateNFTInfo(nft.info)
  if (!Array.isArray(nft.links)) {
    throw new Error('invalid NFT links')
  }
  nft.links.forEach(validateLink)
}

/**
 * @param {NFTInfo} info
 */
function validateNFTInfo (info) {
  if (info == null || typeof info !== 'object') {
    throw new Error(`invalid NFT info: ${info}`)
  }
  if (info.chain !== 'eth') throw new Error(`unsupported chain: ${info.chain}`)
  if (!info.contract) throw new Error('missing contract hash')
  if (!info.tokenID) throw new Error('missing token ID')
}

/**
 * @param {string} cid
 */
function validateCID (cid) {
  try {
    CID.parse(cid)
  } catch (err) {
    throw new Error(`invalid CID: ${cid}: ${err.message}`)
  }
}

/**
 * @param {Pin} pin
 */
function validatePin (pin) {
  if (pin == null || typeof pin !== 'object') {
    throw new Error(`invalid pin: ${pin}`)
  }
  validateCID(pin.cid)
  if (!PIN_STATUSES.includes(pin.status)) {
    throw new Error(`invalid status: ${pin.status}`)
  }
  if (pin.size != null && (typeof pin.size !== 'number' || pin.size <= 0)) {
    throw new Error(`invalid size: ${pin.size}`)
  }
}

/**
 * @param {Link} link
 */
function validateLink (link) {
  if (link == null || typeof link !== 'object') {
    throw new Error('invalid link')
  }
  if (link.cid != null) {
    validateCID(link.cid)
  }
  if (!link.name || typeof link.name !== 'string') {
    throw new Error('invalid link name')
  }
}
