from selenium import webdriver
from selenium.webdriver.chrome.service import Service

chrome_driver_path = 'C:/chromedriver/chromedriver.exe'  # Update this path
service = Service(chrome_driver_path)
driver = webdriver.Chrome(service=service)
driver.get('https://www.naukri.com')
print(driver.title)
driver.quit()