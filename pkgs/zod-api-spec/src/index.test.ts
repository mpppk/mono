import { Router } from "express";
import { z } from "zod";
import { ApiEndpoints, TFetch, wrapRouter } from "./index";

const pathMap = {
  "/user": {
    get: {
      params: z.object({
        id: z.string(),
      }),
      res: {
        200: z.object({ text: z.string() }),
      },
    },
    post: {
      res: {
        200: z.object({ text: z.string() }),
      },
      body: z.object({
        name: z.string(),
      }),
    },
  },
  "/item": {
    get: {
      res: {
        200: z.object({ itemId: z.number() }),
      },
    },
    post: {
      res: {
        200: z.object({ text: z.string() }),
      },
      body: z.object({
        name: z.string(),
      }),
    },
  },
  "/event": {},
} satisfies ApiEndpoints;
type PathMap = typeof pathMap;

const main = async () => {
  const wRouter = wrapRouter(pathMap, Router());
  wRouter.get("/user", (req, res) => {
    const r = res.locals.validate.params();
    console.log(r);
  });
  wRouter.get("/item", (req, res) => {
    const r = res.locals.validate.res[200]();
    console.log(r);
  });
  wRouter.get("/event", (req, res) => {
    console.log("hello", res.locals);
  });

  const origin = "https://example.com" as const;
  const fetch2 = fetch as TFetch<typeof origin, PathMap>;
  const res = await fetch2(`${origin}/user`, { method: "get" });
  const r = await res.json();
  console.log(r);
  // Zodによるバリデーションはデフォルトでは実行しない。したい場合は明示的にparseする
  // const r = pathMap["/user"].get.res.parse(await res.json());
};

main();
