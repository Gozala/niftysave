# @niftysave/followup

[![CI](https://github.com/nftstorage/niftysave/actions/workflows/main.yml/badge.svg)](https://github.com/nftstorage/niftysave/actions/workflows/main.yml)
[![dependencies Status](https://status.david-dm.org/gh/nftstorage/niftysave.svg?path=packages%2Ffollowup)](https://david-dm.org/nftstorage/niftysave?path=packages/followup)

Cron process that follows up on assets that are being pinned to get them pinned.

## API

### `POST /api/register`

Register an NFT asset for follow-up. This means periodically checking on its pinning status to see if it has completed pinning. Each status change is recorded to [Vinyl](https://github.com/nftstorage/niftysave/tree/main/packages/vinyl).

Assets which have not become pinned within 24 hours are marked as failed and never checked again.

Accepts an `application/json` body like:

```js
{
  "cid": "bafy...",
  "pinStatus": "queued | pinning | failed" // Note: NOT "pinned"
}
```

No response data is returned.
