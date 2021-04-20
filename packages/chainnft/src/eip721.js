import { createClient } from "../generated/client/createClient.js"
import * as schema from "../generated/client/schema.js"
import * as result from "./result.js"

const ENDPOINT = new URL(
  "https://api.thegraph.com/subgraphs/name/nftstorage/eip721-subgraph"
)
export { schema }
const client = createClient({
  async fetcher({ query, variables }) {
    const response = await fetch(ENDPOINT.href, {
      method: "POST",
      headers: {
        // Authorization: 'bearer MY_TOKEN',
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    })

    return await response.json()
  },
})

/**
 * @param {schema.QueryRequest} query
 * @returns {Promise<result.Result<readonly import('graphql').GraphQLError[], schema.Query>>}
 */
export const query = async query => {
  const result = await client.query(query)
  if (result.data) {
    return { ok: true, value: result.data }
  } else {
    return { ok: false, error: result.errors || [] }
  }
}
