// src/excel.js
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs/promises'; // Import fs/promises
import { logger } from './logger.js';
import { config } from '../config.js';
import { ensureDirExists } from './utils.js';

export async function saveJobsToExcel(allJobs) {
  if (!allJobs || allJobs.length === 0) {
    logger.warn('No jobs were found to save. Skipping file creation.');
    return;
  }

  // --- Ensure the output directory exists ---
  await ensureDirExists(config.OUTPUT_DIR);

  // --- Save to JSON (for the webapp) ---
  const jsonFilePath = path.join(config.OUTPUT_DIR, 'scraped_data.json');
  try {
    await fs.writeFile(jsonFilePath, JSON.stringify(allJobs, null, 2), 'utf-8');
    logger.success(`📝 Job data saved to ${jsonFilePath} for the webapp.`);
  } catch (error) {
    logger.error(`❌ Could not save the JSON file: ${jsonFilePath}`, error);
  }

  // --- Save to Excel (existing functionality) ---
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Jobs');

  sheet.columns = [
    { header: 'Title', key: 'title', width: 45 },
    { header: 'Company', key: 'company', width: 35 },
    { header: 'Experience', key: 'experience', width: 15 },
    { header: 'Location', key: 'location', width: 30 },
    { header: 'Skills', key: 'skills', width: 50 },
    { header: 'Job Description', key: 'description', width: 70 },
    { header: 'URL', key: 'url', width: 60 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getColumn('description').alignment = { wrapText: true, vertical: 'top' };
  sheet.getColumn('skills').alignment = { wrapText: true, vertical: 'top' };

  sheet.addRows(allJobs);
  logger.info(`📝 Added ${allJobs.length} total jobs to the Excel sheet.`);

  const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
  const filename = `${config.OUTPUT_FILENAME_PREFIX}_${timestamp}.xlsx`;
  const filePath = path.join(config.OUTPUT_DIR, filename);

  try {
    await workbook.xlsx.writeFile(filePath);
    logger.success(`🎉 Success! Job data saved to ${filePath}`);
  } catch (error) {
    logger.error(`❌ Could not save the Excel file: ${filePath}`, error);
    throw error;
  }
}