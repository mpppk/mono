import { ParseQueryString } from "./query-string";

export type ParseUrlParams<T> = T extends `${string}:${infer R}`
  ? R extends `${infer P}/${infer L}`
    ? P | ParseUrlParams<L>
    : R
  : never;

export type ToUrlParamPattern<T> = T extends `${infer O}:${infer R}`
  ? R extends `${string}/${infer L}`
    ? `${O}${string}/${ToUrlParamPattern<L>}`
    : `${O}${string}`
  : T;

type KV<
  M extends Record<string, string>,
  T extends string,
> = T extends `${infer K}=${infer V}`
  ? K extends keyof M
    ? V extends M[K]
      ? `${K}=${M[K]}`
      : never
    : never
  : never;
export type UrlQueryPattern<
  M extends Record<string, string>,
  T extends string,
> = T extends `${infer O}&${infer R}`
  ? `${KV<M, O>}&${UrlQueryPattern<M, R>}`
  : KV<M, T>;
export type UrlPattern<
  M extends Record<string, string>,
  T extends string,
> = T extends `${infer O}?${infer R}`
  ? `${ToUrlParamPattern<O>}?${UrlQueryPattern<M, R>}`
  : ToUrlParamPattern<T>;

export type ToUrlPattern<T> = T extends `${infer O}?${infer R}`
  ? `${ToUrlParamPattern<O>}?${ToUrlPattern<R>}`
  : ToUrlParamPattern<T>;

type UrlSchema = "http" | "https" | "data" | "blob" | "about" | "file";
type ParseHostAndPort<T> =
  T extends `${infer Host}:${infer Port extends `${number}`}`
    ? { host: Host; port: Port }
    : { host: T; port: undefined };
export type ParseOrigin<T> =
  T extends `${infer S extends UrlSchema}://${infer Rest}`
    ? // URL Schemaを含むケース
      Rest extends `${infer Prefix}/${infer Suffix}`
      ? ParseHostAndPort<Prefix> & { schema: S; path: `/${Suffix}` }
      : ParseHostAndPort<Rest> & { schema: S; path: `` }
    : // URL Schemaを含まないケース
      T extends string
      ? { schema: undefined; host: undefined; port: undefined; path: T }
      : never;

type SplitUrlAndQueryString<S extends string> =
  S extends `${infer URL}?${infer QS}`
    ? { url: URL; qs: QS }
    : { url: S; qs: never };

export type ParseURL<T extends string> = ParseOrigin<
  SplitUrlAndQueryString<T>["url"]
> & {
  query: SplitUrlAndQueryString<T>["qs"] extends string
    ? ParseQueryString<SplitUrlAndQueryString<T>["qs"]>
    : Record<string, never>;
};
