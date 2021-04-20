import * as Scan from "./scan.js"
import { Cell } from "../util/cell.js"
import { PAGE_SIZE, scanState, scanTable } from "../env.js"
import * as EIP721 from "../eip721.js"
import { JSONResponse } from "../util/response.js"

const MIN = 1000 * 60

/**
 * Returns status of the scan. If no updates were reported with-in
 * last 30mins it is considered `'idle'`. Otherwise it is `'complete'` if
 * `endTime` is set and `'active'` if not.
 *
 * @param {Scan.State} state
 */
export const status = state => {
  if (state.endTime !== null) {
    return "complete"
  } else if (Date.now() - state.updateTime < 30 * MIN) {
    return "active"
  } else {
    return "idle"
  }
}

/**
 * @param {number} head
 * @param {Scan.State} state
 */
export const scan = async (head, state) => {
  const cell = init(state.blockNumber)
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

      // If less than requested number of tokens was returned and we're not
      // scanning the last block then we have exhasted this block.
      if (result.value.tokens.length < PAGE_SIZE) {
        cell.update(state => ({ ...state, endTime: Date.now() }))
      }
      // Otherwise we just mark cursor idle and exit.
      else {
        await cell.update(state => ({ ...state, updateTime: 0 }))
      }
    }
  } catch (error) {
    await cell.update(cursor => ({ ...cursor, updateTime: -1 }))
  }
}

/**
 * @param {number} blockNumber
 * @returns {Cell<Scan.State>}
 */
export const init = blockNumber =>
  new Cell(scanState, `eip-721:block:${blockNumber}`)

/**
 * @param {number} lastBlock - last known block number
 * @param {Scan.State} state
 */

export const resume = (lastBlock, state) => scan(lastBlock, state)

/**
 * @param {number} lastBlock - Last known block number
 * @param {number} blockNumber - Block number to scan
 */
export const start = (lastBlock, blockNumber) =>
  scan(lastBlock, {
    blockNumber,
    lastId: "",
    startTime: Date.now(),
    updateTime: Date.now(),
    endTime: null,
  })

/**
 * @param {FetchEvent} event
 * @param {Record<string, string>} params
 */
export const request = async ({ request }, params) => {
  try {
    const blockNumber = Number(params["blockNumber"])
    const { lastBlock } = await request.json()
    const cell = init(blockNumber)
    const state = await cell.read(null)
    if (state == null) {
      await start(lastBlock, blockNumber)
    } else {
      await resume(lastBlock, state)
    }
    return new JSONResponse({ ok: true, value: undefined })
  } catch (error) {
    return new JSONResponse({ ok: false, error: { message: error.message } })
  }
}
