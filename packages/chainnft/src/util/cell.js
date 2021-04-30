// /**
//  * @template T
//  */
// export class Cell {
//   /**
//    * @param {KVNamespace} store
//    * @param {string} name
//    */
//   constructor(store, name) {
//     this.store = store
//     this.name = name
//   }

//   /**
//    * @template T
//    * @param {KVNamespace} store
//    * @param {(value:T) => string} toName
//    * @param {T} value
//    * @returns {Promise<Cell<T>>}
//    */
//   static async init(store, toName, value) {
//     const cell = new Cell(store, toName(value))
//     cell.write(value)
//     return cell
//   }

//   /**
//    * @template U
//    * @param {U} fallback
//    * @returns {Promise<T|U>}
//    */
//   async read(fallback) {
//     /** @type {T|null} */
//     const value = await this.store.get(this.name, "json")
//     return value === null ? fallback : value
//   }
//   /**
//    * @param {T} value
//    * @returns {Promise<void>}
//    */
//   write(value) {
//     return this.store.put(this.name, JSON.stringify(value))
//   }

//   /**
//    * @param {(value:T) => T} f
//    * @returns {Promise<void>}
//    */
//   async update(f) {
//     const value = await this.read(null)
//     if (value) {
//       await this.write(f(value))
//     }
//   }
//   delete() {
//     return this.store.delete(this.name)
//   }
// }

/**
 * @template T
 * @typedef {{
 *  store: KVNamespace
 *  key: string
 *  notFound: T
 * }} Cell
 */
/**
 * @template T
 * @param {KVNamespace} store
 * @param {string} key
 * @param {T} notFound
 * @returns {Cell<T>}
 */
export const init = (store, key, notFound) => ({ store, key, notFound })

/**
 * @template T
 * @param {Cell<T>} cell
 * @returns {Promise<import("../result").Result<Error, T>>}
 */
export const read = async ({ store, key, notFound }) => {
  try {
    /** @type {T|null} */
    const value = await store.get(key, "json")
    if (value == null) {
      return { ok: true, value: notFound }
    } else {
      return { ok: true, value }
    }
  } catch (error) {
    return { ok: false, error }
  }
}

/**
 * @template T
 * @param {Cell<T>} cell
 * @param {T} value
 * @returns {Promise<import("../result").Result<Error, void>>}
 */
export const write = async ({ store, key }, value) => {
  try {
    await store.put(key, JSON.stringify(value))
    return { ok: true, value: undefined }
  } catch (error) {
    return { ok: false, error }
  }
}
/**
 * @template T
 * @param {Cell<T>} cell
 * @param {(value:T) => T} f
 * @returns {Promise<import("../result").Result<Error, void>>}
 */
export const update = async ({ store, key, notFound }, f) => {
  try {
    /** @type {T} */
    const value = (await store.get(key, "json")) || notFound
    await store.put(key, JSON.stringify(f(value)))
    return { ok: true, value: undefined }
  } catch (error) {
    return { ok: false, error }
  }
}
