// src/scraper.js
import puppeteer from 'puppeteer';
import { config } from '../config.js';
import { logger } from './logger.js';
import { saveJobsToExcel } from './excel.js';

/**
 * Initializes and launches the Puppeteer browser instance.
 */
async function launchBrowser() {
  logger.info('🚀 Launching browser...');
  return await puppeteer.launch({
    headless: config.HEADLESS_MODE,
    args: [
      '--start-maximized',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
      '--disable-notifications',
    ],
  });
}

/**
 * Scrapes job data from a single page.
 * @param {import('puppeteer').Page} page - The Puppeteer page object.
 * @returns {Promise<Array<object>>} - A promise that resolves to an array of job objects.
 */
async function scrapePage(page) {
  try {
    await page.waitForSelector(config.SELECTORS.jobCard, { timeout: 30000 });
  } catch (error) {
    logger.warn('Could not find job card selector. This page might be empty.');
    return []; // Return empty array if no jobs are found
  }

  return await page.$$eval(config.SELECTORS.jobCard, (jobCards, selectors) => {
    return jobCards.map(card => {
      const titleElement = card.querySelector(selectors.jobTitle);
      const companyElement = card.querySelector(selectors.companyName);
      const experienceElement = card.querySelector(selectors.experience);
      const locationElement = card.querySelector(selectors.location);
      return {
        title: titleElement?.innerText.trim() || 'N/A',
        company: companyElement?.innerText.trim() || 'N/A',
        experience: experienceElement?.innerText.trim() || 'N/A',
        location: locationElement?.innerText.trim() || 'N/A',
        url: titleElement?.href || 'N/A',
      };
    });
  }, config.SELECTORS); // Pass selectors into $$eval
}

/**
 * The main scraping function for Naukri.com.
 */
export async function scrapeNaukriJobs() {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  const allJobs = [];

  try {
    const naukriUrl = `https://www.naukri.com/${config.JOB_KEYWORDS.replace(' ', '-')}-jobs-in-${config.JOB_LOCATION.replace(' ', '-')}-experience-${config.EXPERIENCE}`;
    await page.goto(naukriUrl, { waitUntil: 'networkidle2', timeout: config.NETWORK_TIMEOUT });
    logger.info(`✅ Navigated to initial URL: ${naukriUrl}`);

    if (config.APPLY_FRESHNESS_FILTER) {
      try {
        logger.info("⏳ Applying 'Freshness: Last 7 days' filter...");
        await page.click(config.SELECTORS.filterFreshnessButton);
        await page.click(config.SELECTORS.filterFreshness7Days);
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        logger.info('✅ Filter applied successfully.');
      } catch (e) {
        logger.warn('⚠️ Could not apply the freshness filter.', e.message);
      }
    }

    for (let currentPage = 1; currentPage <= config.PAGES_TO_SCRAPE; currentPage++) {
      logger.info(`\n--- Scraping Page ${currentPage} of ${config.PAGES_TO_SCRAPE} ---`);

      if (currentPage > 1) {
        try {
          const pageButtonSelector = config.SELECTORS.pageButton(currentPage);
          await page.waitForSelector(pageButtonSelector, { timeout: 10000 });
          await page.click(pageButtonSelector);
          await page.waitForNavigation({ waitUntil: 'networkidle2' });
          logger.info(`✅ Navigated to page ${currentPage}.`);
        } catch (e) {
          logger.warn(`Could not find or click the link for page ${currentPage}. Ending scraping.`);
          break; // Exit loop if page button isn't found
        }
      }

      const jobsOnPage = await scrapePage(page);
      if (jobsOnPage.length > 0) {
        allJobs.push(...jobsOnPage);
        logger.info(`✅ Scraped ${jobsOnPage.length} jobs from page ${currentPage}.`);
      } else {
        logger.warn('No jobs found on this page. It might be the last page.');
        break; // Stop if a page has no jobs
      }
    }

    await saveJobsToExcel(allJobs);

  } catch (error) {
    logger.error('❌ An error occurred during the scraping process:', error);
    const screenshotPath = 'error_screenshot.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    logger.info(`📸 Screenshot of the error page saved to: ${screenshotPath}`);
  } finally {
    await browser.close();
    logger.info('Browser closed.');
  }
}