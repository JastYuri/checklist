// routes/jobRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { saveJob, getJobsByCategory, updateJob, deleteJob, getAllJobs, getJobById } from "../controllers/jobController.js";

const router = express.Router();

// ✅ New: Configure multer (reuse config for consistency)
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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

// ✅ Updated: Use upload.any() for dynamic field names (appearance-0, summary-0, etc.)
router.post("/category/:id", upload.any(), saveJob);

router.get("/category/:id", getJobsByCategory);

// ✅ Updated: Use upload.any() for dynamic field names
router.put("/:id", upload.any(), updateJob);

router.delete("/:id", deleteJob); // ✅ New delete route

// ✅ New routes
router.get("/", getAllJobs);       // list all jobs
router.get("/:id", getJobById);    // get single job by id

export default router;