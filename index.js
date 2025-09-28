// index.js
import path from 'path';
import { config } from './config.js';
import { logger } from './src/logger.js';
import { NaukriScraper } from './src/NaukriScraper.js';
import { saveJobsToExcel } from './src/excel.js';
import { loadScrapedUrls, saveScrapedUrls } from './src/state.js';
import { chunk } from './src/utils.js';

async function main() {
  logger.info('🚀 Starting the Naukri.com scraper...');
  const scraper = new NaukriScraper();
  
  try {
    await scraper.initialize();
    const previouslyScrapedUrls = await loadScrapedUrls();
    logger.info(`Loaded ${previouslyScrapedUrls.size} previously scraped URLs.`);
    
    await scraper.navigateToSearchPage();
    const allSummaries = [];
    for (let i = 1; i <= config.PAGES_TO_SCRAPE; i++) {
      logger.step(`Scraping Summary Page ${i} of ${config.PAGES_TO_SCRAPE}`);
      if (i > 1) await scraper.goToNextPage(i);
      const summariesOnPage = await scraper.scrapeSummaryPage();
      allSummaries.push(...summariesOnPage);
      logger.success(`Found ${summariesOnPage.length} job summaries.`);
    }

    const newJobSummaries = allSummaries.filter(job => !previouslyScrapedUrls.has(job.url));
    logger.step(`Found ${newJobSummaries.length} new jobs to scrape out of ${allSummaries.length} total.`);

    if (newJobSummaries.length === 0) {
      logger.info("No new jobs to scrape. Exiting.");
      return;
    }

    const jobChunks = chunk(newJobSummaries, config.CONCURRENT_JOBS);
    const allJobsWithDetails = [];
    for (const [index, jobChunk] of jobChunks.entries()) {
      logger.info(`Processing chunk ${index + 1} of ${jobChunks.length}...`);
      const promises = jobChunk.map(summary => scraper.scrapeJobDetails(summary));
      const results = await Promise.all(promises);
      allJobsWithDetails.push(...results);
    }

    await saveJobsToExcel(allJobsWithDetails);
    
    const updatedScrapedUrls = new Set([...previouslyScrapedUrls, ...newJobSummaries.map(j => j.url)]);
    await saveScrapedUrls(updatedScrapedUrls);
    logger.success(`Updated state file with ${newJobSummaries.length} new URLs.`);

  } catch (error) {
    logger.error('A critical error occurred:', error);
    if (scraper.page) {
        const screenshotPath = path.join(config.OUTPUT_DIR, config.ERROR_SCREENSHOT_FILENAME);
        await scraper.page.screenshot({ path: screenshotPath });
        logger.info(`📸 Screenshot saved to: ${screenshotPath}`);
    }
  } finally {
    await scraper.close();
    logger.info('Scraping process finished.');
  }
}

main();