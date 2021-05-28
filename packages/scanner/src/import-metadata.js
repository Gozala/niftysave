import { db } from "./sources.js"
import { mutate, query } from "./graphql.js"
import * as Result from "./result/lib.js"
import fetch from "@web-std/fetch"
import { CID } from "multiformats"
import * as Schema from "../sources/db/schema.js"
import * as IPFSURL from "./ipfs-url.js"
import * as Cluster from "./cluster.js"

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
      console.log(`✨ Processed batch of ${assets.length} assets`)
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
  const { _id, tokenURI } = asset
  console.log(`🔬 (${_id}) Parsing tokenURI`)
  const urlResult = parseURI(tokenURI)
  if (!urlResult.ok) {
    console.error(
      `🚨 (${_id}) Parseing URL failed ${urlResult.error}, report problem`
    )
    return await reportTokenAssetProblem(asset, "Has no tokenURI")
  }
  const url = urlResult.value

  console.log(`📡 (${_id}) Fetching content`)
  const fetchResult = await Result.fromPromise(fetchResource(url))

  if (!fetchResult.ok) {
    console.error(
      `🚨 (${_id}) Fetch failed ${fetchResult.error}, report problem`
    )
    return await reportTokenAssetProblem(asset, "fail to fetch")
  }

  console.log(`📑 (${_id}) Reading fetched content`)
  const readResult = await Result.fromPromise(fetchResult.value.text())

  if (!readResult.ok) {
    console.error(`🚨 (${_id}) Read failed ${readResult.error}, report problem`)
    return await reportTokenAssetProblem(asset, "failed to read")
  }
  const content = readResult.value

  console.log(`🧾 (${_id}) Parsing ERC721 metadata`)
  const parseResult = await Result.fromPromise(parseERC721Metadata(content))

  if (!parseResult.ok) {
    console.error(
      `🚨 (${_id}) Parse failed ${parseResult.error}, report problem`
    )
    return await reportTokenAssetProblem(asset, "failed to parse as json")
  }
  const metadata = parseResult.value

  console.log(`📍 (${_id}) Pin metadata in IPFS`)
  const pinOptions = {
    assetID: _id,
    ...(url.protocol !== "data:" && { sourceURL: url.href }),
  }

  const pinResult = IPFSURL.isIPFSURL(url)
    ? await Result.fromPromise(Cluster.pin(IPFSURL.cid(url), pinOptions))
    : await Result.fromPromise(Cluster.add(fetchResult.value))

  if (!pinResult.ok) {
    console.error(
      `🚨 (${_id}) Failed to pin ${pinResult.error}, report problem\n ${pinResult.error.stack}`
    )
    return await reportTokenAssetProblem(asset, "failed to pin")
  }
  const { cid } = pinResult.value
  console.log(`📌 Pinned matadata ${cid}`)
  metadata.cid = cid

  console.log(`📝 (${_id}) Recording metadata into db`)
  const result = await Result.fromPromise(
    importTokenMetadata({
      tokenAssetID: _id,
      metadata,
    })
  )

  if (!result.ok) {
    console.error(`💣 (${_id}) Failed to store metadata ${result.error}`)
    return await reportTokenAssetProblem(asset, "failed to add metadata")
  }

  return result.value
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
 * @param {URL} resourceURL
 * @returns {Promise<Blob>}
 */

const fetchResource = async resourceURL => {
  const url = IPFSURL.isIPFSURL(resourceURL)
    ? IPFSURL.embed(resourceURL)
    : resourceURL
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

  const imageResource = parseResource(image)

  /** @type {Schema.ResourceInput[]} */
  const assets = []

  /** @type {Schema.MetadataInput} */
  const metadata = { cid: "", name, description, image: imageResource, assets }
  for (const [value] of iterate({ ...metadata, image: null })) {
    const asset = typeof value === "string" && tryParseResource(value)
    if (asset) {
      assets.push(asset)
    }
  }

  return metadata
}

/**
 * @param {string} input
 * @returns {Schema.ResourceInput}
 */
const parseResource = input => {
  const url = new URL(input)
  if (url.protocol === "ipfs") {
    return {
      uri: input,
      cid: parseCIDFromIPFSURL(url).toString(),
    }
  } else {
    return { uri: input }
  }
}

/**
 *
 * @param {string} input
 * @returns
 */
const tryParseResource = input => {
  try {
    return parseResource(input)
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
