import {
  ApiEndpoints,
  ApiResponses,
  ApiResSchema,
  MatchedPatterns,
  Method,
} from "./spec";
import { StatusCode, ClientResponse } from "./hono-types";
import { z } from "zod";
import { ParseURL, ToUrlParamPattern } from "./url";

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
type OriginPattern = `${UrlPrefix}${string}`;
export type TFetch<Origin extends OriginPattern, E extends ApiEndpoints> = <
  Input extends `${Origin}${string}`,
  InputPath extends ParseURL<Input>["path"],
  CandidatePaths extends MatchedPatterns<E, InputPath>,
  M extends Method = "get",
>(
  input: ToUrlParamPattern<Input>,
  init?: TRequestInit<M>,
  // FIXME: NonNullable
) => Promise<MergeApiResponses<NonNullable<E[CandidatePaths][M]>["res"]>>;
