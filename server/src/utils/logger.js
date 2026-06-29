// Tiny structured logger. Swap for pino/winston in real prod.
function log(level, msg, meta = {}) {
  const entry = { t: new Date().toISOString(), level, msg, ...meta };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else console.log(line);
}

export const logger = {
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
};
