import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: 'Untitled Board' },
    createdBy: { type: String, required: true },
    isLocked: { type: Boolean, default: false },
    seq: { type: Number, default: 0 }, // monotonic stroke counter
    lastActivityAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export const Room = mongoose.model('Room', roomSchema);
