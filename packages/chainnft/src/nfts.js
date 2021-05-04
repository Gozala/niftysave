import * as EIP721 from "./eip721.js"
import { JSONResponse } from "./util/response.js"

/**
 * @param {FetchEvent} _event
 */
export const fetch = async _event => {
  const result = await EIP721.query({
    tokens: [
      {
        first: 10,
        block: { number: 12241391 },
        where: { tokenURI_not: "" },
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
    return JSONResponse.ok(result.value.tokens)
  } else {
    return JSONResponse.error(result.error)
  }
}
