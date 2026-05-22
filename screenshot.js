const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Set the localStorage for auth
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  
  await page.evaluate((token) => {
    localStorage.setItem('auth_token', token);
  }, "39|OnCvc1AJdKmHVhmfHbQB75lsRcFlX4JN1a2CU0plf293030e");

  await page.goto('http://localhost:5173/driver/schedule', { waitUntil: 'networkidle2' });
  
  // Wait a bit for queries to load
  await new Promise(r => setTimeout(r, 2000));
  
  await page.screenshot({ path: 'driver_schedule.png', fullPage: true });

  await page.goto('http://localhost:5173/driver/trips', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'driver_trips.png', fullPage: true });

  await browser.close();
})();
