import { Router } from "express";
import { z } from "zod";
import { ApiEndpoints } from "./index";
import { wrapRouter } from "./express";

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
};

main();
