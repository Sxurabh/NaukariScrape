// src/excel.js
import ExcelJS from 'exceljs';
import { logger } from './logger.js';
import { config } from '../config.js';

/**
 * Creates and saves an Excel workbook from the scraped job data.
 * @param {Array<object>} allJobs - An array of all job objects scraped.
 */
export async function saveJobsToExcel(allJobs) {
  if (!allJobs || allJobs.length === 0) {
    logger.warn('No jobs were found to save. Skipping file creation.');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Jobs');

  // Define columns
  sheet.columns = [
    { header: 'Title', key: 'title', width: 45 },
    { header: 'Company', key: 'company', width: 35 },
    { header: 'Experience', key: 'experience', width: 15 },
    { header: 'Location', key: 'location', width: 30 },
    { header: 'URL', key: 'url', width: 60 },
  ];

  // Make header bold
  sheet.getRow(1).font = { bold: true };

  // Add job data
  sheet.addRows(allJobs);
  logger.info(`📝 Added ${allJobs.length} total jobs to the Excel sheet.`);

  // Generate filename and save
  const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
  const filename = `${config.OUTPUT_FILENAME_PREFIX}_${timestamp}.xlsx`;

  try {
    await workbook.xlsx.writeFile(filename);
    logger.info(`🎉 Success! Job data saved to ${filename}`);
  } catch (error) {
    logger.error(`❌ Could not save the Excel file: ${filename}`, error);
    throw error; // Re-throw to be caught by the main process
  }
}