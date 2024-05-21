import express from "express";
import { z } from "zod";
import { ApiEndpoints } from "../src";
import { wrapRouter } from "../src/express";

const pathMap = {
  "/user": {
    post: {
      res: {
        200: z.object({ userId: z.string() }),
        400: z.object({ errorMessage: z.string() }),
      },
      body: z.object({
        userName: z.string(),
      }),
    },
  },
  "/user/:userId": {
    get: {
      params: z.object({
        userId: z.string(),
      }),
      res: {
        200: z.object({ userName: z.string() }),
        400: z.object({ errorMessage: z.string() }),
      },
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
  app.use(express.json());
  const wApp = wrapRouter(pathMap, app);
  wApp.get("/user/:userId", (req, res) => {
    const r = res.locals.validate(req).params();
    if (r.success) {
      res.status(200).send({ userName: "user#" + r.data.userId });
    } else {
      res.status(400).send({ errorMessage: r.error.toString() });
    }
  });
  wApp.post("/user", (req, res) => {
    const r = res.locals.validate(req).body();
    if (r.success) {
      res.status(200).send({ userId: r.data.userName + "#0" });
    } else {
      res.status(400).send({ errorMessage: r.error.toString() });
    }
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
