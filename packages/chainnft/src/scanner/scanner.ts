import { Result } from "../result"

export interface Options {
  id: string
  searchSize: number
}

export interface Data {
  /**
   * ID scan started from
   */
  id: string

  /**
   * Number of tokens requested.
   */
  searchSize: number

  /**
   * Attempt number (starts with 1).
   */
  attempt: number

  /**
   * Time at which scan started.
   */
  startTime: number

  /**
   * Timestamp at which last update occured.
   */
  updateTime: number
}

export interface Pending extends Data {
  done: false
}

export interface Done extends Data {
  done: true
  result: Result<string, { next: string; n: number }>
}

export type State = Pending | Done
