// src/scraper.js
import puppeteer from 'puppeteer';
import { config } from '../config.js';
import { logger } from './logger.js';
import { saveJobsToExcel } from './excel.js';
import { retry, chunk } from './utils.js';

async function launchBrowser() {
  logger.info('Launching browser...');
  return await puppeteer.launch({
    headless: config.HEADLESS_MODE,
    // --- FIX: Added arguments for running in a CI/CD environment like GitHub Actions ---
    args: [
      '--start-maximized',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
      '--disable-notifications',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });
}

async function scrapeSummaryPage(page) {
  try {
    await page.waitForSelector(config.SELECTORS.jobCard, { timeout: 30000 });
  } catch (error) {
    logger.warn('Could not find job card selector on this page. It might be empty.');
    return [];
  }
  return page.$$eval(config.SELECTORS.jobCard, (jobCards, selectors) => {
    return jobCards.map(card => {
      const titleElement = card.querySelector(selectors.jobTitle);
      return {
        title: titleElement?.innerText.trim() || 'N/A',
        company: card.querySelector(selectors.companyName)?.innerText.trim() || 'N/A',
        experience: card.querySelector(selectors.experience)?.innerText.trim() || 'N/A',
        location: card.querySelector(selectors.location)?.innerText.trim() || 'N/A',
        url: titleElement?.href || null,
      };
    }).filter(job => job.url);
  }, config.SELECTORS);
}

async function scrapeJobDetails(browser, jobSummary) {
  const detailPage = await browser.newPage();
  try {
    await retry(() => detailPage.goto(jobSummary.url, { waitUntil: 'networkidle2' }), `Navigating to ${jobSummary.url}`);
    const description = await detailPage.$eval(config.SELECTORS.jobDescription, el => el.innerText).catch(() => 'N/A');
    const skills = await detailPage.$$eval(config.SELECTORS.skills, nodes => nodes.map(n => n.innerText).join(', ')).catch(() => 'N/A');
    return { ...jobSummary, description, skills };
  } catch (error) {
    logger.warn(`Could not scrape details for "${jobSummary.title}". Skipping.`);
    return { ...jobSummary, description: 'Error scraping details', skills: 'Error scraping details' };
  } finally {
    await detailPage.close();
  }
}

export async function scrapeNaukriJobs() {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  const allJobSummaries = [];
  try {
    // FINAL CORRECTED URL with experience as a query parameter
    const naukriUrl = `https://www.naukri.com/${config.JOB_KEYWORDS.replace(' ', '-')}-jobs-in-${config.JOB_LOCATION.replace(' ', '-')}?experience=${config.EXPERIENCE}`;
    
    await page.goto(naukriUrl, { waitUntil: 'networkidle2', timeout: config.NETWORK_TIMEOUT });
    logger.success(`Mapsd to initial URL: ${naukriUrl}`);

    for (let currentPage = 1; currentPage <= config.PAGES_TO_SCRAPE; currentPage++) {
      logger.step(`Scraping Summary Page ${currentPage} of ${config.PAGES_TO_SCRAPE}`);
      if (currentPage > 1) {
        try {
          const pageButtonSelector = config.SELECTORS.pageButton(currentPage);
          await page.waitForSelector(pageButtonSelector, { timeout: 15000 });
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click(pageButtonSelector),
          ]);
        } catch (e) {
          logger.warn(`Could not navigate to page ${currentPage}. Ending summary collection.`);
          break;
        }
      }
      const summariesOnPage = await scrapeSummaryPage(page);
      allJobSummaries.push(...summariesOnPage);
      logger.success(`Found ${summariesOnPage.length} job summaries.`);
    }

    logger.step(`Collected ${allJobSummaries.length} total job summaries. Now scraping details...`);
    const allJobsWithDetails = [];
    const jobChunks = chunk(allJobSummaries, config.CONCURRENT_JOBS);
    for (const [index, chunkOfJobs] of jobChunks.entries()) {
      logger.info(`Processing chunk ${index + 1} of ${jobChunks.length}...`);
      const promises = chunkOfJobs.map(summary => scrapeJobDetails(browser, summary));
      const results = await Promise.all(promises);
      allJobsWithDetails.push(...results);
    }
    
    await saveJobsToExcel(allJobsWithDetails);
  } catch (error) {
    logger.error('A critical error occurred in the main scraping process:', error);
    await page.screenshot({ path: 'critical_error_screenshot.png', fullPage: true });
  } finally {
    await browser.close();
    logger.info('Browser closed.');
  }
}