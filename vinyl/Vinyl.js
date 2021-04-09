/* eslint-env worker */

/**
 * @typedef {{
 *  chain: 'eth',
 *  contract: string,
 *  tokenID: string,
 *  tokenURI: string
 * }} EthNFTInfo
 * @typedef {EthNFTInfo} NFTInfo
 * @typedef {{ pinStatus: import('./types/psa').Status, size: number }} AssetInfo
 */

export class Vinyl {
  /**
   * TODO: save to a PostgreSQL
   * @param {{ store: KVNamespace }} config
   */
  constructor ({ store }) {
    /**
     * @readonly
     */
    this.store = store
  }

  /**
   * @param {NFTInfo} info Information about the NFT
   * @param {any} metadata NFT metadata (usually in ERC-721 or ERC-1155 format).
   * @param {{ [cid: string]: AssetInfo }} assets Assets referenced by the metadata.
   * @returns {Promise<void>}
   */
  async register (info, metadata, assets) {
    const rootKey = getRootKey(info)
    await Promise.all([
      this.store.put(`info:${rootKey}`, JSON.stringify(info)),
      this.store.put(`metadata:${rootKey}`, JSON.stringify(metadata)),
      this.store.put(`assets:${rootKey}`, JSON.stringify(Object.keys(assets))),
      ...Object.entries(assets).map(async ([cid, info]) => {
        const exists = await this.store.get(`asset:pinned:${cid}`)
        if (exists) return
        await this.store.put(`asset:${info.pinStatus}:${cid}`, JSON.stringify(info), { metadata: { size: info.size } })
      })
    ])
  }

  /**
   * @param {string} cid
   * @param {AssetInfo} info
   */
  async updateAsset (cid, info) {
    const existingData = (await Promise.all([
      this.store.get(`asset:pinned:${cid}`),
      this.store.get(`asset:pinning:${cid}`),
      this.store.get(`asset:queued:${cid}`),
      this.store.get(`asset:failed:${cid}`)
    ])).find(Boolean)

    if (!existingData) throw new Error(`not found: ${cid}`)

    /** @type AssetInfo */
    const existing = JSON.parse(existingData)
    if (existing.pinStatus === info.pinStatus) return

    await this.store.put(`asset:${info.pinStatus}:${cid}`, JSON.stringify(info), { metadata: { size: info.size } })
    await this.store.delete(`asset:${existing.pinStatus}:${cid}`)
  }
}

/**
 * FIXME: is this unique?
 * @param {NFTInfo} info
 * @returns {string}
 */
function getRootKey (info) {
  if (info.chain !== 'eth') throw new Error(`unsupported chain: ${info.chain}`)
  if (!info.contract) throw new Error('missing contract hash')
  if (!info.tokenID) throw new Error('missing token ID')
  return [info.chain, info.contract, info.tokenID].join(':')
}
