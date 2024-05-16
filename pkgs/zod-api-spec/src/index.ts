import { z } from "zod";
import { RequestHandler, Router } from "express";

export interface ApiEndpoint<
  Params extends z.ZodTypeAny = z.ZodTypeAny,
  Body extends z.ZodTypeAny = z.ZodTypeAny,
  Response extends z.ZodTypeAny = z.ZodTypeAny,
> {
  params?: Params;
  body?: Body;
  res: Response;
}
type Method = "get" | "post" | "put" | "delete" | "patch" | "options" | "head";
export type ApiEndpoints<Path extends string = string> = Record<
  Path,
  Partial<Record<Method, ApiEndpoint>>
>;

type InferEndpoint<
  Endpoint extends ApiEndpoint | undefined,
  Key extends keyof ApiEndpoint,
> = Endpoint extends ApiEndpoint ? z.infer<NonNullable<Endpoint[Key]>> : never;

type Handler<
  Endpoint extends ApiEndpoint | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Locals extends Record<string, any> = Record<string, never>,
> = RequestHandler<
  unknown,
  InferEndpoint<Endpoint, "res">,
  unknown,
  unknown,
  Locals
>;

type Validator<V> = () => V extends z.ZodTypeAny
  ? ReturnType<V["safeParse"]>
  : never;
type Validators<E extends ApiEndpoint> = {
  [K in keyof E]: Validator<E[K]>;
};
const validateMiddlewareGenerator: <E extends ApiEndpoint>(
  e: E,
) => RequestHandler = (e) => (req, res, next) => {
  res.locals.validate = {
    res: () => e.res.safeParse(res),
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

type ValidateLocals<E extends ApiEndpoint | undefined> = E extends ApiEndpoint
  ? { validate: Validators<E> }
  : {};
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
