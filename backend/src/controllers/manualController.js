import Manual from '../models/Manual.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads/manuals');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `manual-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter: Only PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

const upload = multer({ storage, fileFilter });

// Middleware for upload
export const uploadManual = upload.single('manual');

// Get all manuals
export const getManuals = async (req, res) => {
  try {
    const manuals = await Manual.find().sort({ uploadedAt: -1 });
    res.json({ manuals: manuals.map(m => ({ id: m._id, url: `/uploads/manuals/${m.filename}`, name: m.originalName, uploadedAt: m.uploadedAt })) });
  } catch (error) {
    console.error('Get manuals error:', error);
    res.status(500).json({ message: 'Error fetching manuals', error: error.message });
  }
};

// Upload manual
export const uploadManualHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    // Save to DB
    const manual = new Manual({
      filename: req.file.filename,
      path: req.file.path,
      originalName: req.file.originalname,
    });
    await manual.save();

    res.status(201).json({ message: 'Manual uploaded successfully', manual: { id: manual._id, url: `/uploads/manuals/${manual.filename}`, name: manual.originalName, uploadedAt: manual.uploadedAt } });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading manual', error: error.message });
  }
};

// ✅ New: Delete manual
export const deleteManual = async (req, res) => {
  try {
    const { id } = req.params;
    const manual = await Manual.findById(id);
    if (!manual) {
      return res.status(404).json({ message: 'Manual not found.' });
    }

    // Delete file from disk
    if (fs.existsSync(manual.path)) {
      fs.unlinkSync(manual.path);
    }

    // Delete from DB
    await Manual.findByIdAndDelete(id);

    res.json({ message: 'Manual deleted successfully.' });
  } catch (error) {
    console.error('Delete manual error:', error);
    res.status(500).json({ message: 'Error deleting manual', error: error.message });
  }
};