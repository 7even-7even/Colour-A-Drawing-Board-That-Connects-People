import dotenv from 'dotenv';
dotenv.config();

function required(key, fallback) {
  const v = process.env[key] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return v;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  MONGO_URI: required('MONGO_URI', 'mongodb://localhost:27017/collabboard'),
  REDIS_URL: process.env.REDIS_URL || '', // empty => single-node mode
  JWT_SECRET: required('JWT_SECRET', 'dev-insecure-secret-change-me'),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  MAX_FILE_MB: parseInt(process.env.MAX_FILE_MB || '15', 10),
};

export const isProd = env.NODE_ENV === 'production';
