import mongoose from "mongoose";

const checklistSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true }
}, { timestamps: true });

export default mongoose.model("Checklist", checklistSchema);