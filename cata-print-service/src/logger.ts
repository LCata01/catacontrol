import { app } from "electron";
import * as path from "path";
import * as fs from "fs";
import winston from "winston";

let logger: winston.Logger | null = null;

export function getLogger(): winston.Logger {
  if (logger) return logger;
  const dir = path.join(app.getPath("userData"), "logs");
  fs.mkdirSync(dir, { recursive: true });
  logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
        return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
      })
    ),
    transports: [
      new winston.transports.File({
        filename: path.join(dir, "service.log"),
        maxsize: 5 * 1024 * 1024,
        maxFiles: 5,
      }),
      new winston.transports.Console(),
    ],
  });
  return logger;
}

export function getLogDir(): string {
  return path.join(app.getPath("userData"), "logs");
}
