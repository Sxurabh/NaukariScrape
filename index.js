// index.js
import path from 'path';
import { config } from './config.js';
import { logger } from './src/logger.js';
import { NaukriScraper } from './src/NaukriScraper.js';
import { saveJobsToExcel } from './src/excel.js';
import { initializeSheet, saveJobsToSheet } from './src/sheets.js';
import { loadCachedUrls, updateCache } from './src/cache.js';
import { chunk } from './src/utils.js';

async function main() {
  logger.info('🚀 Starting the Naukri.com scraper...');
  const scraper = new NaukriScraper();
  
  try {
    // Initialize scraper and connect to Google Sheets
    await scraper.initialize();
    await initializeSheet();

    // Use the caching system to get previously scraped URLs
    const previouslyScrapedUrls = await loadCachedUrls();
    
    // Scrape job summaries from Naukri
    await scraper.navigateToSearchPage();
    const allSummaries = [];
    for (let i = 1; i <= config.PAGES_TO_SCRAPE; i++) {
      logger.step(`Scraping Summary Page ${i} of ${config.PAGES_TO_SCRAPE}`);
      if (i > 1) await scraper.goToNextPage(i);
      const summariesOnPage = await scraper.scrapeSummaryPage();
      allSummaries.push(...summariesOnPage);
      logger.success(`Found ${summariesOnPage.length} job summaries.`);
    }

    // Filter out jobs that have already been scraped
    const newJobSummaries = allSummaries.filter(job => !previouslyScrapedUrls.has(job.url));
    logger.step(`Found ${newJobSummaries.length} new jobs to scrape out of ${allSummaries.length} total.`);

    if (newJobSummaries.length === 0) {
      logger.info("No new jobs to scrape. Exiting.");
      return;
    }

    // Scrape detailed information for new jobs
    const jobChunks = chunk(newJobSummaries, config.CONCURRENT_JOBS);
    const allJobsWithDetails = [];
    for (const [index, jobChunk] of jobChunks.entries()) {
      logger.info(`Processing chunk ${index + 1} of ${jobChunks.length}...`);
      const promises = jobChunk.map(summary => scraper.scrapeJobDetails(summary));
      const results = await Promise.all(promises);
      allJobsWithDetails.push(...results.filter(job => job.description !== 'Error scraping details'));
    }

    // Save new jobs to Google Sheets
    const insertedCount = await saveJobsToSheet(allJobsWithDetails);
    logger.success(`📝 Successfully saved ${insertedCount} new jobs to the Google Sheet.`);

    // Update the local cache with the new URLs
    await updateCache(allJobsWithDetails.map(job => job.url));

    // Optionally, save to Excel and JSON as a backup
    if (insertedCount > 0) {
      await saveJobsToExcel(allJobsWithDetails);
    }

  } catch (error) {
    logger.error('A critical error occurred:', error);
    if (scraper.page) {
        const screenshotPath = path.join(config.OUTPUT_DIR, config.ERROR_SCREENSHOT_FILENAME);
        await scraper.page.screenshot({ path: screenshotPath, fullPage: true });
        logger.info(`📸 Screenshot saved to: ${screenshotPath}`);
    }
  } finally {
    await scraper.close();
    logger.info('Scraping process finished.');
  }
}

main();