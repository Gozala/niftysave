// @ts-ignore
import * as _console from "../console.js"
import * as Scan from "./scan.js"
import { Cell } from "../util/cell.js"
import { PAGE_SIZE, scanState, scanTable } from "../env.js"
import * as EIP721 from "../eip721.js"
import { JSONResponse } from "../util/response.js"

const MIN = 1000 * 60

/**
 * Returns status of the scan. If no updates were reported with-in
 * last minute it is considered `'idle'`. Otherwise it is `'complete'` if
 * `endTime` is set and `'active'` if not.
 *
 * @param {Scan.State} state
 */
export const status = state => {
  if (state.endTime !== null) {
    return "complete"
  } else if (Date.now() - state.updateTime < MIN) {
    return "active"
  } else {
    return "idle"
  }
}

/**
 * @param {number} blockNumber
 * @returns {Promise<import("../result.js").Result<{message:string}, {done:boolean, scanned:number}>>}
 */
export const scan = async blockNumber => {
  console.log(`Scanner: received scan request for block #${blockNumber}`)
  const cell = init(blockNumber)
  const state = await cell.read({
    blockNumber,
    lastId: "",
    startTime: Date.now(),
    updateTime: Date.now(),
    endTime: null,
  })
  // Set update time
  await cell.write({ ...state, updateTime: Date.now() })

  try {
    const result = await EIP721.query({
      tokens: [
        {
          first: PAGE_SIZE,
          where: {
            tokenURI_not: "",
            blockNumber: state.blockNumber,
            id_gt: state.lastId,
          },
        },
        {
          id: 1,
          tokenID: 1,
          tokenURI: 1,
          mintTime: 1,
          blockNumber: 1,
          blockHash: 1,
          contract: {
            id: 1,
            name: 1,
            symbol: 1,
            supportsEIP721Metadata: 1,
          },
          owner: {
            id: 1,
          },
        },
      ],
    })

    if (result.ok) {
      for (const token of result.value.tokens) {
        await scanTable.put(`eip-721:token:${token.id}`, JSON.stringify(token))
        await cell.write({ ...state, updateTime: Date.now(), lastId: token.id })
      }

      // If less than requested number of tokens was returned we indexed the
      // whole block otherwise we reached the limit.
      const done = result.value.tokens.length < PAGE_SIZE
      await cell.update(state => ({
        ...state,
        // If done update `endTime` otherwise set `updateTime` to `0` to mark
        // task idle.
        ...(done ? { endTime: Date.now() } : { updateTime: 0 }),
      }))

      return { ok: true, value: { done, scanned: result.value.tokens.length } }
    } else {
      throw new Error(result.error.map(error => error.message).join("\n"))
    }
  } catch (error) {
    // If error occured we updateTime to -1 to mark task errored. (We do not
    // really treat errored tasks different from idle tasks however we set
    // updateTime to -1 instead of 0 so we could distinguish between them)
    await cell.update(cursor => ({ ...cursor, updateTime: -1 }))
    return { ok: false, error: { message: error.message } }
  }
}

/**
 * @param {number} blockNumber
 * @returns {Cell<Scan.State>}
 */
export const init = blockNumber =>
  new Cell(scanState, `eip-721:block:${blockNumber}`)

/**
 * @param {FetchEvent} event
 * @param {Record<string, string>} params
 */
export const request = async ({ request }, params) => {
  try {
    const blockNumber = Number(params["blockNumber"])
    const result = await scan(blockNumber)
    return new JSONResponse(result)
  } catch (error) {
    return new JSONResponse({ ok: false, error: { message: error.message } })
  }
}
