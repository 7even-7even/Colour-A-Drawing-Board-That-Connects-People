import http from 'http';
import { createApp } from './app.js';
import { attachSockets } from './sockets/index.js';
import { connectDB, closeDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function main() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);
  await attachSockets(server);

  server.listen(env.PORT, () => {
    logger.info('server listening', { port: env.PORT, env: env.NODE_ENV });
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info('shutting down', { signal });
    server.close(async () => {
      await closeDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((e) => {
  logger.error('fatal startup error', { msg: e.message, stack: e.stack });
  process.exit(1);
});
