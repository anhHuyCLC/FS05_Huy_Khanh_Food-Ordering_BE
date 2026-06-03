import env from "@configs/env";
import pino from "pino";
import { RailsApplication } from "ts-rails";

export function initializeLogger() {
  let transport;
  if (env.nodeEnv === "development") {
    try {
      require.resolve("pino-pretty");
      transport = {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" },
      };
    } catch (e) {
      // Fallback to default logging if pino-pretty is missing
    }
  }

  const pinoLogger = pino({
    level: env.nodeEnv === "development" ? "debug" : "info",
    transport,
  });

  RailsApplication.loggerAdapter = {
    info: pinoLogger.info.bind(pinoLogger),
    warn: pinoLogger.warn.bind(pinoLogger),
    error: pinoLogger.error.bind(pinoLogger),
    debug: pinoLogger.debug.bind(pinoLogger),
  };
}
