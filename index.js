// index.js
import { scrapeNaukriJobs } from './src/scraper.js';
import { logger } from './src/logger.js';

/**
 * Main function to start the scraper.
 */
async function main() {
  try {
    logger.info('🚀 Starting the Naukri.com scraper...');
    await scrapeNaukriJobs();
    logger.info('✅ Scraping process completed successfully.');
  } catch (error) {
    logger.error('❌ An unexpected error occurred in the main process:', error);
    process.exit(1); // Exit with a failure code
  }
}

main();