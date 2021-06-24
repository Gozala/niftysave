# Niftysave

Scans ethereum for [ERC-721][] Non-Fungible Tokens and replicates all assets
by saving them on [nft.storage][].

## Overview

### Ingestion

Cron job named `ERC721` runs periodically _(on github CI)_.
It performs following steps until it runs out of time and then exits:

1. Pull batch of tokens by querying [EIP721 Subgraph][].
2. Import pulled batch into Fauna DB via `importERC721` GraphQL endpoint.

Fauna does most of the heavy lifting here, specifically `importERC721` User Defined Function (UDF) does following:

1. Stores each token owner into an `Owner` collection.
2. Stores each token contract into a `TokenContract` collection.
3. Stores actual token details _(`tokenID`, `tokenURI`, `mintTime`)_ in a `Token` collection.
4. Cross links all of the above _(so that graph can be queried in any direction)_.
5. Stores import result into `ERC721ImportResult` collection and cross-links with all the tokens it imported.
6. Updates the `Cursor` record (which is used next time around by the job to query subgraph from that position).

### Analysis

Cron job named `Token Metadata` runs runs periodically _(on github CI)_. It goes over tokens that were ingested and attempts to analyze token metadata assumed to be linked through `tokenURI`. It pulls batches of not yet analyzed tokens from the db via `findTokenAssets` GraphQL query and performs the following steps concurrently across all tokens:

1. Parse `token.tokenURI`, if failed just report an error.
2. Fetch contents of URL (If it is `ipfs://` url or a IPFS gateway URL fetch from `https://ipfs.io/ipfs` otherwise from the actual URL). If failed report an error.
3. Parse contents as metadata JSON, if failed report an error.
4. Pin contents of `token.tokenURI` to IPFS cluster. (By CID if it was IPFS or IPFS Gateway URL otherwise by uploading content).
5. Pull out all the URLs found in metadata.
6. Submit metadata and all the linked assets to DB via `importTokenMetadata` GraphQL mutation.

As a result some tokens will be marked problematic due to errors reported and some will get associated entries in `Metadata` and `Resource` collections.

### Saving

Cron job named `Token Asset` runs periodically _(on github CI)_. It goes over discovered resources that were linked from token metadata and attempts to replicate them in IPFS cluster. It pulls batch of linked resources from db via `findResources` GraphQL query and concurrently save each one via following steps:

1. Parse `resource.uri`, on failure mark resource problematic.
2. If parsed URL is an `ipfs://` or IPFS gateway URL extract IPFS path and pin it on cluster.
3. If parsed URL is not recognized as above attempt to download content from it. If failed mark resource problematic.
4. Upload content to IPFS cluster for pinning.
5. Update `resource` in DB to include `cid` and `ipfsURL`.

## Database

[Fauna DB][] is used as a storage layer and jobs interact with it through
GraphQL API. Invariants are upheld through User Defined Functions (UDF)s which
are exposed as custom mutations over GraphQL.

### DB Schema & UDFs

Fauna schema and functions are organized under `./fauna/resources` directory.[fauna-schema-migrate][] is used to generate schema migrations (at `./fauna/migrations/*`) and/or apply those to a target database.

#### How to

If you need to add new collection/index/function create a corresponding file in
`./fauna/resources/*`, under `Collection/Index/Function` directory. File should
be named same as a `collection/index/function` and have a `.fql` extension. E.g.
function named `boom` would go into `./fauna/resources/Function/boom.fql`.

If you need to modify a function just edit the corresponding file.

If need to modify an index **think again**, most likely you should create a new
index instead.

If you need to modify a collection, please do not.

It is expected that pull request will contain generated files in `fauna/migrations`
which you can do by running `fauna-schema-migrate generate`. Unless there is a
good reason (if so please call it out in the PR summary) generate a single
migration (if you have generated several during development you can just delete
them and generate new one).

### GraphQL

GraphQL schema is defined at `./fauna/schema.graphql`. It is used to generate
most collections and indexes in the DB. It necessary to enable GraphQL endpoint.
Unfortunately [fauna-schema-migrate][] currently does not have GraphQL schema support.
To work around this limitation, you can first apply GraphQL schema changes to the
DB _(by running `yarn update-graphql-schema`)_ and then download schema changes
from the DB by running `yarn import-db`.

> **Note:** import-db script generates a file in `./fauna/resources/` directory for each colection/index/function. By default it will not overwrite existing files, and script will exit with code `1` when conflicting files exist. This is to avoid accidentaly overwriting changes you may have made.
>
> In cases where you just added new types above should be just fine. In more rare cases e.g. when you change GraphQL directives this may not be enough. In such case you will need to run `yarn import-db -- --overwrite` instead, but be aware that it **WILL OVERWRITE ALL** files in `./fauna/resources/` (becuse it just pull all defs from DB where no formatting or comments are retained). In these cases you would need to cherry-pick relevant changes and commit those in git.

### Settings

Code in the package assumes following environment variables which you can add to `./.env` file.

- `FAUNA_KEY` - Your fauna db access token.
- `IPFS_CLUSTER_KEY` - HTTP basic auth token for IPFS Cluster (base64 encoded).
- `BATCH_SIZE` - Number of tokens scanner will pull at a time.
- `TIME_BUDGET` - Time budget in seconds (task will abort once out of time).

### Development

Please do not change the schema or run untested code on a production database as you may corrupt data. Instead use a second (or your own) dev db instance. You should be
able to get new DB into a compatible shape by applying schema migrations.

[fauna-schema-migrate]: https://github.com/fauna-labs/fauna-schema-migrate
[erc-721]: https://eips.ethereum.org/EIPS/eip-721
[nft.storage]: https://nft.storage/
[eip721-subgraph]: https://thegraph.com/explorer/subgraph/nftstorage/eip721-subgraph
[fauna db]: https://fauna.com/
