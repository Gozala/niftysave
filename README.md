# Niftysave

Scans ethereum for [ERC-721][] Non-Fungible Tokens and replicates all assets
by saving them on [nft.storage][].

## Overview

### Ingestion

Cron job named `ERC721` runs periodically _(on github CI)_.
It performs following steps until it runs out of time and then exits:

1. Pull batch of tokens by querying [EIP721 Subgraph][].
2. Import pulled batchinto Fauna DB via `importERC721` GraphQL endpoint.

Fauna does most of the heavy lifting here, specifically `importERC721` User Defined Function (UDF) does following:

1. Stores each token owner into an `Owner` collection.
2. Stores each token contract into a `TokenContract` collection.
3. Stores actual token details _(`tokenID`, `tokenURI`, `mintTime`)_ in a `Token` collection.
4. Cross links all of the above _(so that graph can be queried in any direction)_.
5. Stores import result into `ERC721ImportResult` collection and cross-links with all the tokens it imported.
6. Updates the `Cursor` record (which is used next time around by the job to query subgraph from that position).

### Analysis

Cron job named `Token Metadata` runs runs periodically _(on github CI)_. It goes over tokens that were ingested and attempts to analyze token metadata assumed to be linked throug `tokenURI`. It pulls batch of not yet analyzed tokens from db via `findTokenAssets` GraphQL query and performs following steps concurrently across all tokens:

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

## Hacking

> ⚠️ Please do not change schema or run untested code on a production database as
> you may corrupt data. Instead configure your environment to use dev db instance.

### Environment

You will need to setup environment with variables listed below.

> Recommended way is through `./.env` file.

- `FAUNA_KEY` - Your fauna db access token.
- `IPFS_CLUSTER_KEY` - Access token for IPFS cluster.
- `BATCH_SIZE` - Number of tokens scanner will pull at a time.
- `TIME_BUDGET` - Time budget in seconds (task will abort once out of time).

### Setting up new/test database

1. Create a new database at https://dashboard.fauna.com/
2. Generate access token in database settings (under security tab) and assign it to `FAUNA_KEY` env varibale (in `./.env` file).
3. Get db schema up to date by running `yarn setup`. It will apply all db migrations to get it up to date with a schema.

### Schema

Database schema is primarily driven by GraphQL which schema. To make changes to
the schema edit `./fauna/resources/schema.graphql` file and then run `yarn update-schema` which will:

1. Reflect schema changes in DB (⚠️ Remember to use dev db).
2. Download and organize new database collections/indexes/functions at `./fauna/resources` directory.

> Each collection/index/function is written in file under corresponding
> directory with a same named and `.fql` extension. E.g. function named `boom`
> would be located at `./fauna/resources/Function/boom.fql`.

If you only wanted to change schema than only other thing you'd need to do is
generate a migration by running `yarn create-migration` script. That would
create a directory under `./fauna/migrations/` and will contain changes made.

> Make sure to include generated migration with a pull request.

### User Defined Functions (UDF)s

As alluded to in above section, all the UDFs will be organized in
`./fauna/resources/Function` directory. Each file containing single function
with a name of the file.

You can modify existing functions or create new ones, once done you will need to
generate a migration by running `yarn create-migration` script.

### Indexes

Fauna does not really support changing indexes, if you find yourself in need to
do that it is likely that you'd be better of create a new index instead.

Creating new indexes just requires creating a corresponding file, e.g. index
named `allTokens` would require creating `./fauna/resources/Index/allTokens.fql`
file with a single `CreateIndex` expression.

> Note: Often times @index graphql directive in the schema would do a trick.

### Collections

You would probably never need to modify or create new collection manually, as
they are generated from GraphQL schema.

### Preparing pull request

Typically you would combine schema changes with function changes and possibly
accompany them with new indexes. Best practice is to do these as follows:

- Start with changing a schema. Anything but bugfix will require graphql
  entrypoint query or mutation so it's a best place to start.
- Push schema changes by running `yarn update-schema`. That would also pull all
  new functions/collections/indexes into your repo.
- Modify / create functions. Above step would bring some new functions and here
  you'd modify them and maybe introduce some new functions to ficilitate reuse.
- Create necessary indexes. Your new functions often would need indexes and
  likely you'll create them as you write those functions.
- Creating a migration by running `yarn create-migration`, which will generate a
  directory in `./fauna/migrations` which needs to be included in pul request.

[fauna-schema-migrate]: https://github.com/fauna-labs/fauna-schema-migrate
[erc-721]: https://eips.ethereum.org/EIPS/eip-721
[nft.storage]: https://nft.storage/
[eip721-subgraph]: https://thegraph.com/explorer/subgraph/nftstorage/eip721-subgraph
[fauna db]: https://fauna.com/
