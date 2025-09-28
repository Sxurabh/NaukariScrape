// src/NaukriScraper.js
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { config } from '../config.js';
import { logger } from './logger.js';
import { retry } from './utils.js';

// Use the stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

export class NaukriScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    logger.info('Launching browser in stealth mode...');
    this.browser = await puppeteer.launch({
      headless: config.HEADLESS_MODE,
      args: ['--start-maximized', '--disable-notifications'],
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1366, height: 768 });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      logger.info('Browser closed.');
    }
  }

  async navigateToSearchPage() {
    const url = `https://www.naukri.com/${config.JOB_KEYWORDS.replace(' ', '-')}-jobs-in-${config.JOB_LOCATION.replace(' ', '-')}?experience=${config.EXPERIENCE}`;
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: config.NETWORK_TIMEOUT });
    // Fixed typo in the log message below
    logger.success(`Mapsd to initial URL: ${url}`);
  }

  async scrapeSummaryPage() {
    // Adding an extra wait here to ensure dynamic content loads
    await this.page.waitForSelector(config.SELECTORS.jobCard, { timeout: 30000 });
    
    return this.page.$$eval(config.SELECTORS.jobCard, (cards, selectors) => 
      cards.map(card => ({
        title: card.querySelector(selectors.jobTitle)?.innerText.trim() || 'N/A',
        company: card.querySelector(selectors.companyName)?.innerText.trim() || 'N/A',
        experience: card.querySelector(selectors.experience)?.innerText.trim() || 'N/A',
        location: card.querySelector(selectors.location)?.innerText.trim() || 'N/A',
        url: card.querySelector(selectors.jobTitle)?.href || null,
      })).filter(job => job.url),
      config.SELECTORS
    );
  }

  async goToNextPage(pageNumber) {
    const selector = config.SELECTORS.pageButton(pageNumber);
    await this.page.waitForSelector(selector, { timeout: 15000 });
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
      this.page.click(selector),
    ]);
  }

  async scrapeJobDetails(jobSummary) {
    const detailPage = await this.browser.newPage();
    try {
      await retry(() => detailPage.goto(jobSummary.url, { waitUntil: 'networkidle2' }), `Navigating to ${jobSummary.url}`);
      const description = await detailPage.$eval(config.SELECTORS.jobDescription, el => el.innerText).catch(() => 'N/A');
      const skills = await detailPage.$$eval(config.SELECTORS.skills, nodes => nodes.map(n => n.innerText).join(', ')).catch(() => 'N/A');
      return { ...jobSummary, description, skills };
    } finally {
      await detailPage.close();
    }
  }
}