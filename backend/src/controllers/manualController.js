import Manual from '../models/Manual.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cloudinary from "../config/cloudinary.js"; // ✅ Import Cloudinary

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ REMOVED: Local upload directory config

// Multer memory storage (upload to memory first, then send to Cloudinary)
const storage = multer.memoryStorage();

// File filter: Only PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit for PDFs
});

// Middleware for upload
export const uploadManual = upload.single('manual');

// Get all manuals
export const getManuals = async (req, res) => {
  try {
    const manuals = await Manual.find().sort({ uploadedAt: -1 });
    // ✅ Return Cloudinary URLs directly
    res.json({ 
      manuals: manuals.map(m => ({ 
        id: m._id, 
        url: m.cloudinaryUrl || m.url, // Use Cloudinary URL if available, fallback to old URL
        name: m.originalName, 
        uploadedAt: m.uploadedAt 
      })) 
    });
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

    // ✅ Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'manuals',
          resource_type: 'raw', // Use 'raw' for PDFs
          public_id: `manual-${Date.now()}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      // Convert buffer to stream and pipe to Cloudinary
      const stream = require('stream');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(req.file.buffer);
      bufferStream.pipe(uploadStream);
    });

    // Save to DB with Cloudinary URL
    const manual = new Manual({
      filename: uploadResult.public_id,
      path: uploadResult.secure_url, // ✅ Store Cloudinary URL
      originalName: req.file.originalname,
      cloudinaryUrl: uploadResult.secure_url, // ✅ Add dedicated Cloudinary URL field
      cloudinaryPublicId: uploadResult.public_id, // ✅ Store public_id for deletion
    });
    await manual.save();

    res.status(201).json({ 
      message: 'Manual uploaded successfully', 
      manual: { 
        id: manual._id, 
        url: manual.cloudinaryUrl, 
        name: manual.originalName, 
        uploadedAt: manual.uploadedAt 
      } 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading manual', error: error.message });
  }
};

// ✅ Updated: Delete manual (Cloudinary)
export const deleteManual = async (req, res) => {
  try {
    const { id } = req.params;
    const manual = await Manual.findById(id);
    if (!manual) {
      return res.status(404).json({ message: 'Manual not found.' });
    }

    // ✅ Delete from Cloudinary using public_id
    if (manual.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(manual.cloudinaryPublicId, { resource_type: 'raw' });
      } catch (cloudErr) {
        console.error("Error deleting from Cloudinary:", cloudErr);
      }
    }

    // ✅ REMOVED: Delete local file (no longer needed)

    // Delete from DB
    await Manual.findByIdAndDelete(id);

    res.json({ message: 'Manual deleted successfully.' });
  } catch (error) {
    console.error('Delete manual error:', error);
    res.status(500).json({ message: 'Error deleting manual', error: error.message });
  }
};