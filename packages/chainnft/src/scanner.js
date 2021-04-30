import * as EIP721 from "./eip721.js"
import {
  timeBudget,
  pageSize,
  scanStore,
  tokenStore,
  cursorStore,
} from "./env.js"
import * as State from "./scanner/state.js"
import * as Result from "./result.js"

import * as Cell from "./util/cell.js"
import * as Table from "./util/table.js"
import { JSONResponse } from "./util/response.js"

export { State }

export const cursor = Cell.init(cursorStore, "id", "")

export const nfts = Table.init(
  tokenStore,
  /**
   * @param {EIP721.schema.Token} token
   */
  token => token.id
)

export const scanTable = Table.init(scanStore, State.stateKey)
/**
 * @param {State.Scanner.Options} options
 */
const fetchTokens = ({ id, searchSize }) =>
  EIP721.query({
    tokens: [
      {
        first: searchSize,
        orderBy: EIP721.schema.Token_orderBy.blockNumber,
        orderDirection: EIP721.schema.OrderDirection.asc,
        where: {
          tokenURI_not: "",
          id_gt: id,
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

/**
 * Starts new scan with given state.
 *
 * @param {State.Scanner.State} state
 * @param {Cell.Cell<State.Scanner.State>} cell
 * @returns {Promise<Result.Result<Error, string>>}
 */
const start = async (state, cell) => {
  await Cell.update(cell, State.updateTime)

  // Query the graph to fetch new tokens
  const result = await fetchTokens(state)

  // if success update time and store all the tokens
  if (result.ok) {
    await Cell.update(cell, State.updateTime)
    let next = state.id
    let count = 0
    for (const token of result.value.tokens) {
      const result = await Table.put(nfts, token)
      // If store succeeded continue to next one
      if (result.ok) {
        next = token.id
        count++
      } else {
        // if failed to write any tokens update task state to failed,
        // othrewise mark task as success with number of nfts it stored
        const update =
          count === 0
            ? await Cell.update(cell, s => State.fail(s, String(result.error)))
            : await Cell.update(cell, s => State.succeed(s, next, count))

        // If update failed give and return result otherwise break the loop
        if (!result.ok) {
          return result
        } else {
          break
        }
      }
    }

    // if some nfts were saved write last token id into a cursor
    await Cell.update(cell, s => State.succeed(s, next, count))
    if (count > 0) {
      await Cell.write(cursor, next)
    }
    return { ok: true, value: next }
  } else {
    return result
  }
}

/**
 * Resumes pre-existing scan.
 *
 * @param {State.Scanner.State} state
 * @param {Cell.Cell<State.Scanner.State>} cell
 * @returns {Promise<Result.Result<Error, string>>}
 */
const resume = async (state, cell) => {
  // If existing scan is completed succesfully just return new cursor
  // otherwise start a retry a scan again.
  if (state.done) {
    if (state.result.ok) {
      return { ok: true, value: state.result.value.next }
    } else {
      return await start(State.retry(state), cell)
    }
  }
  // If scan is still pending, calculate how much time from the budget
  // it has since it's last update. If some time is left wait for the
  // duration and return back the id, otherwise retry the task.
  else {
    const time = timeBudget - (Date.now() - state.updateTime)
    if (time > 0) {
      await new Promise(resolve => setTimeout(resolve, time))
      return { ok: true, value: state.id }
    } else {
      return await start(State.retry(state), cell)
    }
  }
}

/**
 * @param {number} deadline
 * @returns {Promise<Result.Result<Error, string>>}
 */
const scan = async deadline => {
  const result = await Cell.read(cursor)
  if (!result.ok) {
    return result
  }
  let id = result.value

  while (deadline - Date.now() > 0) {
    const init = State.init({ id, searchSize: pageSize })
    const cell = Table.cell(scanTable, init)
    const read = await Cell.read(cell)
    if (!read.ok) {
      return read
    }
    const state = read.value

    const result =
      state === init ? await start(init, cell) : await resume(state, cell)

    if (!result.ok) {
      return result
    }

    const next = result.value
    if (id === next) {
      break
    } else {
      id = next
    }
  }

  return { ok: true, value: id }
}

/**
 * @param {number} deadline - Unix timestamp.
 */
export const activate = async deadline => {
  console.log("START CRON JOB")
  const result = await scan(deadline)
  console.log("FINISHED JOB")
  if (!result.ok) {
    throw result.error
  }
}

export const request = async () => {
  const result = await scan(Date.now() + timeBudget / 2)
  return new JSONResponse(result)
}
/**
 * @param {ScheduledEvent} event
 */
export const spawn = event =>
  event.waitUntil(activate(event.scheduledTime + timeBudget))
