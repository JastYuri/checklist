import express from "express";
import { protect, authorizeOwnResource } from "../middleware/authMiddleware.js";
import { generateJobReport } from "../controllers/reportController.js";

const router = express.Router();

router.get("/job/:id", generateJobReport);

export default router;