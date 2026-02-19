import express from "express";
import { createChecklist, getChecklists, deleteChecklist } from "../controllers/checklistController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createChecklist);
router.get("/", protect, getChecklists);
router.delete("/:id", protect, deleteChecklist);

export default router;