/**
 * A type to show all keys directly when you have a type extending other types.
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
