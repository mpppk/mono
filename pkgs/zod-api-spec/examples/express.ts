import express from "express";
import { z } from "zod";
import { ApiEndpoints } from "../src";
import { typed } from "../src/express";

const pathMap = {
  "/users": {
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
  "/users/:userId": {
    get: {
      res: {
        200: z.object({ userName: z.string() }),
        400: z.object({ errorMessage: z.string() }),
      },
    },
  },
} satisfies ApiEndpoints;

const newApp = () => {
  const app = express();
  app.use(express.json());
  const wApp = typed(pathMap, app);
  wApp.get("/users/:userId", (req, res) => {
    const params = res.locals.validate.params();
    if (!params.success) {
      res.status(400).send({ errorMessage: params.error.toString() });
      return;
    }
    res.status(200).send({ userName: "user#" + params.data.userId });
  });
  wApp.post("/users", (req, res) => {
    const r = res.locals.validate.body();
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
