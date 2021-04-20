/**
 * @template T
 */
export class Cell {
  /**
   * @param {KVNamespace} store
   * @param {string} name
   */
  constructor(store, name) {
    this.store = store
    this.name = name
  }
  /**
   * @template U
   * @param {U} fallback
   * @returns {Promise<T|U>}
   */
  async read(fallback) {
    /** @type {T|null} */
    const value = await this.store.get(this.name, "json")
    return value === null ? fallback : value
  }
  /**
   * @param {T} value
   * @returns {Promise<void>}
   */
  write(value) {
    return this.store.put(this.name, JSON.stringify(value))
  }

  /**
   * @param {(value:T) => T} f
   * @returns {Promise<void>}
   */
  async update(f) {
    const value = await this.read()
    if (value) {
      await this.write(f(value))
    }
  }
  delete() {
    return this.store.delete(this.name)
  }
}
