# @niftysave/storproc

[![CI](https://github.com/nftstorage/niftysave/actions/workflows/main.yml/badge.svg)](https://github.com/nftstorage/niftysave/actions/workflows/main.yml)

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
