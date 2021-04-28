import { Router, cors, postCors } from "@niftysave/router"
import * as EIP721 from "./eip721.js"
import { Cell } from "./util/cell.js"
import * as Result from "./result.js"
import { POOL_SIZE, START_BLOCK, location, scanState } from "./env.js"
import * as Scan from "./scan/lib.js"
import { JSONResponse } from "./util/response.js"

const ENDPOINT = location

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
 * @param {FetchEvent} event
 */
const request = async event => {
  try {
    const result = await scanChain()
    return new JSONResponse({ ok: true, value: result })
  } catch (error) {
    return new JSONResponse({ ok: false, error: { message: error.message } })
  }
}

const scanChain = async () => {
  console.log(`start chain scan ${self.URL} ${self.location}`)
  const lastBlock = await queryHead()
  console.log(`last chain block number is ${lastBlock}`)
  const lastScannedBlock = await head.read(START_BLOCK - 1)
  console.log(`last scanned block number is ${lastScannedBlock}`)

  const tasks = []
  const n = Number(POOL_SIZE)
  let [startBlock, nextBlock] = [lastScannedBlock, lastScannedBlock]
  // Keep resuming or starting scan tasks until desired number is
  while (tasks.length < n && nextBlock <= lastBlock) {
    const state = await Scan.init(nextBlock).read(null)
    if (state == null) {
      console.log(`start scanning ${nextBlock}`)
      tasks.push(scanBlock(nextBlock))
    } else {
      switch (Scan.status(state)) {
        case "complete": {
          // If completed task is at the start of the queue move the head cursor
          // to a next block.
          if (startBlock === nextBlock) {
            await head.write(++startBlock)
          }
          break
        }
        // If task is active (from previous activation) just skip to next one.
        case "active": {
          tasks.push(null)
          break
        }
        // If task is idle resume it.
        case "idle": {
          tasks.push(scanBlock(nextBlock))
          break
        }
      }
    }
    nextBlock++
  }

  // wait for all active tasks to finish
  const result = await Promise.all(tasks)
  console.log(`done chain scan ${JSON.stringify(result)}`)
  return result
}

/**
 * @type {Cell<number>}
 */
const head = new Cell(scanState, "eip-721:head")

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

/**
 * Spawn a scanning task with for a given block.
 *
 * @param {number} blockNumber
 * @returns {Promise<Result.Result<{ message: string }, void>>}
 */
const scanBlock = async blockNumber => {
  // try block to ensures that promise can never fail.
  try {
    console.log(`scan block #${blockNumber}`)
    const url = new URL(`/api/scan/${blockNumber}`, ENDPOINT)
    console.log(`>>> ${url.href}`)
    const response = await fetch(url.href, {
      method: "POST",
    })

    console.log(`<< ${response.status} ${response.statusText}`)
    const result = await response.json()
    console.log(`scanned ${JSON.stringify(result)}`)
    if (result.ok) {
      return result
    } else {
      throw new Error(result.error.message)
    }
  } catch (error) {
    console.log(`failed ${error}`)
    return { ok: false, error: { message: error.message } }
  }
}

router.add("options", "/api/*", cors)
router.add("post", "/api/scan", request, [postCors])
router.add("post", "/api/scan/:blockNumber", Scan.request, [postCors])

router.listen(self)

/**
 * @type {ScheduledEvent}
 */
self.addEventListener("scheduled", event => event.waitUntil(scanChain()))
