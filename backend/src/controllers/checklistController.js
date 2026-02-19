import Checklist from "../models/Checklist.js";

// Create checklist item
export const createChecklist = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const checklist = await Checklist.create({ title, description, category });
    res.status(201).json(checklist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all checklist items
export const getChecklists = async (req, res) => {
  try {
    const checklists = await Checklist.find().populate("category");
    res.json(checklists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete checklist item
export const deleteChecklist = async (req, res) => {
  try {
    const { id } = req.params;
    await Checklist.findByIdAndDelete(id);
    res.json({ message: "Checklist item deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};