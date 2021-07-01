import dotenv from "dotenv"
import * as migration from "./migration.js"
import yargs from "yargs"
dotenv.config()

const main = async () => {
  dotenv.config()
  const config = await yargs(process.argv.slice(2))
    .boolean("overwrite")
    .options({
      secret: {
        default: process.env["FAUNA_KEY"],
        description: "Fauna DB access token",
        demandOption: true,
      },
    })
    .parse()

  if (!config.secret) {
    console.error(`⛔️ Task requires FAUNA_KEY env variable.
For local development you can use .env file in the repo root with content like:

FAUNA_KEY=fn...nw

Use an actual key obtained from https://dashboard.fauna.com/
`)
    process.exit(1)
  }

  const pendingMigrations = await migration.unappliedMigrations(config)
  if (pendingMigrations.size > 0) {
    console.error(
      `⛔️ You have following unapplied schema migrations:
  - ${[...pendingMigrations].join("\n  - ")}

You need to apply those migrations before you will be able to update schema.`
    )
    process.exit(1)
  }

  await migration.uploadSchema(config, await migration.readCurrentSchema())

  console.log(`💾 Downloanding database collections, indexes, functions`)
  await Promise.all([
    migration.importCollections(config, { ignore: true }),
    migration.importIndexes(config, { ignore: true }),
    migration.importFunctions(config, { ignore: true }),
  ])

  console.log("🎉 Schema upload complete")
}

main()
