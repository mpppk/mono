import { SafeParseReturnType, ZodError } from "zod";

export const unreachable = (_x: never): never => {
  throw new Error("Unreachable code!");
};

export type Result<T, U> =
  | { data: T; error?: undefined }
  | { data?: undefined; error: U };

export const Result = {
  data: <T>(data: T) => ({ data }),
  error: <U>(error: U) => ({ error }),
  fromZod: <T, U>(res: SafeParseReturnType<U, T>): Result<T, ZodError<U>> => {
    if (res.success) {
      return Result.data(res.data);
    } else {
      return Result.error(res.error);
    }
  },
};
