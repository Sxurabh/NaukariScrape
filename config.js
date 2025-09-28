// config.js

// -- All your scraper settings are here --

export const config = {
  // --- Search Parameters ---
  JOB_KEYWORDS: "Analyst",
  JOB_LOCATION: "Pune",
  EXPERIENCE: "2", // Experience in years

  // --- Pagination ---
  // The total number of pages you want to scrape.
  // Set to 1 if you only want the first page.
  PAGES_TO_SCRAPE: 2,

  // --- Filters ---
  // Set to true to apply the "Last 7 days" filter, false to disable it.
  APPLY_FRESHNESS_FILTER: true,
};