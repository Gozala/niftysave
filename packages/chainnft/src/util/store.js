/**
 * @typedef {{
 *  prefix?: string
 *  limit?: number;
 *  cursor?: string
 * }} ListOptions
 * @param {KVNamespace} store
 * @param {ListOptions} [options]
 * @returns {AsyncGenerator<{ name: string; expiration?: number; metadata?: unknown }>}
 */
export const list = async function*(store, options) {
  while (true) {
    const { keys, cursor, list_complete } = await store.list(options)
    yield* keys
    if (list_complete) {
      return
    } else {
      options = { ...options, cursor }
    }
  }
}

/**
 * @param {KVNamespace} store
 * @param {ListOptions} [options]
 * @returns {AsyncGenerator<string>}
 */
export const keys = async function*(store, options) {
  for await (const { name } of list(store, options)) {
    yield name
  }
}

/**
 * @param {KVNamespace} store
 * @param {ListOptions} [options]
 * @returns {Promise<number>}
 */
export const count = async (store, options = {}) => {
  const settings = { ...options }
  let count = 0
  while (true) {
    const { keys, cursor, list_complete } = await store.list(settings)
    count += keys.length
    if (list_complete) {
      return count
    } else {
      settings.cursor = cursor
    }
  }
}

/**
 * @param {KVNamespace} store
 * @param {ListOptions} [options]
 * @returns {AsyncGenerator<[string, unknown]>}
 */
export const entries = async function*(store, options) {
  const settings = { ...options }
  while (true) {
    const { keys, list_complete, cursor } = await store.list(settings)
    for (const key of keys) {
      const value = await store.get(key.name, "json")
      yield [key.name, value]
    }
    settings.cursor = cursor
    if (list_complete) {
      break
    }
  }
}

/**
 * @param {KVNamespace} store
 * @param {ListOptions} [options]
 * @returns {AsyncGenerator<unknown>}
 */
export const values = async function*(store, options) {
  for await (const [, value] of entries(store, options)) {
    yield value
  }
}
