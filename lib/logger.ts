/**
 * Enterprise Structured Logger
 * 
 * Menggantikan console.log/console.error mentah dengan output terstruktur:
 * - Production (NODE_ENV=production): Format NDJSON (Newline Delimited JSON)
 *   kompatibel dengan PM2, Datadog, Vector, Grafana Loki, dan CloudWatch.
 * - Development: Format berwarna yang mudah dibaca dengan timestamp & context tag.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogPayload {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: Record<string, any>;
  error?: {
    name?: string;
    message: string;
    stack?: string;
    code?: string | number;
  };
}

class StructuredLogger {
  private isProduction = process.env.NODE_ENV === "production";

  private formatError(err: unknown) {
    if (!err) return undefined;
    if (err instanceof Error) {
      return {
        name: err.name,
        message: err.message,
        stack: this.isProduction ? undefined : err.stack,
        code: (err as any).code,
      };
    }
    return { message: String(err) };
  }

  private write(level: LogLevel, context: string, message: string, data?: Record<string, any>, err?: unknown): void {
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      ...(data && Object.keys(data).length > 0 ? { data } : {}),
      ...(err ? { error: this.formatError(err) } : {}),
    };

    if (this.isProduction) {
      // In production, output single-line JSON for log aggregators
      const jsonLine = JSON.stringify(payload);
      if (level === "error") {
        process.stderr.write(jsonLine + "\n");
      } else {
        process.stdout.write(jsonLine + "\n");
      }
    } else {
      // In development, human-friendly formatted terminal output
      const timeStr = payload.timestamp.split("T")[1].replace("Z", "");
      const badge = `[${level.toUpperCase()}]`.padEnd(7);
      const ctx = `[${context}]`.padEnd(16);
      const out = `${timeStr} ${badge} ${ctx} ${message}`;

      if (level === "error") {
        console.error(out, data ? data : "", err ? err : "");
      } else if (level === "warn") {
        console.warn(out, data ? data : "");
      } else if (level === "debug") {
        console.debug(out, data ? data : "");
      } else {
        console.log(out, data ? data : "");
      }
    }
  }

  debug(context: string, message: string, data?: Record<string, any>): void {
    if (process.env.DEBUG === "true" || !this.isProduction) {
      this.write("debug", context, message, data);
    }
  }

  info(context: string, message: string, data?: Record<string, any>): void {
    this.write("info", context, message, data);
  }

  warn(context: string, message: string, data?: Record<string, any>): void {
    this.write("warn", context, message, data);
  }

  error(context: string, message: string, err?: unknown, data?: Record<string, any>): void {
    this.write("error", context, message, data, err);
  }

  child(context: string, defaultData?: Record<string, any>) {
    return {
      debug: (msg: string, data?: Record<string, any>) => this.debug(context, msg, { ...defaultData, ...data }),
      info: (msg: string, data?: Record<string, any>) => this.info(context, msg, { ...defaultData, ...data }),
      warn: (msg: string, data?: Record<string, any>) => this.warn(context, msg, { ...defaultData, ...data }),
      error: (msg: string, err?: unknown, data?: Record<string, any>) => this.error(context, msg, err, { ...defaultData, ...data }),
    };
  }
}

export const logger = new StructuredLogger();
