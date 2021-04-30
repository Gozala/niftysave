import { Router, cors, postCors } from "@niftysave/router"
import * as EIP721 from "./eip721.js"
import * as Cell from "./util/cell.js"
import * as Store from "./util/store.js"
import * as Table from "./util/table.js"
import * as Scanner from "./scanner.js"
import { poolSize, timeBudget, location } from "./env.js"
import { JSONResponse } from "./util/response.js"

const router = new Router({
  onError: (_, error) =>
    new Response(
      JSON.stringify({ ok: false, error: { message: error.message } }),
      {
        // @ts-ignore
        status: error.status || 500,
        headers: { "Content-Type": "application/json;charset=UTF-8" },
      }
    ),
  onNotFound: () =>
    new Response(
      JSON.stringify({ ok: false, error: { message: "Not Found" } }),
      {
        status: 404,
        headers: { "Content-Type": "application/json;charset=UTF-8" },
      }
    ),
})

/**
 *
 * @returns {Promise<Response>}
 */
const info = async () => {
  const head = await queryHead()
  const cursor = await Cell.read(Scanner.cursor)
  const indexedNFTS = await Table.count(Scanner.nfts)

  let [succeeded, failed, pending] = [0, 0, 0]

  for await (const state of Table.iterate(Scanner.scanTable)) {
    if (!state.done) {
      pending++
    } else if (state.result.ok) {
      succeeded++
    } else {
      failed++
    }
  }

  return new JSONResponse({
    url: location.href,
    poolSize,
    timeBudget,
    cursor: cursor.ok ? cursor.value : "",
    indexedNFTS,
    tasks: {
      succeeded,
      failed,
      pending,
    },
  })
}

/**
 * Queries the graph to get last block number in the chain. In practice it
 * returns not the last block number but one prior to it as graph may not be
 * finished indexing the last on (I don't actually know if this is actualy true
 * can't see any info on this in their docs, so just assume the worst).
 *
 * @returns {Promise<number>}
 */
const queryHead = async () => {
  const result = await EIP721.query({
    _meta: {
      block: {
        number: 1,
      },
    },
  })

  if (result.ok && result.value._meta) {
    return result.value._meta.block.number - 1
  } else {
    throw Error("Failed to fetch head")
  }
}

router.add("options", "/api/*", cors)
router.add("all", "/api/scan", Scanner.request, [postCors])
router.add("get", "/api/info", info, [postCors])

router.listen(self)

/**
 * @type {ScheduledEvent}
 */
self.addEventListener("scheduled", Scanner.spawn)
