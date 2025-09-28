// index.js
import puppeteer from "puppeteer";
import ExcelJS from 'exceljs'; // <-- Import the new Excel library
import fs from "fs";
import { config } from "./config.js";

async function scrapeNaukriJobs() {
  console.log(`🚀 Starting scraper with the following configuration:`);
  console.log(config);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--start-maximized',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
    ]
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  const naukriUrl = `https://www.naukri.com/${config.JOB_KEYWORDS.replace(' ', '-')}-jobs-in-${config.JOB_LOCATION.replace(' ', '-')}-experience-${config.EXPERIENCE}`;
  
  // --- NEW: EXCEL WORKBOOK SETUP ---
  const workbook = new ExcelJS.Workbook();

  try {
    await page.goto(naukriUrl, { waitUntil: 'networkidle2', timeout: 90000 });
    console.log(`✅ Navigated to initial URL: ${naukriUrl}`);

    if (config.APPLY_FRESHNESS_FILTER) {
      try {
        console.log("⏳ Applying 'Freshness: Last 7 days' filter...");
        await page.click('#filter-freshness');
        await page.click('a[data-id="filter-freshness-7"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log("✅ Filter applied successfully.");
      } catch (e) {
        console.warn("⚠️ Could not apply the freshness filter.", e.message);
      }
    }

    // --- PAGINATION AND SCRAPING LOOP ---
    for (let currentPage = 1; currentPage <= config.PAGES_TO_SCRAPE; currentPage++) {
      console.log(`\n--- Scraping Page ${currentPage} of ${config.PAGES_TO_SCRAPE} ---`);

      if (currentPage > 1) {
        try {
          const pageButtonSelector = `div.styles_pages__v1rAK a[href$='-${currentPage}']`;
          await page.waitForSelector(pageButtonSelector, { timeout: 10000 });
          await page.click(pageButtonSelector);
          await page.waitForNavigation({ waitUntil: 'networkidle2' });
          console.log(`✅ Navigated to page ${currentPage}.`);
        } catch (e) {
          console.log(`Could not find link for page ${currentPage}. Ending scraping.`);
          break;
        }
      }

      const jobCardSelector = 'div.cust-job-tuple';
      await page.waitForSelector(jobCardSelector, { timeout: 30000 });

      const jobsOnPage = await page.$$eval(jobCardSelector, (jobCards) => {
        return jobCards.map(card => {
          const titleElement = card.querySelector('a.title');
          const companyElement = card.querySelector('a.comp-name');
          const experienceElement = card.querySelector('span.expwdth');
          const locationElement = card.querySelector('span.locWdth');
          return {
            title: titleElement?.innerText.trim() || 'N/A',
            company: companyElement?.innerText.trim() || 'N/A',
            experience: experienceElement?.innerText.trim() || 'N/A',
            location: locationElement?.innerText.trim() || 'N/A',
            url: titleElement?.href || 'N/A',
          };
        });
      });
      
      console.log(`✅ Scraped ${jobsOnPage.length} jobs from page ${currentPage}.`);
      
      // --- NEW: ADD DATA TO A NEW EXCEL SHEET ---
      if (jobsOnPage.length > 0) {
        const sheet = workbook.addWorksheet(`Page ${currentPage}`);
        
        // Define the columns for the sheet
        sheet.columns = [
          { header: 'Title', key: 'title', width: 40 },
          { header: 'Company', key: 'company', width: 30 },
          { header: 'Experience', key: 'experience', width: 15 },
          { header: 'Location', key: 'location', width: 30 },
          { header: 'URL', key: 'url', width: 50 },
        ];
        
        // Add the job data rows to the sheet
        sheet.addRows(jobsOnPage);
        console.log(`📝 Added data for Page ${currentPage} to the Excel file.`);
      }
    }

    // --- SAVE THE FINAL EXCEL FILE ---
    if (workbook.worksheets.length > 0) {
      const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
      const filename = `naukri_jobs_${timestamp}.xlsx`; // <-- Note the .xlsx extension
      
      await workbook.xlsx.writeFile(filename);
      console.log(`\n🎉 Success! A total of ${workbook.worksheets.length} pages of job data were saved to ${filename}`);
    } else {
      console.log("\nNo jobs were found to save.");
    }

  } catch (error) {
    console.error("❌ An error occurred during scraping:", error);
    await page.screenshot({ path: 'error_screenshot.png', fullPage: true });
    console.log(`📸 Screenshot of the error page saved to: error_screenshot.png`);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

scrapeNaukriJobs();