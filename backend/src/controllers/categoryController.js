// controllers/Category.js
import Category from "../models/Category.js";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js"; // ✅ Import for deletion

// ✅ REMOVED: All local multer config - now handled by cloudinary.js

// ✅ REMOVED: upload export - now imported from cloudinary.js

// Create a new category
export const createCategory = async (req, res) => {
  try {
    const { name, description, parent, checklist } = req.body;

    const normalizedChecklist = (checklist || []).map((sec, idx) => ({
      section: sec.section || sec.name || sec.title,
      order: idx + 1,
      items: (sec.items || []).map(item => ({
        name: item.name,
        type: item.type || "status",
        status: "na",
        remarks: "",
        value: item.value || ""
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
    if (error.code === 11000) {
      return res.status(400).json({ message: "Category name already exists under this parent" });
    }
    res.status(500).json({ message: error.message });
  }
};

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
              type: item.type,
              status: item.status,
              remarks: item.remarks,
              value: item.value,
              parentItem: item.parentItem,
              code: item.code,
              image: item.image
            }))
          }))
          .sort((a, b) => a.order - b.order);
      }
    });

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

export const addChecklistSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { section } = req.body;

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

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

// ✅ Updated: addChecklistItem - Now uses Cloudinary URL
export const addChecklistItem = async (req, res) => {
  try {
    const { id, sectionId } = req.params;
    const { name, type, parentItem } = req.body;

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const section = category.checklist.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    let code = "";
    if (parentItem) {
      code = "";
    } else {
      const itemIndex = section.items.filter(i => !i.parentItem).length + 1;
      code = `${section.order}${itemIndex}`;
    }

    let parentRef = null;
    if (parentItem && mongoose.Types.ObjectId.isValid(parentItem)) {
      parentRef = new mongoose.Types.ObjectId(parentItem);
    }

    // ✅ CHANGE: Use Cloudinary URL directly (req.file.path contains the URL)
    let imagePath = null;
    if (req.files && req.files.image && req.files.image[0]) {
      imagePath = req.files.image[0].path; // This is now a Cloudinary URL!
    }

    const newItem = {
      name,
      type: type || "status",
      status: "na",
      remarks: "",
      value: "",
      parentItem: parentRef,
      code,
      image: imagePath,
    };

    section.items.push(newItem);
    await category.save();

    res.json(category);
  } catch (error) {
    console.error("Error adding checklist item:", error);
    res.status(500).json({ message: error.message });
  }
};

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
            type: item.type,
            status: item.status,
            remarks: item.remarks,
            value: item.value,
            parentItem: item.parentItem,
            code: item.code,
            image: item.image
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

export const deleteChecklistSection = async (req, res) => {
  try {
    const { id, sectionId } = req.params;

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

// ✅ Updated: deleteChecklistItem - Now deletes from Cloudinary
export const deleteChecklistItem = async (req, res) => {
  try {
    const { id, sectionId, itemId } = req.params;

    const category = await Category.findOne({ _id: id, "checklist._id": sectionId });
    if (!category) return res.status(404).json({ message: "Category or section not found" });

    const section = category.checklist.id(sectionId);
    const item = section.items.id(itemId);
    
    // ✅ CHANGE: Delete from Cloudinary using public_id
    if (item && item.image) {
      try {
        // Extract public_id from Cloudinary URL
        const publicId = item.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudErr) {
        console.error("Error deleting from Cloudinary:", cloudErr);
      }
    }

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

// ✅ Updated: updateChecklistItem - Now uses Cloudinary
export const updateChecklistItem = async (req, res) => {
  try {
    const { id, sectionId, itemId } = req.params;
    const { name, type } = req.body;

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const section = category.checklist.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    const item = section.items.id(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (name) item.name = name;
    if (type) item.type = type;

    // ✅ CHANGE: Handle image upload from Cloudinary
    if (req.files && req.files.image && req.files.image[0]) {
      // Delete old image from Cloudinary
      if (item.image) {
        try {
          const publicId = item.image.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (cloudErr) {
          console.error("Error deleting old image from Cloudinary:", cloudErr);
        }
      }
      // Save new Cloudinary URL
      item.image = req.files.image[0].path;
    }

    await category.save();
    res.json(category);
  } catch (error) {
    console.error("Error updating checklist item:", error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ Updated: updateAppearanceImages - Now uses Cloudinary
export const updateAppearanceImages = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    if (!category.appearanceImages) {
      category.appearanceImages = { front: null, rear: null, left: null, right: null };
    }

    // ✅ CHANGE: Use for...of instead of forEach (allows await)
    const sides = ['front', 'rear', 'left', 'right'];
    for (const side of sides) {
      if (req.files && req.files[side] && req.files[side][0]) {
        // Delete old image from Cloudinary
        if (category.appearanceImages[side]) {
          try {
            const publicId = category.appearanceImages[side].split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(publicId);
          } catch (cloudErr) {
            console.error(`Error deleting old ${side} image from Cloudinary:`, cloudErr);
          }
        }
        // Save new Cloudinary URL
        category.appearanceImages[side] = req.files[side][0].path;
      }
    }

    await category.save();
    res.json(category);
  } catch (error) {
    console.error("Error updating appearance images:", error);
    res.status(500).json({ message: error.message });
  }
};
