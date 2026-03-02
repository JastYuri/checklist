// controllers/jobController.js
import Job from "../models/Job.js";
import Category from "../models/Category.js";
import mongoose from "mongoose";
import { cloudinary } from "../config/cloudinary.js";

// ✅ Universal file finder
const findFile = (req, fieldname) => {
  if (req.file && req.file.fieldname === fieldname) {
    return req.file;
  }
  if (req.files && Array.isArray(req.files)) {
    return req.files.find(f => f.fieldname === fieldname);
  }
  return null;
};

// ✅ NEW: Helper to upload Base64 images to Cloudinary
const uploadBase64Image = async (base64String) => {
  if (!base64String || typeof base64String !== 'string') return null;
  
  try {
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64String, {
      resource_type: 'image',
      folder: 'job_reports/appearance_marks', // Organize in Cloudinary
    });
    return result.secure_url;
  } catch (error) {
    console.error("❌ Error uploading base64 image to Cloudinary:", error);
    return null;
  }
};

// ✅ Helper function to delete old image from Cloudinary
const deleteOldCloudinaryImage = async (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') return;
  try {
    // Check if it's a cloudinary URL
    if (imageUrl.includes('cloudinary.com')) {
      const publicId = imageUrl.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (cloudErr) {
    console.error("Error deleting from Cloudinary:", cloudErr);
  }
};

// ✅ Updated: saveJob
export const saveJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { jobInfo, checklist, appearanceMarks, appearanceMarkImages, defectSummary, technicalTests } = req.body;

    const parsedJobInfo = jobInfo ? (typeof jobInfo === 'string' ? JSON.parse(jobInfo) : jobInfo) : {};
    const parsedChecklist = checklist ? (typeof checklist === 'string' ? JSON.parse(checklist) : checklist) : null;
    const parsedAppearanceMarks = appearanceMarks ? JSON.parse(appearanceMarks) : [];
    const parsedDefectSummary = defectSummary ? JSON.parse(defectSummary) : [];
    const parsedTechnicalTests = technicalTests ? JSON.parse(technicalTests) : {};
    
    // 🔽 NEW: Parse appearanceMarkImages
    let parsedAppearanceMarkImages = {};
    if (appearanceMarkImages) {
      parsedAppearanceMarkImages = typeof appearanceMarkImages === 'string' 
        ? JSON.parse(appearanceMarkImages) 
        : appearanceMarkImages;
    }

    const category = await Category.findById(id);
    if (!category) {
      console.warn("⚠️ Category not found:", id);
      return res.status(404).json({ message: "Category not found" });
    }

    // Build path of ancestors
    const categoryPath = [];
    let current = category;
    while (current?.parent) {
      categoryPath.unshift(current.parent);
      current = await Category.findById(current.parent);
    }

    // Build job checklist
    let jobChecklist;
    if (parsedChecklist && Array.isArray(parsedChecklist)) {
      jobChecklist = parsedChecklist.map(section => ({
        _id: section._id,
        section: section.section,
        items: section.items.map(item => ({
          _id: item._id,
          name: item.name,
          type: item.type || "status",
          status: item.status || "na",
          remarks: item.remarks || "",
          value: item.value || "",
          parentItem: item.parentItem,
          code: item.code,
          image: item.image
        }))
      }));
    } else {
      jobChecklist = category.checklist.map(section => ({
        _id: section._id,
        section: section.section,
        items: section.items.map(item => ({
          _id: item._id,
          name: item.name,
          type: item.type || "status",
          status: "na",
          remarks: "",
          value: item.value || "",
          parentItem: item.parentItem,
          code: item.code,
          image: item.image
        }))
      }));
    }

    // Process appearance marks with Cloudinary URLs
    let processedAppearanceData = [];
    if (parsedAppearanceMarks && Array.isArray(parsedAppearanceMarks)) {
      processedAppearanceData = parsedAppearanceMarks.map((mark, idx) => {
        const file = findFile(req, `appearance-${idx}`);
        let imagePath = null;
        if (file) {
          imagePath = file.path;
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
    }

    // 🔽 NEW: Upload screenshots to Cloudinary
    let processedAppearanceMarkImages = {};
    if (parsedAppearanceMarkImages && Object.keys(parsedAppearanceMarkImages).length > 0) {
      for (const [side, base64Data] of Object.entries(parsedAppearanceMarkImages)) {
        if (base64Data) {
          const url = await uploadBase64Image(base64Data);
          if (url) {
            processedAppearanceMarkImages[side] = url;
          }
        }
      }
    }

    // Process defect summary with Cloudinary URLs
    let processedSummaryData = [];
    if (parsedDefectSummary && Array.isArray(parsedDefectSummary)) {
      processedSummaryData = parsedDefectSummary.map((defect, idx) => {
        const file = findFile(req, `summary-${idx}`);
        let imagePath = null;
        if (file) {
          imagePath = file.path;
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

    const job = await Job.create({
      category: id,
      categoryPath: categoryPath,
      jobInfo: parsedJobInfo,
      checklist: jobChecklist,
      appearanceImages: category.appearanceImages || { front: null, rear: null, left: null, right: null },
      appearanceMarks: processedAppearanceData,
      appearanceMarkImages: processedAppearanceMarkImages, // 🔽 NEW FIELD
      defectSummary: processedSummaryData,
      technicalTests: parsedTechnicalTests
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

// ✅ Updated: updateJob
export const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { jobInfo, checklist, appearanceMarks, appearanceMarkImages, defectSummary, technicalTests } = req.body;

    console.log("🔍 req.files:", req.files);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid job ID. Use saveJob for new jobs." });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found. Use saveJob to create a new job." });
    }

    // Merge jobInfo if provided
    if (jobInfo) {
      const parsedJobInfo = typeof jobInfo === 'string' ? JSON.parse(jobInfo) : jobInfo;
      job.jobInfo = { ...job.jobInfo, ...parsedJobInfo };
    }

    // Merge checklist updates
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
              if (updatedItem.remarks) item.remarks = updatedItem.remarks;
              if (updatedItem.value !== undefined) item.value = updatedItem.value;
              if (updatedItem.name) item.name = updatedItem.name;
              if (updatedItem.image !== undefined) item.image = updatedItem.image;
            }
          });
        }
      });
    }

    // ✅ Process appearance marks with Cloudinary
    if (appearanceMarks) {
      const parsedAppearance = typeof appearanceMarks === 'string' ? JSON.parse(appearanceMarks) : appearanceMarks;
      
      const processedAppearance = await Promise.all(parsedAppearance.map(async (mark, idx) => {
        let imagePath = mark.image;
        const file = findFile(req, `appearance-${idx}`);
        if (file) {
          if (mark.image && typeof mark.image === 'string') {
            await deleteOldCloudinaryImage(mark.image);
          }
          imagePath = file.path;
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
      }));
      job.appearanceMarks = processedAppearance;
    }

    // 🔽 NEW: Process appearanceMarkImages (Screenshots)
    if (appearanceMarkImages) {
      const parsedImages = typeof appearanceMarkImages === 'string' ? JSON.parse(appearanceMarkImages) : appearanceMarkImages;
      
      const newImagesMap = {};
      
      for (const [side, base64Data] of Object.entries(parsedImages)) {
        // Only upload if it's a new base64 string (not a URL)
        if (base64Data && base64Data.startsWith('data:')) {
          // Delete old screenshot if exists
          if (job.appearanceMarkImages && job.appearanceMarkImages[side]) {
            await deleteOldCloudinaryImage(job.appearanceMarkImages[side]);
          }
          
          const url = await uploadBase64Image(base64Data);
          if (url) {
            newImagesMap[side] = url;
          }
        } else if (base64Data) {
          // If it's just a URL string (unchanged), keep it
          newImagesMap[side] = base64Data;
        }
      }

      job.appearanceMarkImages = newImagesMap;
    }

    // ✅ Process defect summary with Cloudinary
    if (defectSummary) {
      const parsedSummary = typeof defectSummary === 'string' ? JSON.parse(defectSummary) : defectSummary;
      
      const processedSummary = await Promise.all(parsedSummary.map(async (defect, idx) => {
        let imagePath = defect.image;
        const file = findFile(req, `summary-${idx}`);
        if (file) {
          if (defect.image && typeof defect.image === 'string') {
            await deleteOldCloudinaryImage(defect.image);
          }
          imagePath = file.path;
        }
        return {
          no: defect.no,
          defectCode: defect.defectCode || "",
          defectEncountered: defect.defectEncountered || "",
          status: defect.status || "open",
          recurrence: defect.recurrence || 0,
          image: imagePath
        };
      }));
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


// ✅ Updated: deleteJob - Now deletes from Cloudinary including appearanceMarkImages
export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("📥 deleteJob called with job id:", id);

    const job = await Job.findById(id);
    if (!job) {
      console.warn("⚠️ Job not found:", id);
      return res.status(404).json({ message: "Job not found" });
    }

    // ✅ Helper function to delete from Cloudinary
    const deleteFromCloudinary = async (imageUrl) => {
      if (!imageUrl || typeof imageUrl !== 'string') return;
      try {
        // Check if it's a valid Cloudinary URL
        if (imageUrl.includes('cloudinary.com')) {
          const publicId = imageUrl.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (cloudErr) {
        console.error("Error deleting from Cloudinary:", cloudErr);
      }
    };

    // ✅ Delete appearance marks images from Cloudinary
    if (job.appearanceMarks?.length > 0) {
      await Promise.all(job.appearanceMarks.map(mark => deleteFromCloudinary(mark.image)));
    }

    // 🔽 NEW: Delete appearanceMarkImages (Screenshots) from Cloudinary
    if (job.appearanceMarkImages) {
      const sides = ['front', 'rear', 'left', 'right'];
      for (const side of sides) {
        if (job.appearanceMarkImages[side]) {
          await deleteFromCloudinary(job.appearanceMarkImages[side]);
        }
      }
    }

    // ✅ Delete defect summary images from Cloudinary
    if (job.defectSummary?.length > 0) {
      await Promise.all(job.defectSummary.map(defect => deleteFromCloudinary(defect.image)));
    }

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