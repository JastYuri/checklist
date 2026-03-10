import express from "express";
import settingsController from "../controllers/settingsController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get settings (public - needed for app initialization)
router.get("/", settingsController.getSettings);

// Update settings (admin only)
router.put("/", protect, authorize("admin"), settingsController.updateSettings);

// Reset settings to defaults (admin only)
router.post("/reset", protect, authorize("admin"), settingsController.resetSettings);

export default router;
