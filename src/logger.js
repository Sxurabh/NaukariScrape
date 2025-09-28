// src/logger.js

/**
 * A simple logger utility for consistent console output.
 */
export const logger = {
  info: (...args) => {
    console.log(`[INFO]`, ...args);
  },
  warn: (...args) => {
    console.warn(`[WARN]`, ...args);
  },
  error: (...args) => {
    console.error(`[ERROR]`, ...args);
  },
  debug: (...args) => {
    // You can disable debug logs in production if needed
    console.debug(`[DEBUG]`, ...args);
  },
};