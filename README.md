# niftysave

[![CI](https://github.com/nftstorage/niftysave/actions/workflows/main.yml/badge.svg)](https://github.com/nftstorage/niftysave/actions/workflows/main.yml)

Saving the NFTs by storing them on [nft.storage](https://nft.storage).

<img src="https://raw.githubusercontent.com/nftstorage/niftysave/main/diagram.png" alt="Diagram of niftysave architecture." />

* ChaiNFT λ
    * Inspects a chain between 2 epochs, finds NFTs and returns info about them.
    * Chain type (ETH), offset & limit (max 100)
* StorProc λ
    * Accepts a link to something storable, like a URL, a CID, whatever, and attempts to store it on nft.storage.
    * This will likely be using the pinning service API so success may not be instant.
    * Returns CID and pin status.
* Vinyl λ
    * Records information and pin status for assets of an NFT.
    * Create logs existence and expected followup calls.
    * Update changes pin status.
    * Can write to KV or PostgreSQL or whatever.
* Followup λ + ⏰λ
    * Register for periodic checks to ensure a CID eventually gets pinned.
    * API simply accepts and stores a CID+NFTID to check.
    * Cron:
        * For each cid...
            * Get pinning status from nft.storage.
            * Call Vinyl if changed.
            * If failed, resubmit.
            * Update last check time and resubmit count.
            * If too old or too resubmitted then call Vinyl to log perma-fail.
* Orch ⏰λ
    * Manages scraping and initial storing.
    * Call ChaiNFT from last epoch to current epoch.
        * Limit 100 epochs per "page"
        * For each NFT...
            * Call Vinyl to log existence.
            * Extract storable links.
            * For each link.
                * Call StorProc.
                * Call Vinyl to update pin status for asset.
                * Call Followup iff asset is not already pinned.
* Promulgate λ + ⏰λ
    * Periodic recounts of metrics, totals cached in KV store.
    * Exposes prometheus metrics endpoint.

Docs and code for each component:

* [StorProc](https://github.com/nftstorage/niftysave/tree/main/packages/storproc)
* [Vinyl](https://github.com/nftstorage/niftysave/tree/main/packages/vinyl)
* [Followup](https://github.com/nftstorage/niftysave/tree/main/packages/followup)
* Orch (soon)
* ChaiNFT (soon)
* Promulgate (soon)
