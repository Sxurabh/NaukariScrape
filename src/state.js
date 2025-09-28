// src/state.js
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { logger } from './logger.js';
import { ensureDirExists } from './utils.js';

const STATE_FILE_PATH = path.join(config.OUTPUT_DIR, config.STATE_FILENAME);

export async function loadScrapedUrls() {
  try {
    const data = await fs.readFile(STATE_FILE_PATH, 'utf-8');
    return new Set(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.info('State file not found. Starting with a fresh state.');
      return new Set();
    }
    throw error;
  }
}

export async function saveScrapedUrls(scrapedUrls) {
  try {
    await ensureDirExists(config.OUTPUT_DIR);
    const data = JSON.stringify(Array.from(scrapedUrls));
    await fs.writeFile(STATE_FILE_PATH, data, 'utf-8');
  } catch (error) {
    logger.error('Failed to save state file:', error);
  }
}