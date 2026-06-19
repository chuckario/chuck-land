import { serverConfig } from '../config/serverConfig';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  lobbyId?: string;
  heroId?: string;
  socketId?: string;
  tick?: number;
  [key: string]: unknown;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class Logger {
  private readonly minLevel: LogLevel;
  private readonly scope: string;

  constructor(scope: string, minLevel: LogLevel = serverConfig.logLevel) {
    this.scope = scope;
    this.minLevel = minLevel;
  }

  child(scope: string): Logger {
    return new Logger(`${this.scope}:${scope}`, this.minLevel);
  }

  debug(message: string, context?: LogContext): void {
    this.write('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.write('warn', message, context);
  }

  error(message: string, context?: LogContext, error?: unknown): void {
    const enriched: LogContext = { ...context };
    if (error instanceof Error) {
      enriched.errorName = error.name;
      enriched.errorMessage = error.message;
      enriched.stack = error.stack;
    } else if (error !== undefined) {
      enriched.errorDetail = String(error);
    }
    this.write('error', message, enriched);
  }

  private write(level: LogLevel, message: string, context?: LogContext): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) {
      return;
    }

    const entry = {
      ts: new Date().toISOString(),
      level,
      scope: this.scope,
      message,
      ...context,
    };

    const line = JSON.stringify(entry);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
}

export const rootLogger = new Logger('server');
