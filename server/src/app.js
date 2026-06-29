import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { corsOptions } from './config/cors.js';
import health from './routes/health.js';
import rooms from './routes/rooms.js';
import files from './routes/files.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions)); // handle preflight for all routes
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', health);
  app.use('/api', rooms);
  app.use('/api', files);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
