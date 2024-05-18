import { RequestHandler, Router } from "express";
import { StatusCode } from "./hono-types";
import { ApiEndpoints, ApiSpec, ApiSpecRes } from "./";
import { Validator, Validators } from "./validator";

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
type ValidateLocals<AS extends ApiSpec | undefined> = AS extends ApiSpec
  ? { validate: Validators<AS> }
  : Record<string, never>;

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
