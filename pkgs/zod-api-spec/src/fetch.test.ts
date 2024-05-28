import { z } from "zod";
import { ApiEndpoints, ApiSpec } from "./";
import { TFetch } from "./";
import { ParseUrlParams } from "./url";

const pathMap = {
  "/user": {
    get: {
      res: {
        200: z.object({ userName: z.string() }),
        400: z.object({ message: z.string() }),
      },
    },
    post: {
      res: {
        200: z.object({ userId: z.string() }),
      },
      body: z.object({
        name: z.string(),
      }),
    },
  },
  [`/org/:orgId/users/:userId`]: {
    get: {
      res: {
        200: z.object({ userName: z.string() }),
        400: z.object({ message: z.string() }),
      },
    },
  },
} satisfies ApiEndpoints;
type PathMap = typeof pathMap;

const main = async () => {
  const origin = "https://example.com" as const;
  const fetch2 = fetch as TFetch<typeof origin, PathMap>;

  const res = await fetch2(`${origin}/user`);
  if (res.ok) {
    // ステータスコードが20Xのレスポンススキーマだけに絞り込まれる
    const r = await res.json();
    console.log(r.userName);
  } else {
    // ステータスコードが20Xでないレスポンススキーマだけに絞り込まれる
    const error = await res.json();
    console.log(error.message);
  }

  // switch (res.status) {
  //   case 200: {
  //     const r = await res.json();
  //     console.log(r);
  //     break;
  //   }
  //   case 400: {
  //     break;
  //   }
  //   default: {
  //     return unreachable(res);
  //   }
  // }

  // postメソッドのレスポンススキーマに絞り込まれる
  const res2 = await fetch2(`${origin}/user`, { method: "post" });
  if (res2.ok) {
    const r = await res2.json();
    console.log(r.userId);
  }

  // path variableを含むURLの場合
  const res3 = await fetch2(`${origin}/org/org1/users/user1`);
  if (res3.ok) {
    const r = await res3.json();
    console.log(r.userName);
  }
};

// // Zodによるバリデーションはデフォルトでは行わない。したい場合は明示的にparseする
// const r = pathMap["/user"].get.res[200].parse(await res.json());

main();
