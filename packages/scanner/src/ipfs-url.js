/**
 * @typedef {URL & {protocol:'ipfs'}} IPFSURL
 * @param {URL} url
 * @returns {url is IPFSURL}
 */

export const isIPFSURL = url => url.protocol === "ipfs:"

/**
 *
 * @param {string} href
 * @returns {IPFSURL}
 */
export const parse = href => {
  const url = new URL(href)
  if (isIPFSURL(url)) {
    return url
  } else {
    throw new Error(`Not a valid ipfs url (must start with ipfs://): ${href}`)
  }
}

/**
 * @param {IPFSURL} url
 * @param {{gateway?:URL}} options
 */
export const embed = (
  { hostname, pathname, search, hash },
  { gateway = new URL("https://ipfs.io") } = {}
) => new URL(`/ipfs/${hostname}${pathname}${search}${hash}`, gateway)

/**
 * @param {IPFSURL} url
 * @returns {string}
 */
export const cid = url => url.hostname
