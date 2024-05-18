import { z } from "zod";
import { ApiEndpoints } from "./";
import { TFetch } from "./";

const pathMap = {
  "/user": {
    get: {
      params: z.object({
        id: z.string(),
      }),
      res: {
        200: z.object({ userName: z.string() }),
        400: z.object({ message: z.string() }),
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
  const origin = "https://example.com" as const;
  const fetch2 = fetch as TFetch<typeof origin, PathMap>;
  const res = await fetch2(`${origin}/user`, { method: "get" });
  if (res.ok) {
    const r = await res.json();
    console.log(r.userName);
  } else {
    const error = await res.json();
    console.log(error.message);
  }
  // Zodによるバリデーションはデフォルトでは実行しない。したい場合は明示的にparseする
  // const r = pathMap["/user"].get.res.parse(await res.json());
};

main();
