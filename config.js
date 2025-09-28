// config.js
export const config = {
  // --- Search Parameters ---
  JOB_KEYWORDS: "Analyst",
  JOB_LOCATION: "Pune",
  EXPERIENCE: "2", // Experience in years

  // --- Pagination ---
  PAGES_TO_SCRAPE: 2,

  // --- Concurrency & Retries ---
  CONCURRENT_JOBS: 5, 
  RETRY_COUNT: 3,
  RETRY_DELAY_MS: 1000,

  // --- Filters ---
  APPLY_FRESHNESS_FILTER: true,

  // --- Puppeteer Settings ---
  HEADLESS_MODE: true,
  NETWORK_TIMEOUT: 90000,

  // --- Selectors (for easier maintenance) ---
  SELECTORS: {
    // Search results page
    filterFreshnessButton: '#filter-freshness',
    filterFreshness7Days: 'a[data-id="filter-freshness-7"]',
    jobCard: 'div.cust-job-tuple',
    jobTitle: 'a.title',
    companyName: 'a.comp-name',
    experience: 'span.expwdth',
    location: 'span.locWdth',
    // FINAL, MOST ROBUST SELECTOR for the page button
    pageButton: (page) => `a[href*='-jobs-in-'][href$='-${page}']`,

    // Job details page
    jobDescription: 'section[class*="job-desc"]',
    skills: '.styles_key-skill__GIPn_ .styles_chip__7YCfG',
  },

  // --- File Output ---
  OUTPUT_FILENAME_PREFIX: 'naukri_jobs_detailed',
};