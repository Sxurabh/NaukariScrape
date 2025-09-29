// src/sheets.js
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { config } from '../config.js';
import { logger } from './logger.js';

let doc;
let sheet;

const HEADERS = ['Title', 'Company', 'Experience', 'Location', 'Skills', 'Description', 'URL', 'ScrapedAt'];

/**
 * Initializes connection to the Google Sheet and automatically selects or creates a sheet for the current month.
 */
export async function initializeSheet() {
  if (!config.GOOGLE_SHEET_ID || !config.GCP_CLIENT_EMAIL || !config.GCP_PRIVATE_KEY) {
    throw new Error('Google Sheets credentials are not fully configured. Check your .env file.');
  }

  const serviceAccountAuth = new JWT({
    email: config.GCP_CLIENT_EMAIL,
    key: config.GCP_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  doc = new GoogleSpreadsheet(config.GOOGLE_SHEET_ID, serviceAccountAuth);
  
  await doc.loadInfo();
  logger.info(`Connected to Google Spreadsheet: "${doc.title}"`);

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const sheetTitle = `NaukariScraperV${month}.${year}`;

  sheet = doc.sheetsByTitle[sheetTitle];

  if (!sheet) {
    logger.info(`No sheet found for this month. Creating new sheet: "${sheetTitle}"...`);
    sheet = await doc.addSheet({ title: sheetTitle, headerValues: HEADERS });
    logger.success(`Sheet "${sheetTitle}" created successfully.`);
  } else {
    logger.info(`Using existing sheet for this month: "${sheetTitle}"`);
    await sheet.setHeaderRow(HEADERS);
  }
}

/**
 * Loads ALL previously scraped job URLs from EVERY sheet in the document to prevent duplicates.
 * @returns {Promise<Set<string>>}
 */
export async function loadScrapedUrlsFromSheet() {
  if (!doc) throw new Error('Document not initialized.');
  
  const allUrls = new Set();
  logger.info('Checking all sheets for existing job URLs to prevent duplicates...');

  for (const currentSheet of doc.sheetsByIndex) {
    try {
      // --- FIX: Explicitly load the header row for each sheet before trying to read it. ---
      await currentSheet.loadHeaderRow();

      // The previous safety check is still good practice.
      if (currentSheet.headerValues && currentSheet.headerValues.length > 0) {
        const rows = await currentSheet.getRows();
        rows.forEach(row => {
          const url = row.get('URL');
          if (url) {
            allUrls.add(url);
          }
        });
      }
    } catch (error) {
      // This will catch any sheets that are truly blank and cannot have their headers loaded.
      logger.warn(`Skipping sheet "${currentSheet.title}" as it appears to be empty or unformatted.`);
    }
  }
  
  logger.info(`Found ${allUrls.size} total unique jobs across all sheets.`);
  return allUrls;
}

/**
 * Saves an array of new jobs to the currently active monthly Google Sheet.
 * @param {Array<Object>} jobs
 * @returns {Promise<number>} The number of rows added.
 */
export async function saveJobsToSheet(jobs) {
  if (!sheet) throw new Error('Sheet not initialized.');
  if (jobs.length === 0) return 0;

  const rowsToAdd = jobs.map(job => ({
    Title: job.title,
    Company: job.company,
    Experience: job.experience,
    Location: job.location,
    Skills: job.skills,
    Description: job.description,
    URL: job.url,
    ScrapedAt: new Date().toISOString(),
  }));

  await sheet.addRows(rowsToAdd);
  return jobs.length;
}