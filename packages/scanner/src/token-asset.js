import { db } from "./sources.js"
import { mutate, query } from "./graphql.js"
import * as Result from "./result/lib.js"
import fetch from "@web-std/fetch"
import { CID } from "multiformats"
import * as Schema from "../sources/db/schema"

/**
 * @param {Object} options
 * @param {number} options.budget - Time budget
 * @param {number} options.batchSize - Number of tokens in each import
 */
export const spawn = async ({ budget, batchSize }) => {
  const deadline = Date.now() + budget
  while (deadline - Date.now() > 0) {
    console.log("🔍 Fetching token assets that were queued")
    const assets = await fetchTokenURIs({ batchSize })
    if (assets.length === 0) {
      return console.log("🏁 Finish, no more queued task were found")
    } else {
      console.log(`🤹 Spawn ${assets.length} tasks to process fetched assets`)
      const results = assets.map(processTokenAsset)
      await Promise.all(results)
      console.log(`✨ Processed batch of assets`)
    }
  }
  console.log("⌛️ Finish, time is up")
}

/**
 * @typedef {{ tokenURI:string, _id:string }} TokenAsset
 *
 * @param {Object} options
 * @param {number} options.batchSize
 * @returns {Promise<TokenAsset[]>}
 */

const fetchTokenURIs = async ({ batchSize }) => {
  const result = await query(db, {
    findTokenAssets: [
      {
        where: {
          status: Schema.TokenAssetStatus.Queued,
        },
        _size: batchSize,
      },
      {
        data: {
          _id: 1,
          tokenURI: 1,
        },
      },
    ],
  })

  const assets =
    /** @type {TokenAsset[]} */
    (Result.value(result).findTokenAssets.data.filter(Boolean))

  return assets
}

/**
 * @param {Schema.TokenMetadataImportInput} input
 */
const importTokenMetadata = async input => {
  const result = await mutate(db, {
    importTokenMetadata: [
      { input },
      {
        _id: 1,
      },
    ],
  })

  return Result.value(result).importTokenMetadata._id
}
/**
 * @param {TokenAsset} asset
 */
const processTokenAsset = async asset => {
  const parse = parseURI(asset.tokenURI)
  if (!parse.ok) {
    return await reportTokenAssetProblem(asset, "Has no tokenURI")
  }
  const url = parse.value
  const fetch = await fetchResource(url)
    .then(Result.ok)
    .catch(Result.error)

  if (!fetch.ok) {
    return await reportTokenAssetProblem(asset, "fail to fetch")
  }

  const read = await fetch.value
    .text()
    .then(Result.ok)
    .catch(Result.error)

  if (!read.ok) {
    return await reportTokenAssetProblem(asset, "failed to read")
  }

  const erc721 = await parseERC721Metadata(read.value)
    .then(Result.ok)
    .catch(Result.error)

  if (!erc721.ok) {
    return await reportTokenAssetProblem(asset, "failed to parse as json")
  }

  await importTokenMetadata({
    tokenAssetID: asset._id,
    metadata: erc721.value,
  })
}

/**
 *
 * @param {string} uri
 */
const parseURI = uri => {
  try {
    return Result.ok(new URL(uri))
  } catch (error) {
    return Result.error(error)
  }
}

/**
 * @param {URL} url
 */

const fetchResource = async url => {
  const response = await fetch(url.href)
  if (response.ok) {
    return await response.blob()
  } else {
    throw new Error(
      `Fetch error: Status ${response.status} ${response.statusText}`
    )
  }
}

/**
 * @param {string} content
 */
const parseERC721Metadata = async content => {
  const json = JSON.parse(content)
  const { name, description, image } = json
  if (typeof name !== "string") {
    throw new Error("name field is missing")
  }
  if (typeof description !== "string") {
    throw new Error("descript field is missing")
  }
  if (typeof image !== "string") {
    throw new Error("image field is missing")
  }

  const imageResource = readResource(image, ["image"])

  /** @type {Resource[]} */
  const assets = []

  /** @type {Schema.MetadataInput} */
  const metadata = { name, description, image: imageResource, assets }
  for (const [value, path] of iterate({ ...metadata, image: null })) {
    const asset = typeof value === "string" && tryReadResource(value, path)
    if (asset) {
      assets.push(asset)
    }
  }

  return metadata
}

/**
 * @typedef {{uri:string, cid?: string, path:string}} Resource
 * @param {string} input
 * @param {PropertyKey[]} path
 * @returns {Resource}
 */
const readResource = (input, path) => {
  const url = new URL(input)
  if (url.protocol === "ipfs") {
    return {
      uri: input,
      cid: parseCIDFromIPFSURL(url).toString(),
      path: path.join("."),
    }
  } else {
    return { uri: input, path: path.join() }
  }
}

/**
 *
 * @param {string} input
 * @param {PropertyKey[]} path
 * @returns
 */
const tryReadResource = (input, path) => {
  try {
    return readResource(input, path)
  } catch (error) {
    return null
  }
}

/**
 * @param {URL} url
 */

const parseCIDFromIPFSURL = url => {
  const [_root, _ipfs, cid] = url.pathname.split("/")
  return CID.parse(cid || "")
}

/**
 * @param {Object} data
 * @param {PropertyKey[]} [path]
 * @returns {Iterable<[string|number|boolean|null, PropertyKey[]]>}
 */
const iterate = function*(data, path = []) {
  if (Array.isArray(data)) {
    for (const [index, element] of data) {
      yield* iterate(element, [...path, index])
    }
  } else if (data && typeof data === "object") {
    for (const [key, value] of Object.entries(data)) {
      yield* iterate(value, [...path, key])
    }
  } else {
    yield [data, path]
  }
}

/**
 *
 * @param {TokenAsset} asset
 * @param {string} problem
 */
const reportTokenAssetProblem = async (asset, problem) => {
  const result = await mutate(db, {
    reportTokenAssetProblem: [
      {
        input: {
          tokenAssetID: asset._id,
          problem,
        },
      },
      {
        _id: 1,
      },
    ],
  })

  return Result.value(result).reportTokenAssetProblem._id
}
