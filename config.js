// config.js
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // --- Search Parameters (from .env) ---
  JOB_KEYWORDS: process.env.JOB_KEYWORDS || "Analyst",
  JOB_LOCATION: process.env.JOB_LOCATION || "Pune",
  EXPERIENCE: process.env.EXPERIENCE || "2",

  // --- Pagination (from .env) ---
  PAGES_TO_SCRAPE: parseInt(process.env.PAGES_TO_SCRAPE, 10) || 1,

  // --- Concurrency & Retries ---
  CONCURRENT_JOBS: parseInt(process.env.CONCURRENT_JOBS, 10) || 5,
  RETRY_COUNT: 3,
  RETRY_DELAY_MS: 1000,

  // --- Puppeteer Settings (from .env) ---
  HEADLESS_MODE: process.env.HEADLESS_MODE === 'true',
  NETWORK_TIMEOUT: 90000,

  // --- Static Selectors ---
  SELECTORS: {
    jobCard: 'div.cust-job-tuple',
    jobTitle: 'a.title',
    companyName: 'a.comp-name',
    experience: 'span.expwdth',
    location: 'span.locWdth',
    pageButton: (page) => `a[href*='-jobs-in-'][href$='-${page}']`,
    jobDescription: 'section[class*="job-desc"]',
    skills: '.styles_key-skill__GIPn_ .styles_chip__7YCfG',
  },

  // --- File Output ---
  OUTPUT_DIR: 'output', // All generated files will go here
  OUTPUT_FILENAME_PREFIX: 'naukri_jobs_detailed',
  STATE_FILENAME: 'scraped_urls.json',
  ERROR_SCREENSHOT_FILENAME: 'critical_error_screenshot.png',
};