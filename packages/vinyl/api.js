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
   * @param {import('./Vinyl').NFT} nft NFT to add.
   * @returns {Promise<void>}
   */
  async addNFT (nft) {
    const url = new URL('/api/nft', this.endpoint)
    const res = await fetch(url.toString(), {
      method: 'POST',
      body: JSON.stringify(nft)
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`${res.status} status adding NFT: ${text}`)
    }
    return res.json()
  }

  /**
   * @param {import('./Vinyl').Pin} pin Pin information to update.
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
