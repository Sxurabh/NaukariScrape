// src/utils.js
import fs from 'fs/promises';
import { logger } from './logger.js';
import { config } from '../config.js';

/**
 * Ensures that a directory exists, creating it if necessary.
 * @param {string} dirPath - The path to the directory.
 */
export async function ensureDirExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    logger.error(`Could not create directory at ${dirPath}:`, error);
    throw error;
  }
}

/**
 * A utility function to retry an async operation a specified number of times.
 * @param {Function} asyncFn - The async function to retry.
 * @param {string} operationName - A descriptive name for the operation for logging.
 * @returns {Promise<any>} - The result of the async function if successful.
 */
export async function retry(asyncFn, operationName = 'operation') {
  for (let attempt = 1; attempt <= config.RETRY_COUNT; attempt++) {
    try {
      return await asyncFn();
    } catch (error) {
      logger.warn(`Attempt ${attempt} for ${operationName} failed: ${error.message}`);
      if (attempt === config.RETRY_COUNT) {
        logger.error(`All ${config.RETRY_COUNT} attempts for ${operationName} failed.`);
        throw error;
      }
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