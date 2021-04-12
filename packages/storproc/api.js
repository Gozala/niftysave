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
   * @param {string} asset Asset to store.
   * @returns {Promise<import('./StorProc').StoreResult>}
   */
  async store (asset) {
    const url = new URL('/api/store', this.endpoint)
    const res = await fetch(url.toString(), {
      method: 'POST',
      body: JSON.stringify({ asset })
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`${res.status} status storing: ${asset} response: ${text}`)
    }
    return res.json()
  }
}
