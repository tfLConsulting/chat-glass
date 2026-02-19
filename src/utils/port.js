import { createServer } from "node:net";

const PORT_MIN = 3737;
const PORT_MAX = 3747;

function tryPort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.on("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}

export async function findFreePort() {
  for (let port = PORT_MIN; port <= PORT_MAX; port++) {
    if (await tryPort(port)) return port;
  }
  throw new Error(
    `No free port found in range ${PORT_MIN}–${PORT_MAX}. Close an existing chat-glass instance or free a port.`
  );
}
