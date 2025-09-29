// src/NaukriScraper.js
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { config } from '../config.js';
import { logger } from './logger.js';
import { retry, getRandomElement, sleep } from './utils.js';

puppeteer.use(StealthPlugin());

export class NaukriScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.proxy = null;
  }

  async initialize() {
    logger.info('Launching browser in stealth mode...');
    
    const puppeteerArgs = [...config.PUPPETEER_ARGS];
    if (config.PROXY_LIST.length > 0) {
      this.proxy = getRandomElement(config.PROXY_LIST);
      puppeteerArgs.push(`--proxy-server=${this.proxy}`);
      logger.info(`Using proxy: ${this.proxy}`);
    }

    this.browser = await puppeteer.launch({
      headless: config.HEADLESS_MODE,
      args: puppeteerArgs,
    });
    
    this.page = await this.browser.newPage();
    
    // Rotate User-Agent
    const userAgent = getRandomElement(config.USER_AGENTS);
    await this.page.setUserAgent(userAgent);
    logger.info(`Using User-Agent: ${userAgent}`);

    await this.page.setViewport({ width: 1366, height: 768 });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      logger.info('Browser closed.');
    }
  }

  async navigateToSearchPage(keywords, location, experience) {
    const url = `https://www.naukri.com/${keywords.replace(' ', '-')}-jobs-in-${location.replace(' ', '-')}?experience=${experience}`;
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: config.NETWORK_TIMEOUT });
    logger.success(`Mapsd to initial URL: ${url}`);
  }

  async scrapeSummaryPage() {
    try {
      await this.page.waitForSelector(config.SELECTORS.jobCard, { timeout: 30000 });
      
      return await this.page.$$eval(config.SELECTORS.jobCard, (cards, selectors) => 
        cards.map(card => ({
          title: card.querySelector(selectors.jobTitle)?.innerText.trim() || 'N/A',
          company: card.querySelector(selectors.companyName)?.innerText.trim() || 'N/A',
          experience: card.querySelector(selectors.experience)?.innerText.trim() || 'N/A',
          location: card.querySelector(selectors.location)?.innerText.trim() || 'N/A',
          url: card.querySelector(selectors.jobTitle)?.href || null,
        })).filter(job => job.url),
        config.SELECTORS
      );
    } catch (error) {
        logger.error(`Error scraping summary page. It's possible the page structure has changed or there are no results.`);
        return []; // Return empty array on failure
    }
  }

  async goToNextPage(pageNumber) {
    const selector = config.SELECTORS.pageButton(pageNumber);
    await this.page.waitForSelector(selector, { timeout: 15000 });
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
      this.page.click(selector),
    ]);
    await sleep(Math.random() * 2000 + 1000); // Random delay
  }

  async scrapeJobDetails(jobSummary) {
    const detailPage = await this.browser.newPage();
    try {
        // Use a different user agent for each detail page request
        await detailPage.setUserAgent(getRandomElement(config.USER_AGENTS));

      await retry(() => detailPage.goto(jobSummary.url, { waitUntil: 'networkidle2' }), `Navigating to ${jobSummary.url}`);
      
      const description = await detailPage.$eval(config.SELECTORS.jobDescription, el => el.innerText).catch(() => 'N/A');
      const skills = await detailPage.$$eval(config.SELECTORS.skills, nodes => nodes.map(n => n.innerText).join(', ')).catch(() => 'N/A');
      
      return { ...jobSummary, description, skills };
    } catch (error) {
      logger.error(`Failed to scrape details for ${jobSummary.title}: ${jobSummary.url}`, error.message);
      return { ...jobSummary, description: 'Error scraping details', skills: 'Error scraping details', error: true };
    } finally {
      await detailPage.close();
    }
  }
}