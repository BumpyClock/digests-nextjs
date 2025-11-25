type LogArgs = unknown[]

export const Logger = {
  debug(message: string, ...args: LogArgs) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, ...args)
    }
  },

  info(message: string, ...args: LogArgs) {
    console.info(`[INFO] ${message}`, ...args)
  },

  warn(message: string, ...args: LogArgs) {
    console.warn(`[WARN] ${message}`, ...args)
  },

  error(message: string, error?: Error, ...args: LogArgs) {
    console.error(`[ERROR] ${message}`, error, ...args)
  },
}
