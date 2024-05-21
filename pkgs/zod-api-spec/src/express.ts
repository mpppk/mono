import { IRouter, Router } from "express";
import { ApiEndpoints, ApiResponses, ApiResSchema, ApiSpec, Method } from "./";
import { Validator, Validators } from "./validator";
import {
  NextFunction,
  ParamsDictionary,
  Request,
  Response,
} from "express-serve-static-core";
import { StatusCode } from "./hono-types";
import { z } from "zod";

type Handler<
  Spec extends ApiSpec | undefined,
  SC extends keyof NonNullable<ApiSpec>["res"] & StatusCode = 200,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Locals extends Record<string, any> = Record<string, never>,
> = (
  // FIXME: strict type
  req: Request<
    ParamsDictionary,
    // ApiSpecRes<NonNullable<Spec>, SC>,
    any,
    any,
    any,
    Locals
  >,
  res: ExpressResponse<NonNullable<Spec>["res"], SC, Locals>,
  next: NextFunction,
) => void;

type ExpressResponse<
  Responses extends ApiResponses,
  SC extends keyof Responses & StatusCode,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  LocalsObj extends Record<string, any> = Record<string, any>,
> = Omit<
  Response<z.infer<ApiResSchema<Responses, SC>>, LocalsObj, SC>,
  "status"
> & {
  status: <SC extends keyof Responses & StatusCode>(
    s: SC,
  ) => Response<z.infer<ApiResSchema<Responses, SC>>, LocalsObj, SC>;
};

type ValidateLocals<AS extends ApiSpec | undefined> = AS extends ApiSpec
  ? { validate: (req: Request) => Validators<AS> }
  : Record<string, never>;

type TRouter<
  Endpoints extends ApiEndpoints,
  SC extends StatusCode = StatusCode,
> = Omit<IRouter, Method> & {
  [M in Method]: <Path extends string & keyof Endpoints>(
    path: Path,
    ...handlers: Array<
      Handler<Endpoints[Path][M], SC, ValidateLocals<Endpoints[Path][M]>>
    >
  ) => TRouter<Endpoints, SC>;
};

export const wrapRouter = <const Endpoints extends ApiEndpoints>(
  pathMap: Endpoints,
  router: Router,
): TRouter<Endpoints> => {
  const validator = newValidator(pathMap);
  router.use((req, res, next) => {
    res.locals.validate = validator;
    next();
  });
  return router;
};

export const newValidator = <E extends ApiEndpoints>(endpoints: E) => {
  return <Path extends keyof E, M extends keyof E[Path] & Method>(
    req: Request,
  ) => {
    const spec: E[Path][M] =
      endpoints[req.route.path][req.method.toLowerCase() as Method];
    console.log(
      "spec",
      req.route.path,
      req.method,
      req.body.userName,
      req.body,
    );
    return {
      params: () =>
        spec?.params?.safeParse(req.params) as E[Path][M] extends ApiSpec
          ? Validator<E[Path][M]["params"]>
          : undefined,
      body: () =>
        spec?.body?.safeParse(req.body) as E[Path][M] extends ApiSpec
          ? Validator<E[Path][M]["body"]>
          : undefined,
    };
  };
};
