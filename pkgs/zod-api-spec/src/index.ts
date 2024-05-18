import { z } from "zod";
import { RequestHandler, Router } from "express";
import { StatusCode, TResponse } from "./hono-types";

export type ApiResponses = Partial<Record<StatusCode, z.ZodTypeAny>>;

export interface ApiSpec<
  Params extends z.ZodTypeAny = z.ZodTypeAny,
  Body extends z.ZodTypeAny = z.ZodTypeAny,
  Response extends ApiResponses = Partial<Record<StatusCode, z.ZodTypeAny>>,
> {
  params?: Params;
  body?: Body;
  res: Response;
}
type Method = "get" | "post" | "put" | "delete" | "patch" | "options" | "head";
export type ApiEndpoints<Path extends string = string> = Record<
  Path,
  Partial<Record<Method, ApiSpec>>
>;

type ApiSpecRes<
  AS extends ApiSpec | undefined,
  SC extends StatusCode,
> = AS extends ApiSpec
  ? AS["res"][SC] extends z.ZodTypeAny
    ? z.infer<AS["res"][SC]>
    : never
  : never;

type Handler<
  Endpoint extends ApiSpec | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Locals extends Record<string, any> = Record<string, never>,
> = RequestHandler<
  unknown,
  // FIXME
  ApiSpecRes<Endpoint, 200>,
  unknown,
  unknown,
  Locals
>;

type Validator<V> = () => V extends z.ZodTypeAny
  ? ReturnType<V["safeParse"]>
  : never;
type ResValidators<AR extends ApiResponses> = {
  [K in keyof AR]: Validator<AR[K]>;
};
type Validators<E extends ApiSpec> = {
  [K in keyof E]: Validator<E[K]>;
} & { res: ResValidators<E["res"]> };
const validateMiddlewareGenerator: <E extends ApiSpec>(
  e: E,
) => RequestHandler = (e) => (req, res, next) => {
  res.locals.validate = {
    // TODO: 指定可能なstatus codeだけ受け入れたい
    res: Object.entries(e.res).reduce(
      (acc, [k, v]) => {
        acc[k as unknown as StatusCode] = () => v.safeParse(res);
        return acc;
      },
      {} as { [K in keyof typeof e.res]: Validator<(typeof e.res)[K]> },
    ),
  };
  if (e.params !== undefined) {
    const params = e.params;
    res.locals.validate.params = () => params.safeParse(req.params);
  }
  if (e.body !== undefined) {
    const body = e.body;
    res.locals.validate.body = () => body.safeParse(req.body);
  }

  next();
};

type ValidateLocals<AS extends ApiSpec | undefined> = AS extends ApiSpec
  ? { validate: Validators<AS> }
  : Record<string, never>;
const emptyMiddleware: RequestHandler = (req, res, next) => next();
export const wrapRouter = <const Endpoints extends ApiEndpoints>(
  pathMap: Endpoints,
  router: Router,
) => {
  return {
    get: <Path extends string & keyof Endpoints>(
      path: Path,
      ...handlers: Array<
        Handler<Endpoints[Path]["get"], ValidateLocals<Endpoints[Path]["get"]>>
      >
    ) => {
      const methods = pathMap[path];
      router.get(
        path,
        methods.get
          ? validateMiddlewareGenerator(methods.get)
          : emptyMiddleware,
        ...handlers,
      );
      return this;
    },
  };
};

interface TRequestInit<M extends Method> extends RequestInit {
  method?: M;
}

type SCHEMA = "http" | "https" | "about" | "blob" | "data" | "file";
type URL = `${SCHEMA}://${string}`;
export type TFetch<Origin extends URL, E extends ApiEndpoints> = <
  Path extends keyof E & string,
  M extends Method,
>(
  input: `${Origin}${Path}`,
  init?: TRequestInit<M>,
) => Promise<
  // TODO: 200だけでなく返しうる全レスポンスのUnionとする
  TResponse<
    z.infer<
      M extends Method
        ? // FIXME: NonNullable
          NonNullable<NonNullable<E[Path][M]>["res"][200]>
        : NonNullable<E[Path]["get"]>["res"][200]
    >,
    200,
    "json"
  >
>;
