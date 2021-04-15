/* eslint-env worker */

export class FollowupAPI {
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
   * @param {import('./Followup').AssetReg[]} assets
   * @returns {Promise<void>}
   */
  async register (assets) {
    const url = new URL('/api/register', this.endpoint)
    const res = await fetch(url.toString(), {
      method: 'POST',
      body: JSON.stringify(assets)
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`${res.status} status registering follow-up(s): ${text}`)
    }
    return res.json()
  }
}
