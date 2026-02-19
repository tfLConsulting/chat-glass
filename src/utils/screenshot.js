import { findChrome } from "./find-chrome.js";

const CAPTURE_TIMEOUT_MS = 5000;

export async function captureScreenshot(port, outputPath) {
  let timer;
  try {
    const result = await Promise.race([
      doCapture(port, outputPath),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Screenshot timeout")),
          CAPTURE_TIMEOUT_MS
        );
      }),
    ]);
    return result ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function doCapture(port, outputPath) {
  let browser = null;
  try {
    let puppeteer;
    try {
      const mod = await import("puppeteer-core");
      puppeteer = mod.default ?? mod;
    } catch {
      return null;
    }

    const chromePath = await findChrome();
    if (!chromePath) return null;

    browser = await puppeteer.launch({
      headless: true,
      executablePath: chromePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(`http://127.0.0.1:${port}`, {
      waitUntil: "networkidle0",
      timeout: 4000,
    });

    // Short settle time for async renderers
    await new Promise((r) => setTimeout(r, 500));

    await page.screenshot({ path: outputPath, fullPage: true });
    await browser.close();
    browser = null;

    return outputPath;
  } catch {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore cleanup errors
      }
    }
    return null;
  }
}
