import { IRouter, Router } from "express";
import {
  ApiEndpoints,
  ApiResponses,
  ApiResSchema,
  ApiSpec,
  ApiSpecRes,
  Method,
} from "./";
import { Validators } from "./validator";
import { NextFunction, Request, Response } from "express-serve-static-core";
import { StatusCode } from "./hono-types";
import { z } from "zod";

type Handler<
  Spec extends ApiSpec | undefined,
  SC extends keyof NonNullable<ApiSpec>["res"] & StatusCode = 200,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Locals extends Record<string, any> = Record<string, never>,
> = (
  req: Request<unknown, ApiSpecRes<Spec, SC>, unknown, unknown, Locals>,
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
  ? { validate: Validators<AS> }
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
  router.use((req, res, next) => {
    const spec = pathMap[req.path][req.method.toLowerCase() as Method];
    res.locals.validate = {};
    console.log("spec", pathMap, req.path, req.method);
    console.log("params", spec?.params);
    console.log("body", spec?.body);
    res.locals.validate.params = () => spec?.params?.safeParse(req.params);
    res.locals.validate.body = () => spec?.body?.safeParse(req.body);
    next();
  });
  return router;
};
