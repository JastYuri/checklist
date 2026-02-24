import express from "express";
import upload from "../config/cloudinary.js"; // ✅ Just import this!

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

// ✅ Remove all the Cloudinary config stuff - you don't need it anymore!

// Upload for checklist item images
router.post('/:id/checklist/:sectionId/item', upload.single('image'), addChecklistItem);

// Upload for checklist item updates
router.put('/:id/checklist/:sectionId/item/:itemId', upload.single('image'), updateChecklistItem);

// Upload for appearance images (multiple fields)
router.put("/:id/appearance-images", upload.fields([
  { name: 'front', maxCount: 1 },
  { name: 'rear', maxCount: 1 },
  { name: 'left', maxCount: 1 },
  { name: 'right', maxCount: 1 }
]), updateAppearanceImages);

// Other routes (no upload)
router.post("/", createCategory);
router.get("/", getCategories);
router.delete("/:id", deleteCategory);
router.get("/:id", getCategoryById);
router.put("/:id/checklist", updateChecklist);
router.post("/:id/checklist/section", addChecklistSection);
router.delete("/:id/checklist/:sectionId", deleteChecklistSection);
router.delete("/:id/checklist/:sectionId/item/:itemId", deleteChecklistItem);

export default router;