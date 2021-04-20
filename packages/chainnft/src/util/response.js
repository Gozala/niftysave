import * as result from "../result.js"

/**
 * @template {Object|null} T
 */
export class JSONResponse extends Response {
  /**
   * @param {T} body
   * @param {ResponseInit} [init]
   */
  constructor(body, init = {}) {
    super(JSON.stringify(body), {
      headers: {
        'Content-Type': 'application/json',
        ...init.headers
      }
    })
  }

  /**
   * @template {Object} T
   * @param {T} value
   * @param {ResponseInit} [init]
   * @returns {JSONResponse<result.Result<Error, T>>}
   */
  static ok(value, init) {
    return new JSONResponse({ ok: true, value }, init)
  }
  /**
   * @template {{ message: string,  code?: number }} X
   * @param {X} [error]
   * @param {ResponseInit} [init]
   * @returns {JSONResponse<result.Result<X, any>>}
   */
  static error(error, init) {
    const {message = '', code = 500 } = error || {}
    return new JSONResponse({
      ok: false,
      error: { message }
    }, {
      status: code,
      ...init
    })
  }
}
