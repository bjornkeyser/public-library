import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "http://localhost:3001";
const SCREENSHOT_DIR = path.join(process.cwd(), "screenshots");

// Mobile viewport (iPhone 14 Pro)
const MOBILE_VIEWPORT = { width: 393, height: 852 };

const PAGES_TO_CAPTURE = [
  { name: "home", path: "/" },
  { name: "magazines", path: "/magazines" },
  { name: "skaters", path: "/skaters" },
  { name: "search", path: "/search" },
];

async function captureScreenshots() {
  // Ensure screenshot directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: MOBILE_VIEWPORT,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log("Capturing mobile screenshots...\n");

  for (const { name, path: pagePath } of PAGES_TO_CAPTURE) {
    const url = `${BASE_URL}${pagePath}`;
    console.log(`  ${name}: ${url}`);

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 10000 });
      await page.waitForTimeout(500); // Let animations settle

      const screenshotPath = path.join(SCREENSHOT_DIR, `${name}-mobile.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });
      console.log(`    -> saved to ${screenshotPath}`);

      // Capture menu-open state on home page
      if (name === "home") {
        const menuButton = page.locator('button[aria-label="Open menu"]');
        if (await menuButton.isVisible()) {
          await menuButton.click();
          await page.waitForTimeout(300);
          const menuScreenshotPath = path.join(SCREENSHOT_DIR, "home-menu-open-mobile.png");
          await page.screenshot({
            path: menuScreenshotPath,
            fullPage: false, // Just viewport
          });
          console.log(`    -> menu open saved to ${menuScreenshotPath}`);
        }
      }
    } catch (error) {
      console.error(`    -> ERROR: ${error}`);
    }
  }

  await browser.close();
  console.log("\nDone! Screenshots saved to:", SCREENSHOT_DIR);
}

captureScreenshots().catch(console.error);
