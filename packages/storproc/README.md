# @niftysave/storproc

[![CI](https://github.com/nftstorage/niftysave/actions/workflows/main.yml/badge.svg)](https://github.com/nftstorage/niftysave/actions/workflows/main.yml)
[![dependencies Status](https://status.david-dm.org/gh/nftstorage/niftysave.svg?path=packages%2Fstorproc)](https://david-dm.org/nftstorage/niftysave?path=packages/storproc)

Process that stores NFT assets on nft.storage.

## API

### `POST /api/nft`

Store NFT assets on https://nft.storage, record NFT information with [Vinyl](https://github.com/nftstorage/niftysave/tree/main/packages/vinyl) and register any pending assets with [Followup](https://github.com/nftstorage/niftysave/tree/main/packages/followup).

Accepts an `application/json` body like:

```js
{
  "info" : {
    /* on-chain information about the NFT */
    "chain": "eth",
    "contract": "0xb932a70a57673d89f4acffbe830e8ed7f75fb9e0",
    "tokenURI": "https://ipfs.pixura.io/ipfs/QmcaNzvacPR983ncCYgxuDUNgSLcdtkdo9gPqNXVYpQ9VH",
    "tokenID": "1138"
  },
  "metadata": {
    /* arbitrary metadata content for the NFT, might be in ERC-115 or ERC-721 if lucky */
  }
}
```

No data is returned in the response.
