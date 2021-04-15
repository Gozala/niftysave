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
   * @param {import('./Vinyl').Link[]} links Links to assets referenced by the metadata.
   * @returns {Promise<void>}
   */
  async addNFT (info, metadata, links) {
    const url = new URL('/api/nft', this.endpoint)
    const res = await fetch(url.toString(), {
      method: 'POST',
      body: JSON.stringify({ info, metadata, links })
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`${res.status} status registering ${info.chain} token: ${info.tokenID} contract: ${info.contract} response: ${text}`)
    }
    return res.json()
  }

  /**
   * @param {import('./Vinyl').Pin} pin
   */
  async updatePin (pin) {
    const url = new URL(`/api/pin/${encodeURIComponent(pin.cid)}`, this.endpoint)
    const res = await fetch(url.toString(), {
      method: 'POST',
      body: JSON.stringify({ status: pin.status, size: pin.size })
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`${res.status} status updating pin ${pin.cid} response: ${text}`)
    }
    return res.json()
  }
}
