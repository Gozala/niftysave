// import repl from "repl"

import fetch from "@web-std/fetch"
import dotenv from "dotenv"
import fauna from "faunadb"
dotenv.config()

const db = new fauna.Client({
  secret: process.env["FAUNA_KEY"] || "",
})

Object.assign(globalThis, {
  fetch,
  fauna,
  db,
})
