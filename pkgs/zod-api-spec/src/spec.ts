import { z } from "zod";
import { StatusCode } from "./hono-types";
import { ParseUrlParams } from "./url";

export type ApiResponses = Partial<Record<StatusCode, z.ZodTypeAny>>;
export type ApiResSchema<
  AResponses extends ApiResponses,
  SC extends keyof AResponses & StatusCode,
> = AResponses[SC] extends z.ZodTypeAny ? AResponses[SC] : never;

type ZodTypeWithKey<Key extends string> = z.ZodType<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Record<Key, any>,
  z.ZodTypeDef,
  Record<Key, string>
>;
export interface ApiSpec<
  ParamKeys extends string = string,
  Params extends ZodTypeWithKey<NoInfer<ParamKeys>> = ZodTypeWithKey<
    NoInfer<ParamKeys>
  >,
  Query extends z.ZodTypeAny = z.ZodTypeAny,
  Body extends z.ZodTypeAny = z.ZodTypeAny,
  Response extends ApiResponses = Partial<Record<StatusCode, z.ZodTypeAny>>,
> {
  query?: Query;
  params?: Params;
  body?: Body;
  res: Response;
}

export const Method = [
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "options",
  "head",
] as const;
export type Method = (typeof Method)[number];
export type ApiEndpoints = {
  [K in string]: Partial<Record<Method, ApiSpec<ParseUrlParams<K>>>>;
};
