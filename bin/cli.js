#!/usr/bin/env node

import show from "../src/commands/show.js";
import installAgent from "../src/commands/install-agent.js";
import list from "../src/commands/list.js";
import clean from "../src/commands/clean.js";

const commands = {
  show,
  "install-agent": installAgent,
  list,
  clean,
};

function printUsage() {
  console.log(`chat-glass — Visual thinking companion for Claude Code

Usage: chat-glass <command>

Commands:
  show            Open the visualization viewer
  install-agent   Install the chat-glass agent file
  list            List saved visualizations
  clean           Delete all saved pages

Options:
  --help          Show this help message`);
}

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "--help" || command === "-h") {
  printUsage();
  process.exit(0);
}

const handler = commands[command];

if (!handler) {
  console.error(`Unknown command: ${command}\n`);
  printUsage();
  process.exit(1);
}

try {
  await handler(args.slice(1));
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
