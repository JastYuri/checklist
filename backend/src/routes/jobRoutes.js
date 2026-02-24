import express from "express";
import upload from "../config/cloudinary.js"; // ✅ Just import this!

import { 
  saveJob, 
  getJobsByCategory, 
  updateJob, 
  deleteJob, 
  getAllJobs, 
  getJobById 
} from "../controllers/jobController.js";

const router = express.Router();

// ✅ Just use upload.any() or upload.array() as needed
router.post("/category/:id", upload.any(), saveJob);
router.put("/:id", upload.any(), updateJob);

router.get("/category/:id", getJobsByCategory);
router.delete("/:id", deleteJob);
router.get("/", getAllJobs);
router.get("/:id", getJobById);

export default router;