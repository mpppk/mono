import { z } from "zod";
import { ApiEndpoints } from "./";
import { TFetch } from "./";

const pathMap = {
  "/org": {
    get: {
      query: z.object({
        page: z.string(),
      }),
      res: {
        200: z.object({ orgNames: z.string().array() }),
        400: z.object({ message: z.string() }),
      },
    },
    post: {
      res: {
        200: z.object({ orgId: z.string() }),
      },
      body: z.object({
        name: z.string(),
      }),
    },
  },
  [`/org/:orgId/users/:userId`]: {
    get: {
      res: {
        200: z.object({ userName2: z.string() }),
        400: z.object({ message: z.string() }),
      },
    },
  },
} satisfies ApiEndpoints;
type PathMap = typeof pathMap;

const main = async () => {
  const origin = "https://example.com";
  const fetch2 = fetch as TFetch<typeof origin, PathMap>;

  {
    const res = await fetch2(`${origin}/org`);
    if (res.ok) {
      // ステータスコードが20Xのレスポンススキーマだけに絞り込まれる
      const r = await res.json();
      console.log(r.orgNames);
    } else {
      // ステータスコードが20Xでないレスポンススキーマだけに絞り込まれる
      const error = await res.json();
      console.log(error.message);
    }
  }

  // クエリパラメータも付けられる
  {
    const res = await fetch2(`${origin}/org?page=1`);
    if (res.ok) {
      // ステータスコードが20Xのレスポンススキーマだけに絞り込まれる
      const r = await res.json();
      console.log(r.orgNames);
    } else {
      // ステータスコードが20Xでないレスポンススキーマだけに絞り込まれる
      const error = await res.json();
      console.log(error.message);
    }
  }

  // postメソッドのレスポンススキーマに絞り込まれる
  {
    const res2 = await fetch2(`${origin}/org`, { method: "post" });
    if (res2.ok) {
      const r = await res2.json();
      console.log(r.orgId);
    }
  }

  // path variableを含むURLの場合
  {
    const res = await fetch2(`${origin}/org/org1/users/user1`);
    if (res.ok) {
      const r = await res.json();
      console.log(r.userName2);
    }
  }
};

// // Zodによるバリデーションはデフォルトでは行わない。したい場合は明示的にparseする
// const r = pathMap["/user"].get.res[200].parse(await res.json());

main();
