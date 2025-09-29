// config.js
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // --- Google Sheets (from .env) ---
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
  GCP_CLIENT_EMAIL: process.env.GCP_CLIENT_EMAIL,
  GCP_PRIVATE_KEY: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),

  // --- Search Parameters (from .env) ---
  JOB_KEYWORDS: process.env.JOB_KEYWORDS || "Analyst",
  JOB_LOCATION: process.env.JOB_LOCATION || "Pune",
  EXPERIENCE: process.env.EXPERIENCE || "2",

  // --- Pagination (from .env) ---
  PAGES_TO_SCRAPE: parseInt(process.env.PAGES_TO_SCRAPE, 10) || 1,

  // --- Concurrency & Retries ---
  CONCURRENT_JOBS: parseInt(process.env.CONCURRENT_JOBS, 10) || 5,
  RETRY_COUNT: 3,
  RETRY_DELAY_MS: 2000, // Increased delay

  // --- Puppeteer Settings (from .env) ---
  HEADLESS_MODE: process.env.HEADLESS_MODE === 'true',
  NETWORK_TIMEOUT: 90000,
  // Use proxies if available in .env
  PROXY_LIST: process.env.PROXY_LIST ? process.env.PROXY_LIST.split(',') : [],
  
  // List of realistic User-Agents to rotate through
  USER_AGENTS: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  ],

  PUPPETEER_ARGS: [
    '--start-maximized',
    '--disable-notifications',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-infobars',
    '--window-position=0,0',
    '--ignore-certifcate-errors',
    '--ignore-certifcate-errors-spki-list',
  ],

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
  OUTPUT_DIR: 'output',
  OUTPUT_FILENAME_PREFIX: 'naukri_jobs_detailed',
  ERROR_SCREENSHOT_FILENAME: 'critical_error_screenshot.png',
  FAILED_JOBS_FILENAME: 'failed_jobs.json',
};