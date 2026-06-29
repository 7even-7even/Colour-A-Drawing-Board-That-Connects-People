import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let bucket = null;

export async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 50,
  });
  bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'files' });
  logger.info('MongoDB connected');
  return mongoose.connection;
}

export function getBucket() {
  if (!bucket) throw new Error('GridFS bucket not initialized');
  return bucket;
}

export async function closeDB() {
  await mongoose.connection.close();
}
