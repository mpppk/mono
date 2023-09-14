import { SafeParseReturnType, ZodError } from "zod";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

export const addToListMap = <K, V>(m: Map<K, V[]>, key: K, v: V) => {
  const list = m.get(key) ?? [];
  list.push(v);
  m.set(key, list);
  return list;
};

export const addToSetMap = <K, V>(m: Map<K, Set<V>>, key: K, v: V) => {
  const s = m.get(key) ?? new Set();
  s.add(v);
  m.set(key, s);
  return s;
};

export type NonEmptyArray<T> = [T, ...T[]];
export const NonEmptyArray = Object.freeze({
  parse: <T>(arr: T[]): NonEmptyArray<T> => {
    if (arr.length === 0) {
      throw new Error("empty array");
    }
    return arr as NonEmptyArray<T>;
  },
});
export type TwoOrMoreArray<T> = [T, T, ...T[]];

export const debugPrefix = Object.freeze({
  root: "nbs",
  lib: `nbs:lib`,
  alg: "nbs:lib:alg",
});

export const uniqBy = <T, U>(arr: T[], fn: (v: T) => U): T[] => {
  const set = new Set<U>();
  return arr.filter((v) => {
    const u = fn(v);
    if (set.has(u)) {
      return false;
    } else {
      set.add(u);
      return true;
    }
  });
};

export const isPrimitive = (v: unknown): v is string | number | boolean => {
  return (
    typeof v === "string" || typeof v === "number" || typeof v === "boolean"
  );
};
