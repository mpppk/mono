import { ApiEndpoints, ApiResponses, ApiResSchema, Method } from "./spec";
import { StatusCode, ClientResponse } from "./hono-types";
import { z } from "zod";

interface TRequestInit<M extends Method> extends RequestInit {
  method?: M;
}

type ApiClientResponses<AResponses extends ApiResponses> = {
  [SC in keyof AResponses & StatusCode]: ClientResponse<
    z.infer<ApiResSchema<AResponses, SC>>,
    SC,
    "json"
  >;
};
export type MergeApiResponses<AR extends ApiResponses> =
  ApiClientResponses<AR>[keyof ApiClientResponses<AR>];

type UrlSchema = "http" | "https" | "about" | "blob" | "data" | "file";
type UrlPrefix = `${UrlSchema}://` | "";
type URL = `${UrlPrefix}${string}`;
export type TFetch<Origin extends URL, E extends ApiEndpoints> = <
  Path extends keyof E & string,
  M extends Method = "get",
>(
  input: `${Origin}${Path}`,
  init?: TRequestInit<M>,
  // FIXME: NonNullable
) => Promise<MergeApiResponses<NonNullable<E[Path][M]>["res"]>>;
