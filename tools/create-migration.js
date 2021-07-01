import * as migration from "./migration.js"
import dotenv from "dotenv"
import yargs from "yargs"

export const main = async () => {
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

  const oldSchema = await migration.readLastSchema()
  const newSchema = await migration.readCurrentSchema()
  if (oldSchema != newSchema) {
    console.log(`⛔️ Schema has changed, please upgrade it first.
You can do it by running "yarn update-schema" command`)
    process.exit(1)
  } else {
    console.log("🚜 Generating migration")
    const url = await migration.generateMigrtation(config, newSchema)
    if (url) {
      console.log(`✨ Created new migration at ${url}`)
    } else {
      console.log(`✅ No changes to create migration for`)
    }
  }
}

main()
