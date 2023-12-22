import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.union([z.literal("development"), z.literal("production")]),
  GITHUB_TOKEN: z.string(),
});
export type Env = z.infer<typeof Env>;

export const loadEnv = () => {
  const res = Env.safeParse(process.env);
  if (!res.success) {
    throw new Error(
      "invalid environment variable: " +
        JSON.stringify(res.error.issues, null, 2)
    );
  }
  return res.data;
};
