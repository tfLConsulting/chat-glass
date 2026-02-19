#!/usr/bin/env node

// Standalone entry point for running the server as a detached background process.
// Invoked by the show command via child_process.spawn.

import { startServer } from "./index.js";

const projectDir = process.argv[2] || process.cwd();

try {
  const { port } = await startServer(projectDir);
  // Write port to stdout so the parent process can read it
  process.stdout.write(String(port));
} catch (err) {
  process.stderr.write(err.message);
  process.exit(1);
}
