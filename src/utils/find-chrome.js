import { access } from "node:fs/promises";

const CANDIDATES = {
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
  linux: [
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ],
  win32: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ],
};

export async function findChrome() {
  const paths = CANDIDATES[process.platform] || [];
  for (const p of paths) {
    try {
      await access(p);
      return p;
    } catch {
      // not found, try next
    }
  }
  return null;
}
