import { Router } from "express";
import { z } from "zod";
import { ApiEndpoints, MyFetch, wrapRouter } from "./index";

const pathMap = {
  "/user": {
    get: {
      res: z.object({ text: z.string() }),
      params: z.object({
        id: z.string(),
      }),
    },
    post: {
      res: z.object({ text: z.string() }),
      body: z.object({
        name: z.string(),
      }),
    },
  },
  "/item": {
    get: {
      res: z.object({ itemId: z.number() }),
    },
    post: {
      res: z.object({ text: z.string() }),
      body: z.object({
        name: z.string(),
      }),
    },
  },
  "/event": {},
} satisfies ApiEndpoints;

const main = async () => {
  const wRouter = wrapRouter(pathMap, Router());
  wRouter.get("/user", (req, res) => {
    console.log(res.locals.validate.params());
  });
  wRouter.get("/item", (req, res) => {
    console.log(res.locals.validate.res());
  });
  wRouter.get("/event", (req, res) => {
    console.log("hello", res.locals);
  });

  const fetch2 = fetch as MyFetch<typeof pathMap>;
  const res = await fetch2("/user", { method: "get" });
  const r = await res.json();
  console.log(r);
  // Zodによるバリデーションはデフォルトでは実行しない。したい場合は明示的にparseする
  // const r = pathMap["/user"].get.res.parse(await res.json());
};

main();
