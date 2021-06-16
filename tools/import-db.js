import fauna from "faunadb"
import fs from "fs"
import dotenv from "dotenv"
import yargs from "yargs"

const {
  Client,
  Expr,
  Get,
  Collections,
  Functions,
  Indexes,
  CreateFunction,
  CreateIndex,
  CreateCollection,
} = fauna

/**
 * Pulls collections, indexes and user defined functions from fauna db and
 * writes each under `../fauna/resources/` dir with it's name.
 *
 *
 * @param {{overwrite?:boolean, secret:string}} options
 */
export const importAll = async ({ secret, overwrite = false }) => {
  const base = new URL("../fauna/resources/", import.meta.url)
  const client = new Client({ secret })
  const options = { client, base, overwrite }

  const [collections, index, functions] = await Promise.all([
    importFrom({ ...options, type: "Collection", icon: "🤹" }),
    importFrom({ ...options, type: "Index", icon: "🕵️" }),
    importFrom({ ...options, type: "Function", icon: "👷" }),
  ])

  if (collections.ok && index.ok && functions.ok) {
    process.exit(0)
  } else {
    process.exit(1)
  }
}

/**
 * Pulls all collections/indexes/functions from the fauna db and writes it into
 * `../fauna/resources/` witch a matching name. Unless `options.overwrite` is
 * `true` it will not overwrite existing files.
 *
 * @param {Object} options
 * @param {fauna.Client} options.client
 * @param {URL} options.base
 * @param {'Index'|'Collection'|'Function'} options.type
 * @param {string} options.icon
 * @param {boolean} options.overwrite
 */
const importFrom = async ({ client, base, type, icon, overwrite }) => {
  /** @type {Promise<any>[]} */
  const promises = []
  const [source, create] =
    type === "Collection"
      ? [Collections(), createCollection]
      : type === "Index"
      ? [Indexes(), createIndex]
      : [Functions(), createFunction]

  const pages = client.paginate(source).map(ref => Get(ref))
  let ok = true
  await pages.each(page => {
    for (const doc of /** @type{any[]} */ (page)) {
      console.log(`${icon} Import ${type} ${doc.name}`)

      const promise = fs.promises
        .writeFile(
          new URL(`./${type}/${doc.name}.fql`, base),
          Expr.toString(create(doc)),
          {
            flag: overwrite ? "w" : "wx",
          }
        )
        .catch(error => {
          ok = false
          console.error(`🚨 Failed to write ${type} ${doc.name} ${error}`)
        })
      promises.push(promise)
    }
  })

  await Promise.all(promises)

  return { ok }
}

/**
 * @param {{name:string, body:Object, data?:Object, role?:Object }} input
 */
const createFunction = ({ name, body, data, role }) =>
  CreateFunction({
    name,
    body,
    ...(data && { data }),
    ...(role && { role }),
  })

/**
 *
 * @param {{name:string, data?:Object, history_days?:number, ttl_days?:number|null, permissions?:Object }} input
 */
const createCollection = ({
  name,
  data,
  history_days,
  ttl_days,
  permissions,
}) =>
  CreateCollection({
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
  CreateIndex({
    name,
    source,
    ...(terms && { terms }),
    ...(values && { values }),
    ...(unique && { unique }),
    ...(serialized && { serialized }),
    ...(permissions && { permissions }),
    ...(data && { data }),
  })

const main = async () => {
  dotenv.config()
  const options = await yargs(process.argv.slice(2))
    .boolean("overwrite")
    .options({
      secret: {
        default: process.env["FAUNA_KEY"],
        description: "Fauna DB access token",
        demandOption: true,
      },
    })
    .parse()

  await importAll(options)
}

main()
