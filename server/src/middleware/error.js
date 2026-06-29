import { logger } from '../utils/logger.js';
import { isProd } from '../config/env.js';

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// Express error handler (must have 4 args)
export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  logger.error('request_error', { msg: err.message, path: req.path, status });
  res.status(status).json({
    error: isProd && status === 500 ? 'Internal Server Error' : err.message,
  });
}
