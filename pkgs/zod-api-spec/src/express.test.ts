import { Router } from "express";
import { z } from "zod";
import { ApiEndpoints } from "./spec";
import { wrapRouter } from "./express";

const pathMap = {
  "/user": {
    get: {
      params: z.object({
        id: z.string(),
      }),
      res: {
        200: z.object({ userName: z.string() }),
      },
    },
    post: {
      res: {
        200: z.object({ userId: z.string() }),
      },
      body: z.object({
        userName: z.string(),
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

const main = async () => {
  const wRouter = wrapRouter(pathMap, Router());
  wRouter.get("/user", (req, res) => {
    const r = res.locals.validate.params();
    if (r.success) {
      console.log(r.data.id);
    }
    console.log(r);
  });
  wRouter.post("/user", (req, res) => {
    const r = res.locals.validate.body();
    if (r.success) {
      console.log(r.data.userName);
    }
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
