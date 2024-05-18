import { z } from "zod";
import { StatusCode, TResponse } from "./hono-types";

export type ApiResponses = Partial<Record<StatusCode, z.ZodTypeAny>>;
type ApiResSchema<
  AResponses extends ApiResponses,
  SC extends keyof AResponses & StatusCode,
> = AResponses[SC] extends z.ZodTypeAny ? AResponses[SC] : never;
type ApiClientResponses<AResponses extends ApiResponses> = {
  [SC in keyof AResponses & StatusCode]: TResponse<
    z.infer<ApiResSchema<AResponses, SC>>,
    SC,
    "json"
  >;
};
export type MergeApiResponses<AR extends ApiResponses> =
  ApiClientResponses<AR>[keyof ApiClientResponses<AR>];

export interface ApiSpec<
  Params extends z.ZodTypeAny = z.ZodTypeAny,
  Body extends z.ZodTypeAny = z.ZodTypeAny,
  Response extends ApiResponses = Partial<Record<StatusCode, z.ZodTypeAny>>,
> {
  params?: Params;
  body?: Body;
  res: Response;
}

export type ApiSpecRes<
  AS extends ApiSpec | undefined,
  SC extends StatusCode,
> = AS extends ApiSpec
  ? AS["res"][SC] extends z.ZodTypeAny
    ? z.infer<AS["res"][SC]>
    : never
  : never;

export type Method =
  | "get"
  | "post"
  | "put"
  | "delete"
  | "patch"
  | "options"
  | "head";
export type ApiEndpoints<Path extends string = string> = Record<
  Path,
  Partial<Record<Method, ApiSpec>>
>;
