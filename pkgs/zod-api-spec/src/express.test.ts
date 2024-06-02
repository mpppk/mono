import { Router } from "express";
import { z } from "zod";
import { ApiEndpoints } from "./spec";
import { typed } from "./express";

const pathMap = {
  "/users": {
    get: {
      query: z.object({
        page: z.string(),
      }),
      res: {
        200: z.object({ userNames: z.string().array() }),
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
  "/users/:userId": {
    get: {
      params: z.object({ userId: z.string() }),
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
} satisfies ApiEndpoints;

const main = async () => {
  const wRouter = typed(pathMap, Router());
  wRouter.get("/users", (req, res) => {
    // @ts-expect-error params is not defined
    res.locals.validate.params();

    const r = res.locals.validate(req).query();
    if (r.success) {
      console.log(r.data.page);
    }
    res.status(200).json({ userNames: ["user1", "user2"] });
  });
  wRouter.post("/users", (req, res) => {
    const r = res.locals.validate(req).body();
    if (r.success) {
      res.status(200).json({ userId: r.data.userName + "#0" });
    }
  });
  wRouter.get("/users/:userId", (req, res) => {
    const r = res.locals.validate(req).params();
    if (r.success) {
      res.status(200).json({ userName: r.data.userId + ":userName" });
    }
  });
};

main();
