export interface State {
  /**
   * Block number been scanned
   */
  blockNumber: number
  /**
   * Last scanned id (used to query graph from this
   * id on).
   */
  lastId: string
  /**
   * Time this scan started
   */
  startTime: number
  /**
   * Time this scan was last updated.
   */
  updateTime: number
  /**
   * Time this can was complete at or `null` if it is
   * not yet complete.
   */
  endTime: number | null
}
