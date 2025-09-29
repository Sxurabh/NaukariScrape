// index.js
import path from 'path';
import { config } from './config.js';
import { logger } from './src/logger.js';
import { NaukriScraper } from './src/NaukriScraper.js';
import { saveJobsToExcel } from './src/excel.js';
import { initializeSheet, saveJobsToSheet, loadScrapedUrlsFromSheet } from './src/sheets.js';
import { loadCachedUrls, updateCache } from './src/cache.js';
import { chunk, saveFailedJob, sleep } from './src/utils.js';

async function main() {
  logger.info('🚀 Starting the Naukri.com scraper...');
  const scraper = new NaukriScraper();
  
  try {
    // Initialize scraper and connect to Google Sheets
    await scraper.initialize();
    await initializeSheet();

    const previouslyScrapedUrls = await loadCachedUrls();
    
    await scraper.navigateToSearchPage(config.JOB_KEYWORDS, config.JOB_LOCATION, config.EXPERIENCE);
    const allSummaries = [];
    for (let i = 1; i <= config.PAGES_TO_SCRAPE; i++) {
      logger.step(`Scraping Summary Page ${i} of ${config.PAGES_TO_SCRAPE}`);
      if (i > 1) await scraper.goToNextPage(i);
      
      const summariesOnPage = await scraper.scrapeSummaryPage();
      allSummaries.push(...summariesOnPage);
      logger.success(`Found ${summariesOnPage.length} job summaries on page ${i}.`);

      // --- NEW: DEBUGGING STEP ---
      // If the first page has no summaries, take a screenshot and exit early.
      if (i === 1 && summariesOnPage.length === 0) {
        const screenshotPath = path.join(config.OUTPUT_DIR, 'no_jobs_found_screenshot.png');
        await scraper.page.screenshot({ path: screenshotPath, fullPage: true });
        logger.error(`❌ No job summaries found on the first page. This likely means the scraper was blocked or a CAPTCHA was shown.`);
        logger.info(`📸 A screenshot has been saved to help diagnose the issue: ${screenshotPath}`);
        // We return here to ensure the screenshot artifact is saved.
        return; 
      }
      
      await sleep(Math.random() * 1500 + 500);
    }

    const newJobSummaries = allSummaries.filter(job => job && job.url && !previouslyScrapedUrls.has(job.url));
    logger.step(`Found ${newJobSummaries.length} new jobs to scrape out of ${allSummaries.length} total.`);

    if (newJobSummaries.length === 0) {
      logger.info("No new jobs to scrape. Exiting.");
      return;
    }

    const jobChunks = chunk(newJobSummaries, config.CONCURRENT_JOBS);
    const allJobsWithDetails = [];
    
    for (const [index, jobChunk] of jobChunks.entries()) {
        logger.info(`Processing chunk ${index + 1} of ${jobChunks.length}...`);
        const chunkPromises = jobChunk.map(summary => scraper.scrapeJobDetails(summary));
        const results = await Promise.all(chunkPromises);

        results.forEach(job => {
            if (job.error) {
                saveFailedJob(job);
            } else {
                allJobsWithDetails.push(job);
            }
        });
        await sleep(2000);
    }

    logger.info(`Successfully scraped details for ${allJobsWithDetails.length} new jobs.`);

    if (allJobsWithDetails.length > 0) {
      const insertedCount = await saveJobsToSheet(allJobsWithDetails);
      logger.success(`📝 Successfully saved ${insertedCount} new jobs to the Google Sheet.`);
      
      await updateCache(allJobsWithDetails.map(job => job.url));
      await saveJobsToExcel(allJobsWithDetails);
    } else {
        logger.info("No new jobs with details were successfully scraped to save.");
    }

  } catch (error) {
    logger.error('A critical error occurred in the main process:', error);
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