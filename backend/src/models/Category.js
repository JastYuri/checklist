// models/Category.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const ItemSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["status", "input"], default: "status" }, // ✅ "status" or "input"
    status: {
      type: String,
      enum: ["good", "noGood", "corrected", "na"],
      default: "na",
    },
    remarks: { type: String, default: "" },
    value: { type: String, default: "" }, // ✅ For input-type items (e.g., serial numbers)
    parentItem: { type: Schema.Types.ObjectId, ref: "Item", default: null },
    code: { type: String, default: "" },
    image: { type: String, default: null }, // ✅ New: Path to locally stored image (e.g., "/uploads/filename.jpg")
  },
  { _id: true }
);

// Section subdocument schema (unchanged)
const SectionSchema = new Schema(
  {
    section: { type: String, required: true },
    order: { type: Number, required: true }, // ✅ explicit order number
    items: [ItemSchema],
  },
  { _id: true } // ✅ each section gets its own _id
);

// Category schema (updated)
const categorySchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    parent: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    checklist: [SectionSchema], // ✅ embedded sections with items
    // ✅ New: Appearance images for front, rear, left, right sides
    appearanceImages: {
      front: { type: String, default: null }, // Path to uploaded image (e.g., "/uploads/front.jpg")
      rear: { type: String, default: null },
      left: { type: String, default: null },
      right: { type: String, default: null },
    },
  },
  { timestamps: true }
);

// ✅ Unique only within the same parent
categorySchema.index({ parent: 1, name: 1 }, { unique: true });

export default mongoose.model("Category", categorySchema);