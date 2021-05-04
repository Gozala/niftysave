import * as Scanner from "./scanner.js"
import { timeBudget } from "../env.js"

export { Scanner }

/**
 * Task is active if it has not finished yet and if it has not been
 * updated with-in a time budget.
 *
 * @param {Scanner.State} state
 */
export const isActive = state =>
  !state.done && Date.now() - state.updateTime >= timeBudget

/**
 * @param {Scanner.Options} options
 * @returns {Scanner.State}
 */
export const init = ({ cursor, searchSize }) => ({
  done: false,
  cursor,
  searchSize,
  attempt: 1,
  startTime: Date.now(),
  updateTime: Date.now(),
})

/**
 * @param {Scanner.State} state
 * @returns {Scanner.State}
 */
export const updateTime = state => ({
  ...state,
  updateTime: Date.now(),
})
/**
 * @param {Scanner.State} state
 * @param {string} reason
 * @returns {Scanner.Done}
 */
export const fail = (state, reason) => ({
  ...state,
  done: true,
  updateTime: Date.now(),
  result: { ok: false, error: reason },
})

/**
 * @param {Scanner.State} state - Stat of the scraper
 * @param {string} cursor - cursor to continue from next
 * @param {number} added - number of tokens added
 * @returns {Scanner.State}
 */
export const succeed = (state, cursor, added) => ({
  ...state,
  done: true,
  updateTime: Date.now(),
  result: { ok: true, value: { cursor, added } },
})

/**
 *
 * @param {Scanner.State} state
 * @returns {Scanner.State}
 */
export const retry = ({ cursor, searchSize, attempt }) => ({
  done: false,
  cursor,
  searchSize,
  attempt: attempt + 1,
  startTime: Date.now(),
  updateTime: Date.now(),
})
