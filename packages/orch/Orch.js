/* eslint-env worker */

const MAX_EPOCHS = 100

/**
 * @typedef {{ lastEpoch: number }} ChainState
 * @typedef {Record<string, ChainState>} State
 */

export class Orch {
  /**
   * @param {{
   *  store: KVNamespace,
   *  storProc: import('@niftysave/storproc/api').StorProcAPI,
   * }} config
   */
  constructor ({ store, storProc }) {
    /**
     * @readonly
     */
    this.store = store
    /**
     * @readonly
     */
    this.storProc = storProc
  }

  /**
   * @private
   * @returns {Promise<State>}
   */
  async getState () {
    /** @type State | null */
    const state = await this.store.get('state', 'json')
    return state || { eth: { lastEpoch: 0 } }
  }

  async run () {
    const state = await this.getState()
    const chainStates = Array.from(Object.values(state))
  }
}
