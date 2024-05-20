import express from "express";
import { z } from "zod";
import { ApiEndpoints } from "../src";
import { wrapRouter } from "../src/express";

const pathMap = {
  "/user": {
    get: {
      params: z.object({
        id: z.string(),
      }),
      res: {
        200: z.object({ userName: z.string() }),
        400: z.object({ errorMessage: z.string() }),
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

const newApp = () => {
  const app = express();
  const wApp = wrapRouter(pathMap, app);
  wApp.get("/user", (req, res) => {
    const r = res.locals.validate.params();
    if (r.success) {
      res.status(200).send({ userName: "user#" + r.data.id });
    } else {
      res.status(400).send({ errorMessage: r.error.toString() });
    }
  });
  wApp.post("/user", (req, res) => {
    const r = res.locals.validate.body();
    if (r.success) {
      console.log(r.data.userName);
    }
    console.log(r);
  });
  wApp.get("/item", (req, res) => {
    const r = res.locals.validate.res[200]();
    console.log(r);
  });
  wApp.get("/event", (req, res) => {
    console.log("hello", res.locals);
  });
  return app;
};

const main = async () => {
  const app = newApp();
  const port = 3000;
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
};

main();
