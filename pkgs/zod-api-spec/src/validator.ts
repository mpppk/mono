import { z } from "zod";
import { ApiSpec } from "./spec";

export type Validator<V extends z.ZodTypeAny | undefined> =
  V extends z.ZodTypeAny ? () => ReturnType<V["safeParse"]> : undefined;
export type Validators<AS extends ApiSpec> = {
  params: Validator<AS["params"]>;
  body: Validator<AS["body"]>;
};
