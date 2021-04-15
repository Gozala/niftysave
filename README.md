# niftysave

[![CI](https://github.com/nftstorage/niftysave/actions/workflows/main.yml/badge.svg)](https://github.com/nftstorage/niftysave/actions/workflows/main.yml)

Saving the NFTs by storing them on [nft.storage](https://nft.storage).

<img src="https://raw.githubusercontent.com/nftstorage/niftysave/main/diagram.png" alt="Diagram of niftysave architecture." />

* ChaiNFT λ
    * Inspects a chain between 2 epochs, finds NFTs and returns info about them.
    * Chain type (ETH), offset & limit (max 100)
* Orch ⏰λ
    * Manages scraping and storing.
    * Calls ChaiNFT from last epoch to current epoch.
        * Limit 100 epochs per "page"
        * For each NFT...
            * Calls StorProc.
* StorProc λ
    * Accepts NFT on-chain info and the NFT's metadata.json.
    * Calls Vinyl to record NFT existence.
    * Extracts storable links.
        * For each link.
            * If URL then download data.
            * Calls nft.storage `/upload` or `/pin` depending on link type.
            * Calls Vinyl to update pin status for asset.
        * Calls Followup, passing CIDs of assets not already pinned.
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
* Promulgate λ + ⏰λ
    * Periodic recounts of metrics, totals cached in KV store.
    * Exposes prometheus metrics endpoint.

## Components

* [StorProc](https://github.com/nftstorage/niftysave/tree/main/packages/storproc)
* [Vinyl](https://github.com/nftstorage/niftysave/tree/main/packages/vinyl)
* [Followup](https://github.com/nftstorage/niftysave/tree/main/packages/followup)
* Orch (soon)
* ChaiNFT (soon)
* Promulgate (soon)
