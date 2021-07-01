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

  console.log(
    `🚧 Applying unapplied migrations to the database (this may take a while)`
  )

  await migration.applyMigrations(config)

  console.log(`💿 Reading GraphQL Schema`)
  const schema = await migration.readLastSchema()

  if (schema.trim().length > 0) {
    await migration.uploadSchema(config, schema)
  }
}

main()
