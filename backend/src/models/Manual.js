import mongoose from 'mongoose';

const manualSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  path: { type: String, required: true },
  originalName: { type: String, required: true }, // Store original name for display
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Manual', manualSchema);