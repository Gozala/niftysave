// @ts-ignore
import * as _console from "./console.js"
import { Router, cors, postCors } from "@niftysave/router"
import * as EIP721 from "./eip721.js"
import { Cell } from "./util/cell.js"
import * as Result from "./result.js"
import {
  POOL_SIZE,
  START_BLOCK,
  location,
  scanState,
  scanTable,
} from "./env.js"
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

const REV = 6
/**
 * @param {number} scheduledTime
 */
const scanChain = async scheduledTime => {
  console.log(`start chain scan at ${scheduledTime} REV ${REV}`)
  const lastBlock = await queryHead()
  console.log(`Got chain last block #${lastBlock}`)
  const lastScannedBlock = await head.read(START_BLOCK - 1)
  console.log(`Got last scanned block#${lastScannedBlock}`)

  const tasks = []
  const n = Number(POOL_SIZE)
  let [startBlock, nextBlock] = [lastScannedBlock, lastScannedBlock]

  console.log(
    `Attempting to schedule ${n} scans between blocks #${nextBlock}-#${lastBlock}`
  )

  // Keep resuming or starting scan tasks until desired number is
  while (tasks.length < n && nextBlock <= lastBlock) {
    console.log(`Checking status of a scan for block #${nextBlock}`)
    const state = await Scan.init(nextBlock).read(null)
    if (state == null) {
      console.log(`Starting a new scan task for block #${nextBlock}`)
      tasks.push(scanBlock(nextBlock))
    } else {
      switch (Scan.status(state)) {
        case "complete": {
          // If completed task is at the start of the queue move the head cursor
          // to a next block.
          console.log(`Scan for block #${nextBlock} appears complete`)
          if (startBlock === nextBlock) {
            await head.write(++startBlock)
            console.log(`Moved cursor to the next block #${startBlock}`)
          }
          break
        }
        // If task is active (from previous activation) just skip to next one.
        case "active": {
          console.log(`Have active scan for block #${nextBlock}`)
          tasks.push(null)
          break
        }
        // If task is idle resume it.
        case "idle": {
          console.log(`Have and idle scan for block #${nextBlock}, resuming`)
          tasks.push(scanBlock(nextBlock))
          break
        }
      }
    }
    nextBlock++
  }

  // wait for all active tasks to finish
  const batch = await Promise.all(tasks)

  console.log(`All started scans were complete ${JSON.stringify(batch)}`)

  return batch
}

/**
 *
 * @returns {Promise<Response>}
 */
const info = async () => {
  console.log(`START INFO ${REV}`)
  const lastBlock = await queryHead()
  const lastScannedBlock = await head.read(START_BLOCK - 1)
  /** @type {Object[]} */
  const active = []
  /** @type {Object[]} */
  const idle = []
  let nextBlock = lastScannedBlock

  // Keep resuming or starting scan tasks until desired number is
  while (nextBlock <= lastBlock) {
    const state = await Scan.init(nextBlock).read(null)
    if (state == null) {
      break
    } else {
      switch (Scan.status(state)) {
        case "complete":
          break
        case "active":
          active.push(state)
          break
        // If task is idle resume it.
        case "idle":
          idle.push(state)
          break
      }
    }
    nextBlock++
  }

  const [indexedNFTS, scannedBlocks] = await Promise.all([
    readRecords(scanTable),
    readRecords(scanState),
  ])

  return new JSONResponse({
    url: location.href,
    rev: REV,
    poolSize: Number(POOL_SIZE),
    cursor: lastScannedBlock,
    nextBlock,
    lastBlock,
    scannedBlocks,
    indexedNFTS,
    tasks: {
      active,
      idle,
    },
  })
}

/**
 *
 * @param {KVNamespace} store
 * @param {string} [cursor]
 */

const readRecords = async (store, cursor) => {
  let keys = []
  let done = false
  while (!done) {
    const result = await store.list({ cursor })
    done = result.list_complete
    keys.push(...result.keys.map(x => x.name))
  }
  return keys
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
    const url = new URL(`/api/scan/${blockNumber}`, ENDPOINT)
    console.log(`Start scanner ${url.href}`)
    const response = await fetch(url.href, {
      method: "POST",
    })

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status} - ${response.statusText}`)
    }

    console.log(`Scan completed ${response.status}: ${response.statusText}`)
    const result = await response.json()
    console.log(`Scan result is ${JSON.stringify(result)}`)
    if (result.ok) {
      return result
    } else {
      throw new Error(result.error.message)
    }
  } catch (error) {
    console.log(`Scanning a block ${blockNumber} failed: ${error}`)
    return { ok: false, error: { message: error.message } }
  }
}

router.add("options", "/api/*", cors)
router.add("post", "/api/scan", request, [postCors])
router.add("post", "/api/scan/:blockNumber", Scan.request, [postCors])
router.add("get", "/api/info", info, [postCors])

router.listen(self)

/**
 * @type {ScheduledEvent}
 */
self.addEventListener("scheduled", event =>
  event.waitUntil(scanChain(event.scheduledTime))
)
