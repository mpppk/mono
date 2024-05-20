import { z } from "zod";
import { StatusCode } from "./hono-types";

export type ApiResponses = Partial<Record<StatusCode, z.ZodTypeAny>>;
export type ApiResSchema<
  AResponses extends ApiResponses,
  SC extends keyof AResponses & StatusCode,
> = AResponses[SC] extends z.ZodTypeAny ? AResponses[SC] : never;

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
export type ApiEndpoints<Path extends string = string> = Record<
  Path,
  Partial<Record<Method, ApiSpec>>
>;
