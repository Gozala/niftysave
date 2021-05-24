import * as Import from "./import.js"
import dotenv from "dotenv"

dotenv.config()

export const main = async () => {
  await Import.spawn({
    batchSize: Number(process.env["BATCH_SIZE"] || 50),
    budget: Number(process.env["TIME_BUDGET"] || 30) * 1000,
  })
}

main()
