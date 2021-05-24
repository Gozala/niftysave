// import repl from "repl"

import fetch from "@web-std/fetch"
import dotenv from "dotenv"
import DB from "faunadb"
dotenv.config()

globalThis.fetch = fetch
globalThis.DB = DB
globalThis.db = new DB.Client({
  secret: process.env["FAUNA_KEY"] || "",
})
