import { z } from "zod";
import { ApiResponses, ApiSpec } from "./index";

export type Validator<V> = () => V extends z.ZodTypeAny
  ? ReturnType<V["safeParse"]>
  : never;
type ResValidators<AR extends ApiResponses> = {
  [K in keyof AR]: Validator<AR[K]>;
};
export type Validators<E extends ApiSpec> = {
  [K in keyof E]: Validator<E[K]>;
} & { res: ResValidators<E["res"]> };
