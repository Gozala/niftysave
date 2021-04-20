import { Router, cors, postCors } from "@niftysave/router"
import * as EIP721 from "./eip721.js"
import { Cell } from "./util/cell.js"
import * as Result from "./result.js"
import { POOL_SIZE, START_BLOCK, scanState } from "./env.js"
import * as Scan from "./scan/lib.js"

// TODO: Put actual host name here
const ENDPOINT = new URL(`https://localhost/`)

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

router.add("options", "/api/*", cors)
router.add("get", "/api/scan/:blockNumber", Scan.request, [postCors])

router.listen(self)

/**
 
 *
 * @returns {Promise<void>}
 */
const activate = async () => {
  const lastBlock = await queryHead()
  const startBlock = await head.read(START_BLOCK)
  await scan(startBlock, lastBlock)
}

/**
 *
 * @param {number} blockNumber
 * @param {number} lastBlock
 */
const scan = async (blockNumber, lastBlock) => {
  const tasks = []
  const n = Number(POOL_SIZE)
  let [startBlock, nextBlock] = [blockNumber, blockNumber]
  // Keep resuming or starting scan tasks until desired number is
  while (tasks.length < n && nextBlock <= lastBlock) {
    const state = await Scan.init(nextBlock).read(null)
    if (state == null) {
      tasks.push(spawn({ lastBlock, blockNumber: nextBlock }))
    } else {
      switch (Scan.status(state)) {
        case "complete": {
          // If completed task is at the start of the queue
          // move the head no a next block.
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
          tasks.push(spawn({ lastBlock, blockNumber: nextBlock }))
          break
        }
      }
    }
    nextBlock++
  }

  // wait for all active tasks to finish
  await Promise.all(tasks)
}

/**
 * @type {Cell<number>}
 */
const head = new Cell(scanState, "eip-721:head")

/**
 * Queries the graph to get last block number in the chain.
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
    return result.value._meta.block.number
  } else {
    throw Error("Failed to fetch head")
  }
}

/**
 * Spawn a task with a given options.
 *
 * @param {{blockNumber: number, lastBlock:number}} options
 * @returns {Promise<Result.Result<Error, void>>}
 */
const spawn = async ({ blockNumber, lastBlock }) => {
  const url = new URL(`/api/scan/${blockNumber}`, ENDPOINT)
  const response = await fetch(url.href, {
    method: "POST",
    body: JSON.stringify({ lastBlock }),
  })
  const result = await response.json()
  return result.ok
    ? result
    : { ok: false, error: new Error(result.error.message) }
}

self.addEventListener("scheduled", event => event.waitUntil(activate()))
