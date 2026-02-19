import { join } from "node:path";

export function pagesDir(projectDir) {
  return join(projectDir, ".chat-glass", "pages");
}

export function configPath(projectDir) {
  return join(projectDir, ".chat-glass", "config.json");
}

export function latestPath(projectDir) {
  return join(projectDir, ".chat-glass", "pages", "latest.html");
}

export function getProjectDir() {
  return process.cwd();
}
