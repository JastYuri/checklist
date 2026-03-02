// models/Job.js
import mongoose from "mongoose";

const { Schema } = mongoose;

// Item subdocument schema
const ItemSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["status", "input"], default: "status" }, 
  status: { type: String, enum: ["good", "noGood", "corrected", "na"], default: "na" },
  remarks: { type: String, default: "" },
  value: { type: String, default: "" }, 
  parentItem: { type: Schema.Types.ObjectId, ref: "Item", default: null },
  code: { type: String, default: "" },
  image: { type: String, default: null }, 
}, { _id: true });

const SectionSchema = new Schema({
  section: { type: String, required: true },
  items: [ItemSchema]
}, { _id: true });

const AppearanceMarkSchema = new Schema({
  side: { type: String, enum: ["front", "rear", "left", "right"], required: true },
  type: { type: String, enum: ["circle", "path"], default: "circle" }, // Added type for circle vs freehand
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  radius: { type: Number, default: 0.05 }, // Added radius for circles
  path: { type: Array, default: [] }, // Added path for freehand drawings
  defectName: { type: String, default: "" }, 
  remarks: { type: String, default: "" },
  image: { type: String, default: null }, 
}, { _id: true });

const DefectSummarySchema = new Schema({
  no: { type: Number, required: true },
  defectCode: { type: String, default: "" }, 
  defectEncountered: { type: String, default: "" },
  status: { type: String, enum: ["good", "noGood", "corrected", "na"], default: "na" }, 
  image: { type: String, default: null }, 
  recurrence: { type: Number, default: 0 },
}, { _id: true });

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
}, { _id: false }); 

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
  
  // ✅ Base images for drawing
  appearanceImages: {
    front: { type: String, default: null },
    rear: { type: String, default: null },
    left: { type: String, default: null },
    right: { type: String, default: null },
  },

  // ✅ NEW: Screenshots (Images with drawings)
  appearanceMarkImages: {
    front: { type: String, default: null },
    rear: { type: String, default: null },
    left: { type: String, default: null },
    right: { type: String, default: null },
  },

  appearanceMarks: [AppearanceMarkSchema], 
  defectSummary: [DefectSummarySchema], 
  technicalTests: TechnicalTestsSchema 
}, { timestamps: true });

export default mongoose.model("Job", JobSchema);