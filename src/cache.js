// src/cache.js
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { logger } from './logger.js';
import { ensureDirExists } from './utils.js';
import { loadScrapedUrlsFromSheet } from './sheets.js';

const CACHE_FILE_PATH = path.join(config.OUTPUT_DIR, 'url_cache.json');
let urlCache = new Set();

/**
 * Loads scraped URLs, preferring the local cache but falling back to the Google Sheet.
 */
export async function loadCachedUrls() {
  try {
    const data = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
    const urls = JSON.parse(data);
    urlCache = new Set(urls);
    logger.info(`Loaded ${urlCache.size} URLs from local cache.`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.warn('Local URL cache not found. Syncing from Google Sheet...');
      urlCache = await loadScrapedUrlsFromSheet();
      await saveUrlsToCache(); // Create the initial cache
    } else {
      throw error;
    }
  }
  return urlCache;
}

/**
 * Adds new URLs to the in-memory cache and saves the updated cache to the file.
 * @param {string[]} newUrls - An array of new URLs to add.
 */
export async function updateCache(newUrls) {
  if (newUrls.length === 0) return;
  newUrls.forEach(url => urlCache.add(url));
  await saveUrlsToCache();
  logger.info(`Updated local cache with ${newUrls.length} new URLs.`);
}

/**
 * Writes the current state of the URL cache to the local file.
 */
async function saveUrlsToCache() {
  try {
    await ensureDirExists(config.OUTPUT_DIR);
    const data = JSON.stringify(Array.from(urlCache));
    await fs.writeFile(CACHE_FILE_PATH, data, 'utf-8');
  } catch (error) {
    logger.error('Failed to save URL cache file:', error);
  }
}