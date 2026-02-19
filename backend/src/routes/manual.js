import express from 'express';
import { getManuals, uploadManual, uploadManualHandler, deleteManual } from '../controllers/manualController.js';

const router = express.Router();

// Routes
router.get('/', getManuals); // GET /api/manual
router.post('/upload', uploadManual, uploadManualHandler); // POST /api/manual/upload
router.delete('/:id', deleteManual); // ✅ New: DELETE /api/manual/:id

export default router;