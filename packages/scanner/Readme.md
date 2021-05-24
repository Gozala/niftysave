- Scanner pulls tokens from the erc-721 subgraph and populate DB with following records

  ```ts
  interface Token {
    tokenID: string
    mintTime: string
    contract: Contract
    
    metadata?: Metadata
  }

  interface Metadata {
    tokenURI: string
    content: null | MetadataContent
  }

  interface Contract {
    id: string
  }
  interface Owner {
    id: string
  }
  ```

- Scraper gets tokens with `metadata` that have `content == null`, and starts tasks that will attempt to get `MetadataContent`:

  ```ts
  type ScrapeJob =
    | { status: "idle" }
    | { status: "parsed-url" }
    | { status: "fetched", content: MetadataContent }
    | { status: "parse-failed", message: string }
    | { status: "fetch-failed", message: string }


  interface MetadataContent {
    name: string,
    description: string,
    image: Resource,
    assets: Resource[]
  }

  type Resource =
    | { status: "idle", url: string, cidInURL: string|null }
    | { status: "fetching", url: string, cidInURL: string|null }
    | { status: "pin-queued", url: string, cid: string }
    | { status: "pin-failed", url: string, cid: string }
    | { status: "pinned", url: string, cid: string }
  ```


