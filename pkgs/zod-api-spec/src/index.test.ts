import { Router } from "express";
import { z } from "zod";
import { ApiEndpoints, wrapRouter } from "./index";

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
  wRouter.get("/user", (req, res, next) => {
    console.log(res.locals.validate.params());
  });
  wRouter.get("/item", (req, res) => {
    console.log(res.locals.validate.res());
  });
  wRouter.get("/event", (req, res) => {
    console.log("hello", res.locals);
  });
};

main();
