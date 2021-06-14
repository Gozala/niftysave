# Setup

Code in the package assumes that you either have have a `./.env` file with following variables or that they are set as regular environment variables.

- `FAUNA_KEY` - Your fauna db access token.
- `IPFS_CLUSTER_KEY` - Access token for IPFS cluster.
- `BATCH_SIZE` - Number of tokens scanner will pull at a time.
- `TIME_BUDGET` - Time budget in seconds (task will abort once out of time).

## Development

### DB Schema / functions

Fauna schema and functions are organized under `./fauna/resources` directory and [fauna-schema-migrate][] is used to generate schema migrations (at `./fauna/migrations/*`) and apply those to the database.

If you need to add new collections/indexes/functions create a corresponding files in the under `./fauna/resources/*`, where directory corresponds to the type of the construct and file name corresponds to the name of the name it. E.g. function named `boom` would go into `./fauna/resources/Function/boom.fql`.

If you need to modify a function just edit the file corresponding to it. If need to modify an index **think again**, most likely it is best to create a new index instead. Most likely you do no neet to modify collection.

Before submitting a pull request, generate a migration by running `fauna-schema-migrate generate` which will create a directory in the `./fauna/migrations/` directory with bunch of code. Unless there is a good reason (if so please comment call it out in the PR) generate a single migration per PR.

### GraphQL Schema

GraphQL schema is defined at `./fauna/schema.graphql`. It is used by Fauna's GraphQL endpoint and bunch of collections/indexes/functions are generate from it. Unfortunately [fauna-schema-migrate][] does not currently have GraphQL schema support. To work around that, you can apply GraphQL schema changes to the DB by running `update-graphql-schema`, then import added things from DB by running `yarn import-db`.

> import-db script will generate files in `./fauna/resources/` directory for every colection/index/function. It will not overwrite existing files and script will exit with 1 if conflicting files exist. That avoids overwriting changes you may have made.
>
> This works ok in cases where you've introduced new collections / indexes / functions in the graphql schema as those would go into new files. In case you modified existing types in GraphQL, and you really do need to apply changes to `./fauna/resources` you can still do it by passing an option `yarn import-db -- --overwrite`. In that case you would want to make sure that your changes are commited to git so that you can see change that import made and discard unrelated ones (unfortunately you'll have those because script pull evenrything from the DB and has no regard for identation, so basically it will overwrite everything).

### Testing

Please do not test on the live database, instead use a second dev DB to avoid data corruption in the live db. You should be able to get new DB into same shape by applying schema migrations.

[fauna-schema-migrate]: https://github.com/fauna-labs/fauna-schema-migrate
