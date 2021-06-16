import fs from "fs"
import fetch from "@web-std/fetch"
import dotenv from "dotenv"
dotenv.config()

const main = async () => {
  const FAUNA_KEY = process.env["FAUNA_KEY"]
  if (!FAUNA_KEY) {
    console.error(
      `💥 FAUNA_KEY key must be provided through env variable or via .env file`
    )
    process.exit(1)
  }

  await uploadSchema()
}

const uploadSchema = async () => {
  const url = new URL("../fauna/schema.graphql", import.meta.url)
  console.log(`💿 Reading GraphQL Schema form ${url}`)
  const content = await fs.promises.readFile(url)
  console.log("🏗 Uploading GraphQL Schema to be merged into Fauna DB")
  const response = await fetch("https://graphql.fauna.com/import", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env["FAUNA_KEY"]}`,
    },
    body: content,
  })
  if (response.ok) {
    console.log(`🎉 Scheama import succeeded`)
  } else {
    console.log(`🚨 Import failed ${response.status}`)
    const reason = await response.text()
    console.log(reason)
    throw Error(`Schema import failed ${response.status} ${reason}`)
  }
}

main()
