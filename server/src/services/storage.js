import { Readable } from 'stream';
import mongoose from 'mongoose';
import { getBucket } from '../config/db.js';

/**
 * StorageService interface — swap GridFsStorage for S3Storage in production
 * without touching routes. Methods:
 *   save({ buffer, filename, contentType, metadata }) -> { id }
 *   openDownloadStream(id) -> Readable
 *   stat(id) -> file doc | null
 */
export const GridFsStorage = {
  async save({ buffer, filename, contentType, metadata }) {
    const bucket = getBucket();
    return new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(filename, {
        contentType,
        metadata,
      });
      Readable.from(buffer)
        .pipe(uploadStream)
        .on('error', reject)
        .on('finish', () => resolve({ id: uploadStream.id }));
    });
  },

  openDownloadStream(id) {
    const bucket = getBucket();
    return bucket.openDownloadStream(new mongoose.Types.ObjectId(id));
  },

  async stat(id) {
    const bucket = getBucket();
    const files = await bucket
      .find({ _id: new mongoose.Types.ObjectId(id) })
      .toArray();
    return files[0] || null;
  },
};

export const storage = GridFsStorage;
