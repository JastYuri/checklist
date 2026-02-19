import express from "express";
import { generateJobReport } from "../controllers/reportController.js";

const router = express.Router();

// GET /api/report/job/:id
router.get("/job/:id", generateJobReport);

export default router;