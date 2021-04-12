/* eslint-env worker */

export class VinylAPI {
  /**
   * @param {{ endpoint: URL, username: string, password: string }} config
   */
  constructor ({ endpoint, username, password }) {
    /**
     * VinylAPI API root.
     * @type URL
     * @readonly
     */
    this.endpoint = endpoint
    /**
     * Basic auth username.
     * @type string
     * @readonly
     */
    this.username = username
    /**
     * Basic auth password.
     * @type string
     * @readonly
     */
    this.password = password
  }

  /**
   * @param {import('./Vinyl').NFTInfo} info Information about the NFT
   * @param {any} metadata NFT metadata (usually in ERC-721 or ERC-1155 format).
   * @param {{ [cid: string]: import('./Vinyl').AssetInfo }} assets Assets referenced by the metadata.
   * @returns {Promise<void>}
   */
  async register (info, metadata, assets) {
    const url = new URL('/api/register', this.endpoint)
    const res = await fetch(url.toString(), {
      method: 'POST',
      body: JSON.stringify({ info, metadata, assets })
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`${res.status} status registering ${info.chain} token: ${info.tokenID} contract: ${info.contract} response: ${text}`)
    }
    return res.json()
  }

  /**
   * @param {string} cid
   * @param {import('./Vinyl').AssetInfo} info
   */
  async updateAsset (cid, info) {
    const url = new URL(`/api/asset/${encodeURIComponent(cid)}`, this.endpoint)
    const res = await fetch(url.toString(), {
      method: 'POST',
      body: JSON.stringify({ info })
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`${res.status} status updating asset ${cid} response: ${text}`)
    }
    return res.json()
  }
}
