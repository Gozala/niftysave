# @niftysave/storproc

[![CI](https://github.com/nftstorage/niftysave/actions/workflows/main.yml/badge.svg)](https://github.com/nftstorage/niftysave/actions/workflows/main.yml)
[![dependencies Status](https://status.david-dm.org/gh/nftstorage/niftysave.svg?path=packages%2Fstorproc)](https://david-dm.org/nftstorage/niftysave?path=packages/storproc)

Process that stores an asset on nft.storage.

## API

### `POST /api/store`

Store an asset on https://nft.storage.

Accepts an `application/json` body like:

```json
{ "asset" : "CID or URL" }
```

Returns a repsonse like:

```json
{ "cid": "bafy...", "pinStatus": "queued | pinning | pinned | failed" }
```
