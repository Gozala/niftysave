/* eslint-env worker */

export class StorProcAPI {
  /**
   * @param {{ endpoint: URL, username: string, password: string }} config
   */
  constructor ({ endpoint, username, password }) {
    /**
     * StorProc API root.
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
   * @param {import('./StorProc').FoundNFT} nft Information about an NFT found on a blockchain.
   * @returns {Promise<void>}
   */
  async storeNFT (nft) {
    const url = new URL('/api/nft', this.endpoint)
    const res = await fetch(url.toString(), {
      method: 'POST',
      body: JSON.stringify(nft)
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`${res.status} status storing NFT: ${text}`)
    }
    return res.json()
  }
}
