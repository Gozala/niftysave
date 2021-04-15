/* eslint-env worker */

export class Orch {
  /**
   * @param {{
   *  store: KVNamespace,
   *  storProc: import('@niftysave/storproc/api').StorProcAPI,
   *  vinyl: import('@niftysave/vinyl/api').VinylAPI,
   *  followup: import('@niftysave/followup/api').FollowupAPI,
   * }} config
   */
  constructor ({ store, storProc, vinyl, followup }) {
    /**
     * @readonly
     */
    this.store = store
    /**
     * @readonly
     */
    this.storProc = storProc
    /**
     * @readonly
     */
    this.vinyl = vinyl
    /**
     * @readonly
     */
    this.followup = followup
  }

  async run () {
    const state = this.store.get('state')
  }
}
