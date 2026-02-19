import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pagesDir, getProjectDir } from "../utils/paths.js";

function extractTitle(html) {
  const match = html.match(/<title>(.*?)<\/title>/i);
  return match ? match[1] : null;
}

export default async function list() {
  const dir = pagesDir(getProjectDir());
  let files;
  try {
    files = await readdir(dir);
  } catch {
    console.log("No pages directory found.");
    return;
  }

  const htmlFiles = files
    .filter((f) => f.endsWith(".html") && f !== "latest.html")
    .sort((a, b) => b.localeCompare(a));

  if (htmlFiles.length === 0) {
    console.log("No pages found.");
    return;
  }

  for (const filename of htmlFiles) {
    let title = null;
    try {
      const content = await readFile(join(dir, filename), "utf8");
      title = extractTitle(content);
    } catch {
      // skip unreadable files
    }
    const display = title ? `${filename}  ${title}` : filename;
    console.log(display);
  }

  console.log(`\n${htmlFiles.length} page(s)`);
}
