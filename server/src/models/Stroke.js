import mongoose from 'mongoose';

const strokeSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    seq: { type: Number, required: true },
    clientStrokeId: { type: String, required: true },
    authorId: { type: String, required: true },
    type: {
      type: String,
      enum: ['path', 'rect', 'ellipse', 'text', 'image', 'clear', 'erase'],
      required: true,
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

strokeSchema.index({ roomId: 1, seq: 1 });
strokeSchema.index({ roomId: 1, clientStrokeId: 1 }, { unique: true });

export const Stroke = mongoose.model('Stroke', strokeSchema);
