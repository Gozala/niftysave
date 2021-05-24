export type Result<X, T> = Failure<X> | Success<T>

export interface Failure<X> {
  ok: false
  error: X
}

export interface Success<T> {
  ok: true
  value: T
}

export declare function unwrap<X, T>(result: Result<X, T>): T