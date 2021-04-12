# @niftysave/vinyl

[![CI](https://github.com/nftstorage/niftysave/actions/workflows/main.yml/badge.svg)](https://github.com/nftstorage/niftysave/actions/workflows/main.yml)

## API

### `POST /api/record`

Record a found NFT.

Accepts an `application/json` body like:

```json
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
  },
  "assets": {
    /* assets extracted from the NFT metadata, including the metadata itself */
    "bafk...": { "pinStatus": "pinning" }
  }
}
```

No response data is returned.

### `POST /api/asset/:cid`

Update pinning status for an NFT asset.

Accepts an `application/json` body like:

```json
{
  "pinStatus": "queued | pinning | pinned | failed",
  "size": 1138
}
```

No response data is returned.
