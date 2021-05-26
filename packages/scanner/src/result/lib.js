import * as Result from "./result.js"

export { Result }

/**
 * @template T
 * @param {T} value
 * @returns {Result.Success<T>}
 */
export const ok = value => ({ value, ok: true })

/**
 * @template X
 * @param {X} error
 * @returns {Result.Failure<X>}
 */
export const error = error => ({ error, ok: false })

/**
 * @template X, T
 * @param {Result.Result<X, T>} result
 * @returns {T}
 */
export const value = result => {
  if (result.ok) {
    return result.value
  } else {
    throw result.error
  }
}
