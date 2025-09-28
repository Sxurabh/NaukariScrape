// config.js
export const config = {
  // --- Search Parameters ---
  JOB_KEYWORDS: "Analyst",
  JOB_LOCATION: "Pune",
  EXPERIENCE: "2", // Experience in years

  // --- Pagination ---
  PAGES_TO_SCRAPE: 2,

  // --- Filters ---
  APPLY_FRESHNESS_FILTER: true,

  // --- Puppeteer Settings ---
  HEADLESS_MODE: true, // Set to false to watch the browser actions
  NETWORK_TIMEOUT: 90000, // 90 seconds

  // --- Selectors (for easier maintenance) ---
  SELECTORS: {
    filterFreshnessButton: '#filter-freshness',
    filterFreshness7Days: 'a[data-id="filter-freshness-7"]',
    jobCard: 'div.cust-job-tuple',
    jobTitle: 'a.title',
    companyName: 'a.comp-name',
    experience: 'span.expwdth',
    location: 'span.locWdth',
    pageButton: (page) => `div.styles_pages__v1rAK a[href$='-${page}']`,
  },

  // --- File Output ---
  OUTPUT_FILENAME_PREFIX: 'naukri_jobs',
};