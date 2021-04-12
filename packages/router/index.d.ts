export type Handler = (event: FetchEvent, params: Record<string,string>) => Promise<Response> | Response
export type Condition = (req: Request) => boolean | Record<string,string>
export type BasicHandler = (req: Request) => Response
export type ErrorHandler = (req: Request, err: Error) => Response
export type ResponseHandler = (req: Request, rsp: Response) => Response

export class Router {
  constructor (options?: { onNotFound?: BasicHandler, onError?: ErrorHandler })
  add (method: string, route: string, handler: Handler, postHandlers?: ResponseHandler[]): void
  resolve (req: Request): [Handler|false, Record<string,string>, ResponseHandler[]]
  route (event: FetchEvent): Promise<Response>
  listen (event: FetchEvent): void
}

export * from './cors.js'
