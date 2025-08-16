import { Logger } from "common";

export let logger = new Logger({ space: 2 });
export const setLogger = (l: Logger) => {
  logger = l;
};
