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
export const init = ({ id, searchSize }) => ({
  done: false,
  id,
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
 *
 * @param {Scanner.State} state
 * @param {number} next
 * @param {number} count
 * @returns {Scanner.State}
 */
export const succeed = (state, next, count) => ({
  ...state,
  done: true,
  updateTime: Date.now(),
  result: { ok: true, value: { next, n: count } },
})

/**
 *
 * @param {Scanner.State} state
 * @returns {Scanner.State}
 */
export const retry = ({ id, searchSize, attempt }) => ({
  done: false,
  id,
  searchSize,
  attempt: attempt + 1,
  startTime: Date.now(),
  updateTime: Date.now(),
})

/**
 *
 * @param {Scanner.State} state
 * @returns {string}
 */
export const stateKey = ({ id, attempt }) => `eip-721:${id}`

/**
 * @param {Scanner.State} param0
 * @returns {string}
 */
export const tokenKey = ({ id }) => `eip-721:${id}`
