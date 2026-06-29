import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    text: { type: String, default: '' },
    kind: { type: String, enum: ['text', 'system', 'file'], default: 'text' },
    fileId: { type: mongoose.Schema.Types.ObjectId, default: null },
    originalName: { type: String, default: null },
    contentType: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

messageSchema.index({ roomId: 1, createdAt: 1 });

export const Message = mongoose.model('Message', messageSchema);
