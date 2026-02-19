// controllers/Category.js
import Category from "../models/Category.js";
import mongoose from "mongoose";
import multer from "multer"; // ✅ New: For file uploads
import path from "path"; // ✅ New: For file paths
import fs from "fs"; // ✅ New: For filesystem operations

// ✅ New: Ensure uploads folder exists
const uploadsDir = path.join(process.cwd(), 'uploads'); // Use process.cwd() for project root
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ✅ New: Configure multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir); // Save to uploads/ folder
  },
  filename: (req, file, cb) => {
    // Generate unique filename (timestamp + original name)
    const uniqueName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, ''); // Sanitize filename
    cb(null, uniqueName);
  }
});

// ✅ New: File filter (only images)
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

// ✅ Export upload for use in routes
export { upload };

// Create a new category
export const createCategory = async (req, res) => {
  try {
    const { name, description, parent, checklist } = req.body;

    // ✅ Normalize checklist items so they always start clean, including type and value
    const normalizedChecklist = (checklist || []).map((sec, idx) => ({
      section: sec.section || sec.name || sec.title,
      order: idx + 1, // ✅ assign order based on position
      items: (sec.items || []).map(item => ({
        name: item.name,
        type: item.type || "status", // ✅ Include type (default to "status")
        status: "na",       // always reset to "na"
        remarks: "",         // always clear remarks
        value: item.value || "" // ✅ Include value (default to empty string)
      }))
    }));

    const category = await Category.create({
      name,
      description,
      parent,
      checklist: normalizedChecklist
    });

    res.status(201).json(category);
  } catch (error) {
    // ✅ Handle duplicate key error
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Category name already exists under this parent" });
    }
    res.status(500).json({ message: error.message });
  }
};

// ✅ Updated: getCategories to include image field
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().lean();

    categories.forEach(cat => {
      if (Array.isArray(cat.checklist)) {
        cat.checklist = cat.checklist
          .map(sec => ({
            _id: sec._id,
            section: sec.section || sec.name || sec.title,
            order: sec.order,
            items: (sec.items || []).map(item => ({
              _id: item._id,
              name: item.name,
              type: item.type, // ✅ Include type
              status: item.status,
              remarks: item.remarks,
              value: item.value, // ✅ Include value
              parentItem: item.parentItem,   // ✅ keep parent reference
              code: item.code,               // ✅ keep code
              image: item.image              // ✅ New: Include image field
            }))
          }))
          .sort((a, b) => a.order - b.order);
      }
    });

    // Build children array
    const categoriesMap = {};
    categories.forEach(cat => {
      categoriesMap[cat._id] = { ...cat, children: [] };
    });

    categories.forEach(cat => {
      if (cat.parent) {
        if (categoriesMap[cat.parent]) {
          categoriesMap[cat.parent].children.push(categoriesMap[cat._id]);
        }
      }
    });

    const topLevel = Object.values(categoriesMap).filter(cat => !cat.parent);
    res.json(topLevel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a category
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndDelete(id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add a new section to a category
export const addChecklistSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { section } = req.body;

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    // ✅ Determine next order number
    const nextOrder =
      category.checklist.length > 0
        ? Math.max(...category.checklist.map(sec => sec.order || 0)) + 1
        : 1;

    category.checklist.push({ section, order: nextOrder, items: [] });
    await category.save();

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Updated: addChecklistItem with image upload support
export const addChecklistItem = async (req, res) => {
  try {
    const { id, sectionId } = req.params;
    const { name, type, parentItem } = req.body; // ✅ Added type to destructuring

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const section = category.checklist.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    let code = "";
    if (parentItem) {
      code = ""; // sub-item → no numbering
    } else {
      const itemIndex = section.items.filter(i => !i.parentItem).length + 1;
      code = `${section.order}${itemIndex}`;
    }

    // ✅ validate parentItem before casting
    let parentRef = null;
    if (parentItem && mongoose.Types.ObjectId.isValid(parentItem)) {
      parentRef = new mongoose.Types.ObjectId(parentItem);
    }

    // ✅ New: Handle image upload
    let imagePath = null;
    if (req.files && req.files.image && req.files.image[0]) {
      imagePath = `/uploads/${req.files.image[0].filename}`; // Relative path for serving (e.g., /uploads/1640995200000-image.jpg)
    }

    const newItem = {
      name,
      type: type || "status", // ✅ Include type (default to "status")
      status: "na",
      remarks: "",
      value: "", // ✅ Include value (default to empty string)
      parentItem: parentRef,
      code,
      image: imagePath, // ✅ New: Save image path
    };

    section.items.push(newItem);
    await category.save();

    res.json(category);
  } catch (error) {
    console.error("Error adding checklist item:", error);
    res.status(500).json({ message: error.message });
  }
};

// Bulk update checklist (replace entire structure)
export const updateChecklist = async (req, res) => {
  try {
    const { id } = req.params;
    const { checklist } = req.body;

    const category = await Category.findByIdAndUpdate(
      id,
      { checklist },
      { new: true }
    );

    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Updated: getCategoryById to include image field
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id).lean();
    if (!category) return res.status(404).json({ message: "Category not found" });

    if (Array.isArray(category.checklist)) {
      category.checklist = category.checklist
        .map(sec => ({
          _id: sec._id,
          section: sec.section || sec.name || sec.title,
          order: sec.order,
          items: (sec.items || []).map(item => ({
            _id: item._id,
            name: item.name,
            type: item.type, // ✅ Include type
            status: item.status,
            remarks: item.remarks,
            value: item.value, // ✅ Include value
            parentItem: item.parentItem,   // ✅ keep parent reference
            code: item.code,               // ✅ keep code
            image: item.image              // ✅ New: Include image field
          }))
        }))
        .sort((a, b) => a.order - b.order);
    }

    const children = await Category.find({ parent: id }).lean();
    category.children = children;

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a checklist section by section _id
export const deleteChecklistSection = async (req, res) => {
  try {
    const { id, sectionId } = req.params; // category id + section _id

    const category = await Category.findByIdAndUpdate(
      id,
      { $pull: { checklist: { _id: sectionId } } },
      { new: true }
    );

    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Optional: Enhanced deleteChecklistItem to remove image file from disk
export const deleteChecklistItem = async (req, res) => {
  try {
    const { id, sectionId, itemId } = req.params;

    // Find the item before deleting to get the image path
    const category = await Category.findOne({ _id: id, "checklist._id": sectionId });
    if (!category) return res.status(404).json({ message: "Category or section not found" });

    const section = category.checklist.id(sectionId);
    const item = section.items.id(itemId);
    if (item && item.image) {
      // Remove the file from disk
      const filePath = path.join(uploadsDir, path.basename(item.image));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Proceed with deletion
    const updatedCategory = await Category.findOneAndUpdate(
      { _id: id, "checklist._id": sectionId },
      { $pull: { "checklist.$.items": { _id: itemId } } },
      { new: true }
    );

    res.json(updatedCategory);
  } catch (error) {
    console.error("Error deleting checklist item:", error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ New: Update an existing item (e.g., add/change image)
export const updateChecklistItem = async (req, res) => {
  try {
    const { id, sectionId, itemId } = req.params;
    const { name, type } = req.body; // Optional fields to update

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const section = category.checklist.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    const item = section.items.id(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    // Update fields if provided
    if (name) item.name = name;
    if (type) item.type = type;

    // Handle image update
    if (req.files && req.files.image && req.files.image[0]) {
      // Remove old image file if it exists
      if (item.image) {
        const oldPath = path.join(uploadsDir, path.basename(item.image));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      item.image = `/uploads/${req.files.image[0].filename}`;
    }

    await category.save();
    res.json(category);
  } catch (error) {
    console.error("Error updating checklist item:", error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ New: Update appearance images for a category (front, rear, left, right)
export const updateAppearanceImages = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    // Initialize appearanceImages if not exists
    if (!category.appearanceImages) {
      category.appearanceImages = { front: null, rear: null, left: null, right: null };
    }

    // Handle each side's image upload
    const sides = ['front', 'rear', 'left', 'right'];
    sides.forEach(side => {
      if (req.files && req.files[side] && req.files[side][0]) {
        // Remove old image file if it exists
        if (category.appearanceImages[side]) {
          const oldPath = path.join(uploadsDir, path.basename(category.appearanceImages[side]));
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
        // Save new image path
        category.appearanceImages[side] = `/uploads/${req.files[side][0].filename}`;
      }
    });

    await category.save();
    res.json(category);
  } catch (error) {
    console.error("Error updating appearance images:", error);
    res.status(500).json({ message: error.message });
  }
};