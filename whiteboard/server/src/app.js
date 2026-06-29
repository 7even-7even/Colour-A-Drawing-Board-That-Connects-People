import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import health from './routes/health.js';
import rooms from './routes/rooms.js';
import files from './routes/files.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN === '*' ? true : env.CLIENT_ORIGIN.split(','),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', health);
  app.use('/api', rooms);
  app.use('/api', files);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
