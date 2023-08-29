import { Env, loadEnv } from "./env";
import { logger, Logger, setLogger } from "./logger";

const initialize = (env: Env) => {
  setLogger(
    new Logger({ space: env.NODE_ENV === "production" ? undefined : 2 })
  );
};

const main = async () => {
  const env = loadEnv();
  initialize(env);
  logger.json(`${env.NODE_ENV}: Hello World`);
};

main();
