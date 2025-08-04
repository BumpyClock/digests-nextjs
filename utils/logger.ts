// Environment helper to avoid read-only property errors
const isDevelopment = () => {
  try {
    return process.env.NODE_ENV === "development";
  } catch {
    return false;
  }
};

export class Logger {
  static debug(message: string, ...args: any[]) {
    if (isDevelopment()) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  static info(message: string, ...args: any[]) {
    console.info(`[INFO] ${message}`, ...args);
  }

  static warn(message: string, ...args: any[]) {
    console.warn(`[WARN] ${message}`, ...args);
  }

  static error(message: string, error?: Error | unknown, ...args: any[]) {
    // Handle unknown error types by converting them to Error
    const errorToLog =
      error instanceof Error
        ? error
        : error
          ? new Error(String(error))
          : undefined;
    console.error(`[ERROR] ${message}`, errorToLog, ...args);
  }
}
