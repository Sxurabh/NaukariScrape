import logging
import random
import time
import os
import pickle
import pandas as pd
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from bs4 import BeautifulSoup

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scraper.log'),
        logging.StreamHandler()
    ]
)

# Set up ChromeDriver with anti-detection settings
chrome_driver_path = 'C:/chromedriver/chromedriver.exe'  # Update with your path
options = webdriver.ChromeOptions()
options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36")
options.add_argument("--disable-blink-features=AutomationControlled")
options.add_experimental_option("excludeSwitches", ["enable-automation"])
options.add_experimental_option('useAutomationExtension', False)
options.add_argument("--window-size=1920,1080")  # Keep headless off for debugging
options.add_argument("--disable-gpu")
options.add_argument("--no-sandbox")
options.add_argument("--disable-webgl")

# Initialize WebDriver
service = Service(chrome_driver_path)
driver = webdriver.Chrome(service=service, options=options)

# Initialize list to store job data
jobs_data = []

# Scrape up to 2 pages (limit for efficiency since we're visiting each job's detailed page)
base_url = 'https://www.naukri.com/data-analyst-jobs-{page}?k=data%20analyst&experience=3&cityTypeGid=9508'
max_pages = 2

try:
    for page in range(1, max_pages + 1):
        url = base_url.format(page=page)
        logging.info(f"Scraping page {page}: {url}")

        # Load the page
        driver.get(url)
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )

        # Simulate human behavior
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight/2);")
        time.sleep(random.uniform(2, 4))
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(random.uniform(3, 5))
        ActionChains(driver).move_by_offset(100, 100).perform()
        time.sleep(random.uniform(1, 2))

        # Check for CAPTCHA or login page
        page_source = driver.page_source
        if any(keyword in page_source.lower() for keyword in ['captcha', 'verify you are not a robot', 'login', 'sign in']):
            logging.warning("CAPTCHA or login page detected. Saving page source as 'captcha_page.html'.")
            with open('captcha_page.html', 'w', encoding='utf-8') as f:
                f.write(page_source)
            raise Exception("Blocked by CAPTCHA or login. Check 'captcha_page.html'.")

        # Find job cards using Selenium (since we need to click them)
        job_cards = WebDriverWait(driver, 20).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.jobTuple"))
        )
        logging.info(f"Found {len(job_cards)} job cards on page {page}")

        if not job_cards:
            logging.warning("No job cards found. Saving page source as 'page_source.html'.")
            with open('page_source.html', 'w', encoding='utf-8') as f:
                f.write(page_source)
            continue

        # Process each job card
        for index, job_card in enumerate(job_cards):
            try:
                # Scroll to the job card to ensure it's clickable
                driver.execute_script("arguments[0].scrollIntoView(true);", job_card)
                time.sleep(random.uniform(1, 2))

                # Click the job card to open the detailed page
                job_title_link = job_card.find_element(By.CSS_SELECTOR, "a.title")
                job_link = job_title_link.get_attribute('href')
                ActionChains(driver).move_to_element(job_title_link).click().perform()
                logging.info(f"Clicked job card {index + 1}: {job_link}")

                # Wait for the detailed page to load
                WebDriverWait(driver, 20).until(
                    EC.presence_of_element_located((By.TAG_NAME, "body"))
                )
                time.sleep(random.uniform(2, 4))

                # Parse the detailed page
                soup = BeautifulSoup(driver.page_source, 'html.parser')

                # Extract job title
                title_elem = soup.select_one('h1.title')
                title = title_elem.text.strip() if title_elem else 'N/A'

                # Extract company name
                company_elem = soup.select_one('a.companyName')
                company = company_elem.text.strip() if company_elem else 'N/A'

                # Extract skills
                skills_tags = soup.select('div.key-skill a')
                skills = [tag.text.strip() for tag in skills_tags] if skills_tags else []

                # Extract location
                location_elem = soup.select_one('span.locWdth')
                location = location_elem.text.strip() if location_elem else 'N/A'

                # Extract experience
                experience_elem = soup.select_one('span.expwdth')
                experience = experience_elem.text.strip() if experience_elem else 'N/A'

                # Extract job description
                description_elem = soup.select_one('div.dang-inner-html')
                description = description_elem.text.strip() if description_elem else 'N/A'

                # Store job data
                jobs_data.append({
                    'Title': title,
                    'Company': company,
                    'Skills': ', '.join(skills),
                    'Location': location,
                    'Experience': experience,
                    'Description': description,
                    'Link': job_link
                })

                logging.info(f"Scraped detailed page for job: {title}")

                # Navigate back to the listing page
                driver.back()
                WebDriverWait(driver, 20).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "div.jobTuple"))
                )
                time.sleep(random.uniform(2, 4))

                # Re-find job cards after navigating back
                job_cards = driver.find_elements(By.CSS_SELECTOR, "div.jobTuple")

            except Exception as e:
                logging.error(f"Error processing job card {index + 1}: {e}")
                # Navigate back if an error occurs
                driver.back()
                WebDriverWait(driver, 20).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "div.jobTuple"))
                )
                time.sleep(random.uniform(2, 4))
                job_cards = driver.find_elements(By.CSS_SELECTOR, "div.jobTuple")
                continue

        # Delay between pages to reduce detection risk
        time.sleep(random.uniform(5, 10))

except Exception as e:
    logging.error(f"Error during scraping: {e}")
    logging.info("Suggestions:")
    logging.info("- If CAPTCHA/login detected, open 'captcha_page.html' in a browser, solve it, then rerun the script.")
    logging.info("- Wait 24 hours or use a different network (e.g., mobile hotspot).")
    logging.info("- If no jobs found, check 'page_source.html' to verify the URL returns job listings.")

finally:
    driver.quit()
    logging.info("WebDriver closed.")

# Create DataFrame and filter results
df = pd.DataFrame(jobs_data)
logging.info(f"Total jobs scraped: {len(df)}")

# Only filter if DataFrame is not empty and contains the expected columns
if not df.empty and 'Location' in df.columns and 'Experience' in df.columns:
    df_filtered = df[
        (df['Location'].str.contains('Pune', case=False, na=False)) &
        (df['Experience'].str.contains('2-4|3-5|3', case=False, na=False))
    ]
    logging.info(f"Jobs after filtering (Pune, ~3 years experience): {len(df_filtered)}")

    # Save filtered data
    df_filtered.to_csv('naukri_data_analyst_jobs_pune.csv', index=False)
    logging.info("Filtered data saved to 'naukri_data_analyst_jobs_pune.csv'.")

    # Summarize skills
    if 'Skills' in df_filtered.columns:
        skills_list = df_filtered['Skills'].str.split(', ').explode().value_counts().head(20)
        skills_df = pd.DataFrame({'Skill': skills_list.index, 'Count': skills_list.values})
        skills_df.to_csv('top_skills_pune.csv', index=False)
        logging.info(f"Top skills:\n{skills_df}")
else:
    logging.warning("No jobs scraped or missing required columns. Skipping filtering and saving.")  