import { readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { pagesDir, getProjectDir } from "../utils/paths.js";

export default async function clean() {
  const dir = pagesDir(getProjectDir());
  let files;
  try {
    files = await readdir(dir);
  } catch {
    console.log("No pages directory found.");
    return;
  }

  const targets = files.filter((f) => f.endsWith(".html"));

  if (targets.length === 0) {
    console.log("No pages to clean.");
    return;
  }

  let removed = 0;
  for (const filename of targets) {
    try {
      await unlink(join(dir, filename));
      removed++;
    } catch {
      // skip files that can't be removed
    }
  }

  console.log(`Removed ${removed} page(s).`);
}
