import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Storage for single images (checklist items)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'checklist/items',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
  },
});

// ✅ Storage for appearance images (multiple)
const storageAppearance = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'checklist/appearance',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
  },
});

// ✅ Storage for PDFs (manuals)
const storagePdf = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'manuals',
    allowed_formats: ['pdf'],
    resource_type: 'raw',
  },
});

const upload = multer({ storage: storage });
const uploadAppearance = multer({ storage: storageAppearance });
const uploadPdf = multer({ storage: storagePdf });

// ✅ Export cloudinary for use in controllers
export { cloudinary };
export { upload, uploadAppearance, uploadPdf };
export default upload;