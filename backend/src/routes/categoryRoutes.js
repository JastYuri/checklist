import express from "express";
import { upload, uploadAppearance } from "../config/cloudinary.js";

import {
  createCategory,
  getCategories,
  deleteCategory,
  getCategoryById,
  updateChecklist,
  updateChecklistItem,
  addChecklistItem,
  addChecklistSection,
  deleteChecklistSection,
  deleteChecklistItem,
  updateAppearanceImages,
} from "../controllers/categoryController.js";

const router = express.Router();

// Single image upload
router.post('/:id/checklist/:sectionId/item', upload.single('image'), addChecklistItem);
router.put('/:id/checklist/:sectionId/item/:itemId', upload.single('image'), updateChecklistItem);

// ✅ FIXED: Use uploadAppearance for multiple fields
router.put("/:id/appearance-images", uploadAppearance.fields([
  { name: 'front', maxCount: 1 },
  { name: 'rear', maxCount: 1 },
  { name: 'left', maxCount: 1 },
  { name: 'right', maxCount: 1 }
]), updateAppearanceImages);

// Other routes
router.post("/", createCategory);
router.get("/", getCategories);
router.delete("/:id", deleteCategory);
router.get("/:id", getCategoryById);
router.put("/:id/checklist", updateChecklist);
router.post("/:id/checklist/section", addChecklistSection);
router.delete("/:id/checklist/:sectionId", deleteChecklistSection);
router.delete("/:id/checklist/:sectionId/item/:itemId", deleteChecklistItem);

export default router;