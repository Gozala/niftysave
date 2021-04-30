import * as Store from "./store.js"
import * as Cell from "./cell.js"

/**
 * @template T
 * @typedef {{
 *  store: KVNamespace
 *   id: (value:T) => string
 * }} Table
 */

/**
 * @template T
 * @param {KVNamespace} store
 * @param {(value:T) => string} id
 * @returns {Table<T>}
 */
export const init = (store, id) => ({ store, id })

/**
 * @template T
 * @param {Table<T>} table
 * @param {T} record
 * @returns {Promise<import("../result").Result<Error, void>>}
 */
export const put = async (table, record) => {
  try {
    const value = await table.store.put(
      table.id(record),
      JSON.stringify(record)
    )
    return { ok: true, value }
  } catch (error) {
    return { ok: false, error }
  }
}

/**
 * @template T
 * @param {Table<T>} table
 * @param {Store.ListOptions} [options]
 */

export const iterate = ({ store }, options) =>
  /** @type {AsyncGenerator<T>} */
  (Store.values(store, options))

/**
 * @template T
 * @param {Table<T>} table
 * @param {T} notFound
 * @returns {Cell.Cell<T>}
 */
export const cell = ({ store, id }, notFound) =>
  Cell.init(store, id(notFound), notFound)

/**
 * @template T
 * @param {Table<T>} table
 */
export const count = ({ store }) => Store.count(store)
