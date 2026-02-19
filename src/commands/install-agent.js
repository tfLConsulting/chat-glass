import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = resolve(__dirname, "..", "..");
const AGENT_SOURCE = join(PACKAGE_ROOT, "agent", "chat-glass.md");
const CLI_PATH = join(PACKAGE_ROOT, "bin", "cli.js");

export default async function installAgent(args = []) {
  const isLocal = args.includes("--local");
  const isDev = args.includes("--dev");

  const destDir = isLocal
    ? join(process.cwd(), ".claude", "agents")
    : join(homedir(), ".claude", "agents");

  const destPath = join(destDir, "chat-glass.md");

  // Read source agent file
  let source;
  try {
    source = await readFile(AGENT_SOURCE, "utf8");
  } catch {
    console.error("Could not read agent file from package. Is chat-glass installed correctly?");
    process.exit(1);
  }

  // Dev mode: rewrite `chat-glass` commands to use the local checkout
  if (isDev) {
    const localCmd = `node ${CLI_PATH}`;
    source = source.replace(/`chat-glass show`/g, `\`${localCmd} show\``);
    source = source.replace(/`chat-glass /g, `\`${localCmd} `);
    source = source.replace(
      /Run: `node .* show`/,
      `Run: \`${localCmd} show\``
    );
  }

  // Check if destination already exists and is identical
  try {
    const existing = await readFile(destPath, "utf8");
    if (existing === source) {
      console.log("Agent already up to date.");
      return;
    }
  } catch {
    // File doesn't exist yet — that's fine
  }

  // Write agent file
  await mkdir(destDir, { recursive: true });
  await writeFile(destPath, source, "utf8");

  if (isDev) {
    console.log(`Agent installed (dev mode) — commands point to ${CLI_PATH}`);
  } else if (isLocal) {
    console.log("Agent installed to .claude/agents/chat-glass.md — available in this project");
  } else {
    console.log("Agent installed to ~/.claude/agents/chat-glass.md — available in all projects");
  }
}
