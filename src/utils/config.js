import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";
import { configPath, pagesDir } from "./paths.js";

const DEFAULTS = {
  port: null,
  pid: null,
  lastActivity: null,
  createdAt: null,
};

export async function readConfig(projectDir) {
  try {
    const raw = await readFile(configPath(projectDir), "utf8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function writeConfig(projectDir, config) {
  const filePath = configPath(projectDir);
  await mkdir(dirname(filePath), { recursive: true });
  const tmp = filePath + ".tmp";
  await writeFile(tmp, JSON.stringify(config, null, 2) + "\n", "utf8");
  await rename(tmp, filePath);
}

export async function ensureDirs(projectDir) {
  await mkdir(pagesDir(projectDir), { recursive: true });
}
