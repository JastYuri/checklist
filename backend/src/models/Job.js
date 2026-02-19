// models/Job.js
import mongoose from "mongoose";

const { Schema } = mongoose;

// Item subdocument schema (added type, value, and image for consistency)
const ItemSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["status", "input"], default: "status" }, // ✅ "status" or "input"
  status: { type: String, enum: ["good", "noGood", "corrected", "na"], default: "na" },
  remarks: { type: String, default: "" },
  value: { type: String, default: "" }, // ✅ For input-type items (e.g., serial numbers)
  parentItem: { type: Schema.Types.ObjectId, ref: "Item", default: null },
  code: { type: String, default: "" },
  image: { type: String, default: null }, // ✅ New: Path to locally stored image (e.g., "/uploads/filename.jpg")
}, { _id: true });

const SectionSchema = new Schema({
  section: { type: String, required: true },
  items: [ItemSchema]
}, { _id: true });

// ✅ New subdocument schemas for special checklists
const AppearanceMarkSchema = new Schema({
  side: { type: String, enum: ["front", "rear", "left", "right"], required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  defectName: { type: String, default: "" }, // e.g., "C", "SC", "D"
  remarks: { type: String, default: "" },
  image: { type: String, default: null }, // ✅ New: Path to uploaded image for marked defects
}, { _id: true });

const DefectSummarySchema = new Schema({
  no: { type: Number, required: true },
  defectCode: { type: String, default: "" }, // e.g., "🔧"
  defectEncountered: { type: String, default: "" },
  status: { type: String, enum: ["good", "noGood", "corrected", "na"], default: "na" }, // ✅ Updated to match frontend
  image: { type: String, default: null }, // Path to uploaded image
  recurrence: { type: Number, default: 0 },
}, { _id: true });

// ✅ Updated: Technical tests as a nested object schema to match frontend
const TechnicalTestsSchema = new Schema({
  breakingForce: {
    max: {
      front: { left: String, right: String, sum: String, difference: String },
      rear: { left: String, right: String, sum: String, difference: String }
    },
    min: {
      front: { left: String, right: String, sum: String, difference: String },
      rear: { left: String, right: String, sum: String, difference: String }
    }
  },
  speedTesting: { speedometer: String, tester: String },
  turningRadius: {
    inner: { left: String, right: String },
    outer: { left: String, right: String }
  },
  slipTester: [{ speed: String, value: String }],
  headlightTester: {
    lowBeam: {
      before: { left: String, right: String },
      after: { left: String, right: String }
    },
    highBeam: {
      before: { left: String, right: String },
      after: { left: String, right: String }
    }
  },
  absTesting: [{ option: String, remarks: String }]
}, { _id: false }); // No _id for nested object

// ✅ New: Add appearanceImages field to Job schema (copied from Category)
const JobSchema = new Schema({
  category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
  categoryPath: [{ type: Schema.Types.ObjectId, ref: "Category" }],
  jobInfo: {
    customer: String,
    model: String,
    bodyType: String,
    chassisNum: String,
    engineNum: String,
    date: Date,
    joNo: String,
    csNo: String,
    keyNumber: String,
    jobType: { type: String, enum: ["standard", "modified"] }
  },
  checklist: [SectionSchema],
  // ✅ New: Appearance images copied from category (for base vehicle images)
  appearanceImages: {
    front: { type: String, default: null },
    rear: { type: String, default: null },
    left: { type: String, default: null },
    right: { type: String, default: null },
  },
  // ✅ Existing: Special checklists
  appearanceMarks: [AppearanceMarkSchema], // Array of marked defects
  defectSummary: [DefectSummarySchema], // Array of defects
  technicalTests: TechnicalTestsSchema // ✅ Updated: Nested object for technical data
}, { timestamps: true });

export default mongoose.model("Job", JobSchema);
