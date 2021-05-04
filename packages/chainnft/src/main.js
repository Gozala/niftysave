import { Router, cors, postCors } from "@niftysave/router"
import * as Cell from "./util/cell.js"
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
  const cursor = await Cell.read(Scanner.cursorCell)
  const indexedNFTS = await Table.count(Scanner.nfts)

  let [succeeded, failed, active, idle] = [0, 0, 0, 0]

  for await (const state of Table.iterate(Scanner.scanTable)) {
    if (!state.done) {
      if (timeBudget - (Date.now() - state.updateTime) > 0) {
        active++
      } else {
        idle++
      }
    } else if (state.result.ok) {
      succeeded++
    } else {
      failed++
    }
  }

  return new JSONResponse({
    url: location.href,
    revision: 1,
    poolSize,
    timeBudget,
    cursor: cursor.ok ? cursor.value : "",
    indexedNFTS,
    tasks: {
      succeeded,
      failed,
      active,
      idle,
    },
  })
}

router.add("options", "/api/*", cors)
router.add("all", "/api/scan", Scanner.request, [postCors])
router.add("get", "/api/info", info, [postCors])

router.listen(self)

/**
 * @type {ScheduledEvent}
 */
self.addEventListener("scheduled", Scanner.spawn)
