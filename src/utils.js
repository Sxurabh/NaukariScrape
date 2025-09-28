// src/utils.js
import { logger } from './logger.js';
import { config } from '../config.js';

/**
 * A utility function to retry an async operation a specified number of times.
 * @param {Function} asyncFn - The async function to retry.
 * @param {string} operationName - A descriptive name for the operation for logging.
 * @returns {Promise<any>} - The result of the async function if successful.
 */
export async function retry(asyncFn, operationName = 'operation') {
  for (let attempt = 1; attempt <= config.RETRY_COUNT; attempt++) {
    try {
      return await asyncFn(); // Attempt the operation
    } catch (error) {
      logger.warn(`Attempt ${attempt} for ${operationName} failed: ${error.message}`);
      if (attempt === config.RETRY_COUNT) {
        logger.error(`All ${config.RETRY_COUNT} attempts for ${operationName} failed.`);
        throw error; // Re-throw the error after the final attempt
      }
      // Wait for a short delay before the next attempt
      await new Promise(resolve => setTimeout(resolve, config.RETRY_DELAY_MS));
    }
  }
}

/**
 * Splits an array into smaller chunks of a specified size.
 * @param {Array} array - The array to chunk.
 * @param {number} chunkSize - The size of each chunk.
 * @returns {Array<Array>} - An array of chunks.
 */
export function chunk(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}