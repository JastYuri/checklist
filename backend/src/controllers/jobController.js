// controllers/jobController.js
import Job from "../models/Job.js";
import Category from "../models/Category.js";
import mongoose from "mongoose"; // ✅ Add this line
import multer from "multer";
import path from "path";
import fs from "fs";

// ✅ Reuse uploadsDir from Category controller
const uploadsDir = path.join(process.cwd(), 'uploads');

// ✅ Reuse multer config for consistency
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '');
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and GIF files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ✅ Export upload for use in routes
export { upload };

// ✅ Updated: Add safety check to prevent errors if req.files is undefined or not an array
const findFile = (files, fieldname) => {
  if (!files || !Array.isArray(files)) return null;
  return files.find(file => file.fieldname === fieldname);
};
// ✅ Updated: saveJob to include special checklists with image handling
export const saveJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { jobInfo, checklist, appearanceMarks, defectSummary, technicalTests } = req.body;

    // ✅ New: Parse JSON strings from FormData (FormData sends everything as strings)
    const parsedJobInfo = jobInfo ? (typeof jobInfo === 'string' ? JSON.parse(jobInfo) : jobInfo) : {};
    const parsedChecklist = checklist ? (typeof checklist === 'string' ? JSON.parse(checklist) : checklist) : null;
    const parsedAppearanceMarks = appearanceMarks ? JSON.parse(appearanceMarks) : [];
    const parsedDefectSummary = defectSummary ? JSON.parse(defectSummary) : [];
    const parsedTechnicalTests = technicalTests ? JSON.parse(technicalTests) : {};

    const category = await Category.findById(id);
    if (!category) {
      console.warn("⚠️ Category not found:", id);
      return res.status(404).json({ message: "Category not found" });
    }

    // Build path of ancestors
    const path = [];
    let current = category;
    while (current?.parent) {
      path.unshift(current.parent);
      current = await Category.findById(current.parent);
    }

    // ✅ If checklist is provided in the payload (new flow), use it; else, build from category (old flow)
    let jobChecklist;
    if (parsedChecklist && Array.isArray(parsedChecklist)) {
      jobChecklist = parsedChecklist.map(section => ({
        _id: section._id,
        section: section.section,
        items: section.items.map(item => ({
          _id: item._id,
          name: item.name,
          type: item.type || "status", // ✅ Include type (default to "status")
          status: item.status || "na", // Use provided status or default
          remarks: item.remarks || "",   // Use provided remarks or default
          value: item.value || "", // ✅ Include value (default to empty string)
          parentItem: item.parentItem, // Preserve hierarchy
          code: item.code, // Preserve numbering
          image: item.image // ✅ NEW: Include image field
        }))
      }));
    } else {
      // Fallback: Copy category checklist (old behavior)
      jobChecklist = category.checklist.map(section => ({
        _id: section._id,
        section: section.section,
        items: section.items.map(item => ({
          _id: item._id,
          name: item.name,
          type: item.type || "status", // ✅ Include type (default to "status")
          status: "na", // Default status
          remarks: "",   // Default remarks
          value: item.value || "", // ✅ Include value (default to empty string)
          parentItem: item.parentItem, // Include for hierarchy
          code: item.code, // Include for numbering
          image: item.image // ✅ NEW: Include image field
        }))
      }));
    }

    // ✅ Process special checklists with image handling (updated keys)
    let processedAppearanceData = [];
    let processedSummaryData = [];
    let processedTechnicalData = parsedTechnicalTests; // ✅ Use parsed object directly

    // Handle appearanceMarks (marks with images)
    if (parsedAppearanceMarks && Array.isArray(parsedAppearanceMarks)) {
      processedAppearanceData = parsedAppearanceMarks.map((mark, idx) => {
        const file = findFile(req.files, `appearance-${idx}`);
        let imagePath = null;
        if (file) {
          imagePath = `/uploads/${file.filename}`;
        }
        return {
          side: mark.side || 'front',  // Default if missing
          type: mark.type || 'circle',  // ✅ Add: Default to 'circle' for existing data
          x: mark.x || 0,  // Default position
          y: mark.y || 0,
          radius: mark.radius || 0.05,  // ✅ Add: Default radius
          defectName: mark.defectName || "",
          remarks: mark.remarks || "",
          path: mark.path || [],  // ✅ Add: Default empty array for paths
          image: imagePath
        };
      });
    }

    // Handle defectSummary (defects with images)
    if (parsedDefectSummary && Array.isArray(parsedDefectSummary)) {
      processedSummaryData = parsedDefectSummary.map((defect, idx) => {
        const file = findFile(req.files, `summary-${idx}`); // ✅ Use helper to find file
        let imagePath = null;
        if (file) {
          imagePath = `/uploads/${file.filename}`;
        }
        return {
          no: defect.no,
          defectCode: defect.defectCode || "",
          defectEncountered: defect.defectEncountered || "",
          status: defect.status || "open",
          recurrence: defect.recurrence || 0,
          image: imagePath
        };
      });
    }

    // ✅ REMOVED: The misplaced block that tried to access 'job' before initialization
    // (It was: if (appearanceMarks) { ... job.appearanceMarks = processedAppearance; })

    const job = await Job.create({
      category: id,
      categoryPath: path,
      jobInfo: parsedJobInfo, // ✅ Use parsed jobInfo
      checklist: jobChecklist,
      // ✅ New: Copy appearanceImages from category
      appearanceImages: category.appearanceImages || { front: null, rear: null, left: null, right: null },
      appearanceMarks: processedAppearanceData, // ✅ Save processed special checklists
      defectSummary: processedSummaryData,
      technicalTests: processedTechnicalData // ✅ Use parsed object
    });

    res.status(201).json(job);
  } catch (error) {
    console.error("❌ Error in saveJob:", error);
    res.status(500).json({ message: error.message });
  }
};
// Get jobs for a category
export const getJobsByCategory = async (req, res) => {
  try {
    const { id } = req.params;
 

    const jobs = await Job.find({ category: id })
      .populate("category categoryPath")
      .lean();

    
    res.json(jobs);
  } catch (error) {
    console.error("❌ Error in getJobsByCategory:", error);
    res.status(500).json({ message: error.message });
  }
};

export const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    // ✅ Fixed: Match frontend payload keys (now sent as FormData strings, so parse them)
    const { jobInfo, checklist, appearanceMarks, defectSummary, technicalTests } = req.body;

   

    // ✅ New: Debug req.files
    console.log("🔍 req.files:", req.files);

    // ✅ New: Validate if ID is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid job ID. Use saveJob for new jobs." });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found. Use saveJob to create a new job." });
    }

    // Merge jobInfo if provided (parse if string)
    if (jobInfo) {
      const parsedJobInfo = typeof jobInfo === 'string' ? JSON.parse(jobInfo) : jobInfo;
      job.jobInfo = { ...job.jobInfo, ...parsedJobInfo };
    }

    // Merge checklist updates by item _id
    if (checklist) {
      const parsedChecklist = typeof checklist === 'string' ? JSON.parse(checklist) : checklist;
      parsedChecklist.forEach((updatedSection) => {
        const section = job.checklist.id(updatedSection._id);
        if (section) {
          if (updatedSection.section) {
            section.section = updatedSection.section;
          }

          updatedSection.items?.forEach((updatedItem) => {
            const item = section.items.id(updatedItem._id);
            if (item) {
              if (updatedItem.status) item.status = updatedItem.status;
              if (updatedItem.remarks !== undefined) item.remarks = updatedItem.remarks; // ✅ Fixed: Properly check for undefined
              if (updatedItem.value !== undefined) item.value = updatedItem.value; // ✅ Handle value updates for input items
              if (updatedItem.name) item.name = updatedItem.name;
              if (updatedItem.image !== undefined) item.image = updatedItem.image; // ✅ NEW: Handle image updates
              // Note: parentItem and code are not updated here, as they should remain from the category
            }
          });
        }
      });
    }

    // ✅ Updated: Use findFile for consistency
if (appearanceMarks) {
  const parsedAppearance = typeof appearanceMarks === 'string' ? JSON.parse(appearanceMarks) : appearanceMarks;
  const processedAppearance = parsedAppearance.map((mark, idx) => {
    let imagePath = mark.image; // Keep existing if no new upload
    const file = findFile(req.files, `appearance-${idx}`);
    if (file) {
      // ✅ Updated: Check if mark.image is a string before deleting old image
      if (mark.image && typeof mark.image === 'string') {
        const oldPath = path.join(uploadsDir, path.basename(mark.image));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      imagePath = `/uploads/${file.filename}`;
    }
    return {
      side: mark.side || 'front',
      type: mark.type || 'circle',
      x: mark.x || 0,
      y: mark.y || 0,
      radius: mark.radius || 0.05,
      defectName: mark.defectName || "",
      remarks: mark.remarks || "",
      path: mark.path || [],
      image: imagePath
    };
  });
  job.appearanceMarks = processedAppearance;
}

    
    // ✅ Updated: Use findFile for consistency
    if (defectSummary) {
      const parsedSummary = typeof defectSummary === 'string' ? JSON.parse(defectSummary) : defectSummary;
      const processedSummary = parsedSummary.map((defect, idx) => {
        let imagePath = defect.image; // Keep existing if no new upload
        const file = findFile(req.files, `summary-${idx}`);
        if (file) {
          // ✅ Updated: Check if defect.image is a string before deleting old image
          if (defect.image && typeof defect.image === 'string') {
            const oldPath = path.join(uploadsDir, path.basename(defect.image));
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          }
          imagePath = `/uploads/${file.filename}`;
        }
        return {
          no: defect.no,
          defectCode: defect.defectCode || "",
          defectEncountered: defect.defectEncountered || "",
          status: defect.status || "open",
          recurrence: defect.recurrence || 0,
          image: imagePath
        };
      });
      job.defectSummary = processedSummary;
    }

    if (technicalTests) {
      const parsedTechnical = typeof technicalTests === 'string' ? JSON.parse(technicalTests) : technicalTests;
      job.technicalTests = parsedTechnical;
    }

    const updatedJob = await job.save();
    await updatedJob.populate("category categoryPath");

    console.log("✅ Job updated:", updatedJob._id);
    res.json(updatedJob);
  } catch (error) {
    console.error("❌ Error in updateJob:", error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ Delete job (with image cleanup)
export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("📥 deleteJob called with job id:", id);

    const job = await Job.findById(id);
    if (!job) {
      console.warn("⚠️ Job not found:", id);
      return res.status(404).json({ message: "Job not found" });
    }

    // ✅ Cleanup images from appearance marks and defect summaries
    job.appearanceMarks?.forEach(mark => {
      if (mark.image) {
        const filePath = path.join(uploadsDir, path.basename(mark.image));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    });
    job.defectSummary?.forEach(defect => {
      if (defect.image) {
        const filePath = path.join(uploadsDir, path.basename(defect.image));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    });

    await Job.findByIdAndDelete(id);
    console.log("✅ Job deleted:", job._id);
    res.json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error("❌ Error in deleteJob:", error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get all jobs
export const getAllJobs = async (req, res) => {
  try {
    console.log("📥 getAllJobs called");
    const jobs = await Job.find()
      .populate("category categoryPath")
      .sort({ "jobInfo.date": -1 })
      .lean();
    console.log("✅ Jobs found:", jobs.length);
    res.json(jobs);
  } catch (error) {
    console.error("❌ Error in getAllJobs:", error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get single job by id
export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("📥 getJobById called with job id:", id);

    const job = await Job.findById(id).populate("category categoryPath").lean();
    if (!job) {
      console.warn("⚠️ Job not found:", id);
      return res.status(404).json({ message: "Job not found" });
    }

    console.log("✅ Job found:", job._id);
    res.json(job);
  } catch (error) {
    console.error("❌ Error in getJobById:", error);
    res.status(500).json({ message: error.message });
  }
};