import fs from "fs"
import fetch from "@web-std/fetch"
import { clientGenerator } from "@fauna-labs/fauna-schema-migrate/dist/util/fauna-client.js"
import migrations from "@fauna-labs/fauna-schema-migrate/dist/migrations/advance.js"
import taskMigrate from "@fauna-labs/fauna-schema-migrate/dist/tasks/migrate.js"
import taskApply from "@fauna-labs/fauna-schema-migrate/dist/tasks/apply.js"
import * as files from "@fauna-labs/fauna-schema-migrate/dist/util/files.js"
import { config } from "@fauna-labs/fauna-schema-migrate/dist/util/config.js"
import prettier from "prettier"
import fauna from "faunadb"

const tasks = {
  /** @type {typeof taskMigrate} */
  // @ts-ignore - types do not have default.
  migrate: taskMigrate.default,
  /** @type {typeof taskApply} */
  // @ts-ignore - types do not have default.
  apply: taskApply.default,
}

/**
 * @typedef {import('faunadb').ClientConfig} Config
 */

/**
 * @template T
 * @param {Config} config
 * @param {() => T} fn
 * @returns {T}
 */
const withConfig = (config, fn) => {
  process.env["FAUNA_ADMIN_KEY"] = config.secret
  return fn()
}

/**
 * Returns list of schema migrations that have not been applied yet.
 * @param {Config} config
 */
export const unappliedMigrations = (config) =>
  withConfig(config, async () => {
    const { allCloudMigrations, allLocalMigrations } =
      await migrations.retrieveMigrationInfo(await clientGenerator.getClient())

    const local = new Set(allLocalMigrations)
    for (const migration of allCloudMigrations) {
      local.delete(migration.timestamp)
    }

    return local
  })

/**
 * Generates new migration from changes in the fauna/resources directory.
 *
 * @param {Config} config
 * @param {string} schema
 */
export const generateMigrtation = async (config, schema) =>
  withConfig(config, async () => {
    const old = await getLastMigrationURL()
    await tasks.migrate()
    const base = await getLastMigrationURL()
    if (base && base.href != old?.href) {
      await fs.promises.writeFile(new URL("schema.graphql", base), schema)
      return base
    }
    return null
  })

/**
 * Applies migrations from fauna/migrations directory to the data base.s
 *
 * @param {Config} config
 * @returns
 */
export const applyMigrations = async (config) => withConfig(config, tasks.apply)

/**
 * @param {Config} config
 * @param {string} schema
 */
export const uploadSchema = async (config, schema) => {
  console.log("🏗 Uploading GraphQL Schema to be merged into Fauna DB")
  const response = await fetch("https://graphql.fauna.com/import", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.secret}`,
    },
    body: schema,
  })
  if (response.ok) {
    console.log(`🎉 Schema upload succeeded`)
  } else {
    console.log(`🚨 Import failed ${response.status}`)
    const reason = await response.text()
    throw Error(`Schema import failed ${response.status} ${reason}`)
  }
}

export const migrationsBase = async () =>
  new URL(`${await config.getMigrationsDir()}/`, baseURL())

export const resourcesBase = async () =>
  new URL(`${await config.getResourcesDir()}/`, baseURL())

export const baseURL = () => new URL(`${process.cwd()}/`, import.meta.url)

export const migrationsCollectionURL = async () => {
  const name = await config.getMigrationCollection()
  return new URL(`${name}.fql`, await resourcesBase())
}

/**
 * Returns file URL for last migration or `null` if no migrations
 * are present.
 *
 * @returns {Promise<URL|null>}
 */
export const getLastMigrationURL = async () => {
  const revisions = await files.retrieveAllMigrations()
  const last = revisions.sort().pop()
  return last
    ? new URL(`${last.replace(/:/g, "_")}/`, await migrationsBase())
    : null
}

export const readLastSchema = async () => {
  const base = await getLastMigrationURL()
  const url = base ? new URL("schema.graphql", base) : null
  return url ? await fs.promises.readFile(url, { encoding: "utf8" }) : ""
}

export const readCurrentSchema = async () => {
  const url = new URL("schema.graphql", await resourcesBase())
  const source = await fs.promises.readFile(url, { encoding: "utf8" })
  return prettier.format(source, {
    parser: "graphql",
  })
}

/**
 * @param {Config} config
 * @param {{overwrite?:boolean, ignore?:boolean}} [options]
 */
export const importCollections = async (config, options) =>
  await importFrom(
    config,
    fauna.Collections(),
    createCollection,
    new URL("./Collection/", await resourcesBase()),
    options
  )

/**
 * @param {Config} config
 * @param {{overwrite?:boolean, ignore?:boolean}} [options]
 */
export const importIndexes = async (config, options) =>
  await importFrom(
    config,
    fauna.Indexes(),
    createIndex,
    new URL("./Index/", await resourcesBase()),
    options
  )

/**
 * @param {Config} config
 * @param {{overwrite?:boolean, ignore?:boolean}} [options]
 */
export const importFunctions = async (config, options) =>
  await importFrom(
    config,
    fauna.Functions(),
    createFunction,
    new URL("./Function/", await resourcesBase()),
    options
  )

/**
 * Pulls all collections/indexes/functions from the fauna db and writes it into
 * `../fauna/resources/` witch a matching name. Unless `options.overwrite` is
 * `true` it will not overwrite existing files.
 *
 * @param {Config} config
 * @param {fauna.Expr} source
 * @param {(param:any) => fauna.Expr} create
 * @param {URL} target
 * @param {{overwrite?:boolean, ignore?:boolean}} [options]
 */
const importFrom = (
  config,
  source,
  create,
  target,
  { overwrite = false, ignore = false } = {}
) =>
  withConfig(config, async () => {
    const client = await clientGenerator.getClient()
    const builtinURL = await migrationsCollectionURL()

    /** @type {Promise<any>[]} */
    const promises = []

    const pages = client.paginate(source).map((ref) => fauna.Get(ref))
    /** @type {string[]} */
    const failed = []

    await pages.each((page) => {
      for (const doc of /** @type{any[]} */ (page)) {
        const url = new URL(`./${doc.name}.fql`, target)
        if (url.href !== builtinURL.href) {
          const promise = fs.promises
            .writeFile(
              url,
              prettier.format(fauna.Expr.toString(create(doc)), {
                parser: "babel",
              }),
              {
                flag: overwrite ? "w" : "wx",
              }
            )
            .catch(() => {
              if (!ignore) {
                failed.push(doc.name)
              }
            })

          promises.push(promise)
        }
      }
    })

    await Promise.all(promises)
    if (failed.length != 0) {
      throw new Error(`Failed to write ${failed.join(", ")}`)
    }
  })

/**
 * @param {{name:string, body:Object, data?:Object, role?:Object }} input
 */
const createFunction = ({ name, body, data, role }) =>
  fauna.CreateFunction({
    name,
    body,
    ...(data && { data }),
    ...(role && { role }),
  })

/**
 * @param {{name:string, data?:Object, history_days?:number, ttl_days?:number|null, permissions?:Object }} input
 */
const createCollection = ({
  name,
  data,
  history_days,
  ttl_days,
  permissions,
}) =>
  fauna.CreateCollection({
    name,
    ...(data !== undefined && { data }),
    ...(history_days !== undefined && { history_days }),
    ...(ttl_days !== undefined && { ttl_days }),
    ...(permissions !== undefined && { permissions }),
  })

/**
 *
 * @param {{
 *   name:string,
 *   source:Object,
 *   terms?:Object[],
 *   values?:Object[],
 *   unique?:boolean,
 *   serialized?:boolean,
 *   permissions?: Object,
 *   data?:Object
 * }} input
 * @returns
 */
const createIndex = ({
  name,
  source,
  terms,
  values,
  unique,
  serialized,
  permissions,
  data,
}) =>
  fauna.CreateIndex({
    name,
    source,
    ...(terms && { terms }),
    ...(values && { values }),
    ...(unique && { unique }),
    ...(serialized && { serialized }),
    ...(permissions && { permissions }),
    ...(data && { data }),
  })
