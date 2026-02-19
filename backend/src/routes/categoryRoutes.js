// routes/categoryRoutes.js
import express from "express";
import multer from "multer"; // ✅ New: Import multer for file uploads
import path from "path"; // ✅ New: For file paths (if needed for config)
import fs from "fs"; // ✅ New: For filesystem operations (if needed for config)
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
  updateAppearanceImages, // ✅ New: Import the new function
} from "../controllers/categoryController.js";

const router = express.Router();

// ✅ New: Configure multer (reuse the same config as in Category controller for consistency)
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
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ✅ New: Multer config for appearance images (fields for each side)
const uploadAppearance = upload.fields([
  { name: 'front', maxCount: 1 },
  { name: 'rear', maxCount: 1 },
  { name: 'left', maxCount: 1 },
  { name: 'right', maxCount: 1 }
]);

router.post("/", createCategory);
router.get("/", getCategories);
router.delete("/:id", deleteCategory);
router.get("/:id", getCategoryById);

// Bulk replace checklist
router.put("/:id/checklist", updateChecklist);

// Add a new section
router.post("/:id/checklist/section", addChecklistSection);

// ✅ Updated: Add checklist item with image upload
router.post('/:id/checklist/:sectionId/item', upload.fields([
  { name: 'name' }, // Note: These are text fields, but multer.fields can handle mixed types
  { name: 'type' },
  { name: 'parentItem' },
  { name: 'image', maxCount: 1 }
]), addChecklistItem);

// ✅ Updated: Update checklist item with image upload
router.put('/:id/checklist/:sectionId/item/:itemId', upload.fields([
  { name: 'name' },
  { name: 'type' },
  { name: 'image', maxCount: 1 }
]), updateChecklistItem);

// Delete a section
router.delete("/:id/checklist/:sectionId", deleteChecklistSection);

// Delete an item
router.delete("/:id/checklist/:sectionId/item/:itemId", deleteChecklistItem);

// ✅ New: Route for updating appearance images
router.put("/:id/appearance-images", uploadAppearance, updateAppearanceImages);

export default router;