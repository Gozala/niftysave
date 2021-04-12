# @niftysave/followup

[![CI](https://github.com/nftstorage/niftysave/actions/workflows/main.yml/badge.svg)](https://github.com/nftstorage/niftysave/actions/workflows/main.yml)

## API

### `POST /api/register`

Register an NFT asset for follow-up. This means periodically checking on its pinning status to see if it has completed pinning. Each status change is recorded to [Vinyl](https://github.com/nftstorage/niftysave/tree/main/packages/vinyl).

Assets which have not become pinned within 4 hours are marked as failed and never checked again.

Accepts an `application/json` body like:

```json
{
  "cid": "bafy...",
  "pinStatus": "queued | pinning | failed" // Note: NOT "pinned"
}
```

No response data is returned.
