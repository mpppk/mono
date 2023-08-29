type LoggerConfig = {
  space: string | number | undefined;
};

export class Logger {
  public constructor(private config: LoggerConfig) {}
  public json(data: any) {
    if (typeof data === "string") {
      console.log(data);
      return;
    }
    console.log(this.toLogJson(data));
  }
  private toLogJson(data: any) {
    const replacer =
      data instanceof Error ? Object.getOwnPropertyNames(data) : undefined;
    return JSON.stringify(data, replacer, this.config.space);
  }
}

export let logger = new Logger({ space: 2 });
export const setLogger = (l: Logger) => {
  logger = l;
};
