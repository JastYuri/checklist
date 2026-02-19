import { useState, useEffect, useRef } from "react"; // ✅ Added useRef for outside click
import axiosInstance from "../utils/axiosInstance";
import toast, { Toaster } from "react-hot-toast";
import { toRoman } from "../utils/roman";
import { Plus, Trash2, Edit, Search, Image, Eye, X } from "lucide-react"; // ✅ Added Image, Eye, X icons for image features

// ✅ Base URL for images (derived from your axios baseURL, without /api)
const API_BASE_URL = 'http://localhost:5000';

export default function Category() {

 

  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [parentId, setParentId] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // ✅ Checklist management state
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeChecklist, setActiveChecklist] = useState([]);
  const [itemType, setItemType] = useState("status"); // ✅ New state for item type


   // ✅ New state for edit item modal
  const [editItemModalOpen, setEditItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemType, setEditItemType] = useState("status");
  const [editItemImage, setEditItemImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editParentItem, setEditParentItem] = useState(""); 

 const [itemImage, setItemImage] = useState(null); // File object for upload
  const [imagePreview, setImagePreview] = useState(null); // Preview URL
  const [viewImageModalOpen, setViewImageModalOpen] = useState(false);
  const [viewImageUrl, setViewImageUrl] = useState(null);

  // ✅ New state for appearance images (front, rear, left, right)
const [appearanceImages, setAppearanceImages] = useState({
  front: null, // File object
  rear: null,
  left: null,
  right: null,
});
const [appearanceImagePreviews, setAppearanceImagePreviews] = useState({
  front: null, // Preview URL
  rear: null,
  left: null,
  right: null,
});

  const [addSectionModalOpen, setAddSectionModalOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [targetSection, setTargetSection] = useState(null);
  const [filteredChecklist, setFilteredChecklist] = useState([]);
  const [deleteCategoryModalOpen, setDeleteCategoryModalOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState(null);
  // For Add Item modal parent selection
  const [parentItem, setParentItem] = useState("");

  // For delete section confirmation modal
  const [deleteSectionModalOpen, setDeleteSectionModalOpen] = useState(false);

  // For delete item confirmation modal
  const [deleteItemModalOpen, setDeleteItemModalOpen] = useState(false);
  const [targetItem, setTargetItem] = useState(null);

  const modalRef = useRef(null);

  const fetchCategories = async () => {
    try {
      const res = await axiosInstance.get("/category");
      setCategories(res.data); // returns hierarchy
    } catch (error) {
      toast.error("Failed to fetch categories");
    }
  };

  const handleAdd = async () => {
    try {
      await axiosInstance.post("/category", {
        name,
        description,
        parent: parentId || null,
      });
      toast.success("Category created!");
      setModalOpen(false);
      setName("");
      setDescription("");
      setParentId(null);
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error creating category");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/category/${id}`);
      toast.success("Category deleted!");
      fetchCategories();
    } catch (error) {
      toast.error("Error deleting category");
    }
  };

 // ✅ Manage checklist
const handleManageChecklist = async (cat) => {
  try {
    const res = await axiosInstance.get(`/category/${cat._id}`);
    // Use the fresh category from backend
    setActiveCategory(res.data);
    setActiveChecklist(res.data.checklist || []);
    // ✅ Load existing appearance images if available
    setAppearanceImages({
      front: null,
      rear: null,
      left: null,
      right: null,
    });
    setAppearanceImagePreviews({
      front: res.data.appearanceImages?.front ? `${API_BASE_URL}${res.data.appearanceImages.front}` : null,
      rear: res.data.appearanceImages?.rear ? `${API_BASE_URL}${res.data.appearanceImages.rear}` : null,
      left: res.data.appearanceImages?.left ? `${API_BASE_URL}${res.data.appearanceImages.left}` : null,
      right: res.data.appearanceImages?.right ? `${API_BASE_URL}${res.data.appearanceImages.right}` : null,
    });
    setChecklistModalOpen(true);

    localStorage.setItem("selectedCategory", JSON.stringify(res.data)); // sync with JobForm
  } catch (error) {
    toast.error("Failed to fetch checklist");
  }
};

  // Add Section
  const handleSaveSection = async () => {
    if (!newSectionName.trim()) return;
    try {
      const res = await axiosInstance.post(
        `/category/${activeCategory._id}/checklist/section`,
        { section: newSectionName }
      );

      // ✅ Update both category and checklist
      setActiveCategory(res.data);
      setActiveChecklist(res.data.checklist);

      toast.success("Section added!");
      setAddSectionModalOpen(false);
      setNewSectionName("");
    } catch (error) {
      toast.error("Error adding section");
    }
  };
// ✅ Updated handleSaveItem (unchanged, but ensure it's using FormData correctly)
  const handleSaveItem = async () => {
    if (!targetSection) return;
    try {
      let itemName = "";
      if (itemType === "input") {
        const target = activeChecklist.find(sec => sec._id === targetSection);
        const inputItemCount = target ? target.items.filter(item => item.type === "input").length + 1 : 1;
        itemName = `Serial Number Input #${inputItemCount}`;
      } else {
        itemName = newItemName.trim() || "Unnamed Status Item";
      }

      const formData = new FormData();
      formData.append('name', itemName);
      formData.append('type', itemType);
      formData.append('parentItem', parentItem || null);
      if (itemImage) {
        formData.append('image', itemImage);
      }

      const res = await axiosInstance.post(
        `/category/${activeCategory._id}/checklist/${targetSection}/item`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setActiveCategory(res.data);
      setActiveChecklist(res.data.checklist);

      toast.success("Item added!");
      setAddItemModalOpen(false);
      setNewItemName("");
      setItemType("status");
      setParentItem(null);
      setTargetSection(null);
      setItemImage(null);
      setImagePreview(null);
    } catch (error) {
      toast.error("Error adding item");
    }
  };

// ... (in the Add Item Modal, update the note for input items)
{itemType === "input" && (
  <p className="text-sm text-base-content/70 mb-4">
    Name will be auto-generated as a numbered serial input (e.g., "Serial Number Input #1").
  </p>
)}
  // Delete Section
  const handleDeleteSection = async (sectionId) => {
    try {
      const res = await axiosInstance.delete(
        `/category/${activeCategory._id}/checklist/${sectionId}`
      );

      setActiveCategory(res.data);
      setActiveChecklist(res.data.checklist);

      toast.success("Section deleted!");
    } catch (error) {
      toast.error("Error deleting section");
    }
  };

 // ✅ New functions for image handling (unchanged)
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please select a valid image file (JPG, PNG, GIF).");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB.");
        return;
      }
      setItemImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setItemImage(null);
    setImagePreview(null);
  };

  const handleViewImage = (url) => {
    setViewImageUrl(url);
    setViewImageModalOpen(true);
  };

  // ✅ New functions for edit item
  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please select a valid image file (JPG, PNG, GIF).");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB.");
        return;
      }
      setEditItemImage(file);
      setEditImagePreview(URL.createObjectURL(file));
    }
  };

  const removeEditImage = () => {
    setEditItemImage(null);
    setEditImagePreview(null);
  };
const handleEditItem = (sectionId, item) => {
  setTargetSection(sectionId);
  setEditingItem(item);
  setEditItemName(item.name);
  setEditItemType(item.type || 'status');  // ✅ Default to 'status' if undefined
  setEditParentItem(item.parentItem || ""); // ✅ Added: Pre-populate parent item
  setEditItemImage(null);
  setEditImagePreview(null);
  setEditItemModalOpen(true);
};

// ✅ New functions for appearance images
const handleAppearanceImageChange = (side, e) => {
  const file = e.target.files[0];
  if (file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please select a valid image file (JPG, PNG, GIF).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB.");
      return;
    }
    setAppearanceImages(prev => ({ ...prev, [side]: file }));
    setAppearanceImagePreviews(prev => ({ ...prev, [side]: URL.createObjectURL(file) }));
  }
};

const removeAppearanceImage = (side) => {
  setAppearanceImages(prev => ({ ...prev, [side]: null }));
  setAppearanceImagePreviews(prev => ({ ...prev, [side]: null }));
};

// ✅ Save appearance images to category
const handleSaveAppearanceImages = async () => {
  try {
    const formData = new FormData();
    Object.keys(appearanceImages).forEach(side => {
      if (appearanceImages[side]) {
        formData.append(side, appearanceImages[side]);
      }
    });

    const res = await axiosInstance.put(
      `/category/${activeCategory._id}/appearance-images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    setActiveCategory(res.data);
    toast.success("Appearance images saved!");
  } catch (error) {
    toast.error("Error saving appearance images");
  }
};

 const handleSaveEditedItem = async () => {
  if (!targetSection || !editingItem) return;
  try {
    let itemName = "";
    if (editItemType === "input") {
      // Auto-generate numbered name for input items (same as add)
      const target = activeChecklist.find(sec => sec._id === targetSection);
      const inputItemCount = target ? target.items.filter(item => item.type === "input").length + 1 : 1;
      itemName = `Serial Number Input #${inputItemCount}`;
    } else {
      // For status items, use entered name or fallback
      itemName = editItemName.trim() || "Unnamed Status Item";
    }

    const formData = new FormData();
    formData.append('name', itemName);
    formData.append('type', editItemType);
    formData.append('parentItem', editParentItem || null); // ✅ Added: Include parent item
    if (editItemImage) {
      formData.append('image', editItemImage);
    }

    const res = await axiosInstance.put(
      `/category/${activeCategory._id}/checklist/${targetSection}/item/${editingItem._id}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    setActiveCategory(res.data);
    setActiveChecklist(res.data.checklist);

    toast.success("Item updated!");
    setEditItemModalOpen(false);
    setEditingItem(null);
    setEditItemName("");
    setEditItemType("status");
    setEditParentItem(""); // ✅ Added: Reset parent item
    setEditItemImage(null);
    setEditImagePreview(null);
  } catch (error) {
    toast.error("Error updating item");
  }
};

  // Delete Item
  const handleDeleteItem = async (sectionId, itemId) => {
    if (!sectionId || !itemId) {
      toast.error("Invalid section or item ID");
      return;
    }
    try {
      const res = await axiosInstance.delete(
        `/category/${activeCategory._id}/checklist/${sectionId}/item/${itemId}`
      );

      setActiveCategory(res.data);
      setActiveChecklist(res.data.checklist);

      toast.success("Item deleted!");
    } catch (error) {
      toast.error("Error deleting item");
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

 // ✅ Updated outside click logic (includes editItemModalOpen)
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        checklistModalOpen &&
        !addSectionModalOpen &&
        !addItemModalOpen &&
        !deleteSectionModalOpen &&
        !deleteItemModalOpen &&
        !viewImageModalOpen &&
        !editItemModalOpen && // ✅ Added to prevent close when edit modal is open
        modalRef.current &&
        !modalRef.current.contains(event.target)
      ) {
        setChecklistModalOpen(false);
        setFilteredChecklist([]);
      }
    };

    if (checklistModalOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [checklistModalOpen, addSectionModalOpen, addItemModalOpen, deleteSectionModalOpen, deleteItemModalOpen, viewImageModalOpen, editItemModalOpen]); // ✅ Added editItemModalOpen


  const renderRows = (cats, level = 0, colorIndex = 0) => {
    const colorClasses = [
      { parent: "bg-gradient-to-r from-base-200 to-base-300", child: "bg-base-300 border-l-4 border-primary shadow-sm" },
      { parent: "bg-gradient-to-r from-success/20 to-success/30", child: "bg-success/30 border-l-4 border-success shadow-sm" },
      { parent: "bg-gradient-to-r from-info/20 to-info/30", child: "bg-info/30 border-l-4 border-info shadow-sm" },
      { parent: "bg-gradient-to-r from-warning/20 to-warning/30", child: "bg-warning/30 border-l-4 border-warning shadow-sm" },
    ];

    return cats.flatMap((cat, idx) => {
      let rowClass = "";
      let paddingClass = "";

      if (level === 0) {
        rowClass = `${colorClasses[(colorIndex + idx) % colorClasses.length].parent} font-bold hover:bg-base-100 transition-colors`;
        paddingClass = "pl-2 sm:pl-4";
      } else if (level === 1) {
        rowClass = `${colorClasses[colorIndex % colorClasses.length].child} hover:bg-base-200 transition-colors`;
        paddingClass = "pl-6 sm:pl-12";
      } else {
        rowClass = "bg-base-100 border-l-4 border-gray-400 shadow-inner hover:bg-base-200 transition-colors";
        paddingClass = "pl-10 sm:pl-20";
      }

      const rows = [
        <tr key={`${cat._id}-${level}`} className={rowClass}><td className={`${paddingClass} text-sm sm:text-base font-medium`}>{cat.name}</td><td className="text-xs sm:text-sm text-gray-600">{cat.description || "-"}</td><td><div className="flex flex-col sm:flex-row gap-1 sm:gap-2"><button className="btn btn-xs btn-primary transition-transform hover:scale-105" onClick={() => { setParentId(cat._id); setModalOpen(true); }}><Plus size={14} className="mr-1" /> Add Sub</button>{!cat.children?.length && <button className="btn btn-xs btn-secondary transition-transform hover:scale-105" onClick={() => handleManageChecklist(cat)}><Edit size={14} className="mr-1" /> Manage</button>}<button className="btn btn-xs btn-error transition-transform hover:scale-105" onClick={() => { setTargetCategory(cat); setDeleteCategoryModalOpen(true); }}><Trash2 size={14} className="mr-1" /> Delete</button></div></td></tr> // ✅ Single-line <tr> with no whitespace
      ];

      if (cat.children?.length > 0) {
        rows.push(...renderRows(cat.children, level + 1, level === 0 ? idx : colorIndex));
      }

      return rows;
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6"> {/* ✅ Responsive padding and spacing */}
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-primary">Category Management</h2> {/* ✅ Responsive text and color */}

      {/* ✅ Add Top-Level Category */}
      <div className="mb-4 sm:mb-6">
        <button
          className="btn btn-success btn-lg shadow-lg transition-transform hover:scale-105"
          onClick={() => {
            setParentId(null);
            setModalOpen(true);
          }}
        >
          <Plus size={18} className="mr-2" /> Add Top-Level Category
        </button>
      </div>

      {/* ✅ Zebra Table with Responsiveness */}
      <div className="overflow-x-auto shadow-xl rounded-lg bg-base-100"> {/* ✅ Scrollable on small screens */}
        <table className="table table-zebra w-full">
          <thead className="bg-base-200">
            <tr>
              <th className="text-sm sm:text-base">Name</th>
              <th className="text-sm sm:text-base">Description</th>
              <th className="text-sm sm:text-base">Actions</th>
            </tr>
          </thead>
          <tbody>{renderRows(categories, 0)}</tbody>
        </table>
      </div>

      {/* ✅ Add Category Modal */}
      {modalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm sm:max-w-md lg:max-w-lg shadow-2xl"> {/* ✅ Responsive width */}
            <h3 className="font-bold text-lg sm:text-xl text-primary mb-4">
              {parentId ? "Add Subcategory" : "Add Top-Level Category"}
            </h3>
            <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
              <div className="form-control mb-4">
                <label className="label text-sm sm:text-base">Name</label>
                <input
                  type="text"
                  placeholder="Name"
                  className="input input-bordered input-primary w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-control mb-4">
                <label className="label text-sm sm:text-base">Description</label>
                <input
                  type="text"
                  placeholder="Description"
                  className="input input-bordered input-secondary w-full"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="modal-action">
                <button type="submit" className="btn btn-primary transition-transform hover:scale-105">
                  Save
                </button>
                <button
                  type="button"
                  className="btn transition-transform hover:scale-105"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
{/* ✅ Enhanced Checklist Modal with Outside Click Close and Visible Close Button */}
{checklistModalOpen && (
  <div className="modal modal-open">
    <div className="modal-box max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-4xl shadow-2xl bg-base-100" ref={modalRef}> {/* ✅ Added ref for outside click */}
      <h3 className="font-bold text-xl sm:text-2xl mb-6 text-primary text-center">
        Manage Checklist for <span className="text-secondary">{activeCategory?.name}</span>
      </h3>

      {/* ✅ Enhanced Search Bar - Fixed positioning */}
      <div className="form-control mb-6">
        <div className="input-group flex">
          <input
            type="text"
            placeholder="Search items or sections..."
            className="input input-bordered input-info w-full focus:ring-2 focus:ring-info transition-all"
            onChange={(e) => {
              const query = e.target.value.toLowerCase();
              if (!query) {
                setFilteredChecklist([]); // reset search
                return;
              }
              const filtered = activeChecklist.filter(
                (sec) =>
                  sec.section.toLowerCase().includes(query) ||
                  sec.items.some((item) =>
                    item.name.toLowerCase().includes(query)
                  )
              );
              setFilteredChecklist(filtered);
            }}
          />
          <button className="btn btn-square btn-info hover:scale-105 transition-transform">
            <Search size={16} />
          </button>
        </div>
      </div>

      {/* ✅ New Appearance Images Section */}
<div className="collapse collapse-arrow border border-base-300 rounded-xl shadow-lg bg-base-100 hover:shadow-xl transition-all duration-300 mb-6">
  <input type="checkbox" />
  <div className="collapse-title font-semibold text-base-content text-sm sm:text-base flex items-center py-4 px-6 pr-9">
    <Image size={16} className="mr-2" /> Appearance Images (Front, Rear, Left, Right)
  </div>
  <div className="collapse-content px-6 pb-4">
    <p className="text-sm text-base-content/70 mb-4">
      Upload images for each side of the unit. These will be used in the Appearance Checklist for marking defects.
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {['front', 'rear', 'left', 'right'].map(side => (
        <div key={side} className="form-control">
          <label className="label text-sm font-medium capitalize">{side} Side</label>
          <input
            type="file"
            accept="image/*"
            className="file-input file-input-bordered file-input-primary w-full"
            onChange={(e) => handleAppearanceImageChange(side, e)}
          />
          {appearanceImagePreviews[side] && (
            <div className="mt-2 relative">
              <img src={appearanceImagePreviews[side]} alt={`${side} preview`} className="w-full h-32 object-cover rounded" />
              <button
                className="btn btn-xs btn-error absolute top-2 right-2"
                onClick={() => removeAppearanceImage(side)}
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
    <div className="mt-4 flex justify-end">
      <button
        className="btn btn-success btn-sm"
        onClick={handleSaveAppearanceImages}
      >
        Save Appearance Images
      </button>
    </div>
  </div>
</div>

      {/* ✅ Enhanced Collapse Accordion */}
      <div className="space-y-4 max-h-80 sm:max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-100">
        {(filteredChecklist.length ? filteredChecklist : activeChecklist).length > 0 ? (
          (filteredChecklist.length ? filteredChecklist : activeChecklist).map(
            (section) => (
              <div
                key={section._id}
                className="collapse collapse-arrow border border-base-300 rounded-xl shadow-lg bg-base-100 hover:shadow-xl transition-all duration-300"
              >
                <input type="checkbox" />
               <div className="collapse-title font-semibold text-base-content text-sm sm:text-base flex items-center py-4 px-6 pr-9"> {/* ✅ Added pr-8 for space from the arrow */}
  <span className="badge badge-primary mr-3">{toRoman(section.order)}</span>
  {section.section}
  <span className="ml-auto text-xs text-base-content/70">({section.items.length} items)</span>
</div>
                <div className="collapse-content px-6 pb-4">
                  {section.items.length > 0 ? (
                    <ul className="list-none space-y-2">
                      {section.items
                        .filter(item => !item.parentItem) // top-level only
                        .map((item, idx) => (
<li key={item._id} className="bg-base-200 rounded-lg p-3 shadow-sm">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {item.image && (
          <img
            src={`${API_BASE_URL}${item.image}`}
            alt={item.name}
            className="w-12 h-12 object-cover rounded cursor-pointer hover:scale-105 transition-transform shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              handleViewImage(`${API_BASE_URL}${item.image}`);
            }}
          />
        )}
        <span className="text-sm sm:text-base font-medium text-base-content truncate">
          {idx + 1}. {item.name}
        </span>
      </div>
      <div className="flex gap-2 shrink-0">
        {item.image && (
          <button
            className="btn btn-xs btn-info btn-outline hover:btn-solid transition-all hover:scale-105"
            onClick={(e) => {
              e.stopPropagation();
              handleViewImage(`${API_BASE_URL}${item.image}`);
            }}
          >
            <Eye size={14} />
          </button>
        )}
        <button
          className="btn btn-xs btn-warning btn-outline hover:btn-solid transition-all hover:scale-105" // ✅ New edit button (btn-xs for consistency)
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleEditItem(section._id, item);
          }}
        >
          <Edit size={14} />
        </button>
        <button
          className="btn btn-xs btn-error btn-outline hover:btn-solid transition-all hover:scale-105" // ✅ Changed to btn-xs for consistency
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setTargetSection(section._id);
            setTargetItem(item._id);
            setDeleteItemModalOpen(true);
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>

    {/* Sub-items with better indentation */}
{section.items.filter(sub => sub.parentItem?.toString() === item._id.toString()).length > 0 && (
  <ul className="list-none ml-6 mt-2 space-y-1 border-l-2 border-info pl-4">
    {section.items
      .filter(sub => sub.parentItem?.toString() === item._id.toString())
      .map(sub => (
        <li key={sub._id} className="flex justify-between items-center bg-base-300 rounded p-2 text-xs sm:text-sm text-base-content/80">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {sub.image && (
              <img
                src={`${API_BASE_URL}${sub.image}`}
                alt={sub.name}
                className="w-8 h-8 object-cover rounded cursor-pointer hover:scale-105 transition-transform shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewImage(`${API_BASE_URL}${sub.image}`);
                }}
              />
            )}
            <span className="truncate">- {sub.name}</span>
          </div>
          <div className="flex gap-2 shrink-0">
            {sub.image && (
              <button
                className="btn btn-xs btn-info btn-outline hover:btn-solid transition-all hover:scale-105"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewImage(`${API_BASE_URL}${sub.image}`);
                }}
              >
                <Eye size={12} />
              </button>
            )}
            <button
              className="btn btn-xs btn-warning btn-outline hover:btn-solid transition-all hover:scale-105"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleEditItem(section._id, sub); // ✅ Now allows editing sub-items
              }}
            >
              <Edit size={12} />
            </button>
            <button
              className="btn btn-xs btn-error btn-outline hover:btn-solid transition-all hover:scale-105 shrink-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setTargetSection(section._id);
                setTargetItem(sub._id);
                setDeleteItemModalOpen(true);
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </li>
      ))}
  </ul>
)}
  </li>

                        ))}
                    </ul>
                  ) : (
                    <p className="text-center text-base-content/70 py-4">No items in this section yet.</p>
                  )}
                  <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-end">
                    <button
                      className="btn btn-sm btn-error btn-outline hover:btn-solid transition-all hover:scale-105"
                      onClick={(e) => {
                        e.preventDefault();
                        setTargetSection(section._id);
                        setDeleteSectionModalOpen(true);
                      }}
                    >
                      <Trash2 size={16} className="mr-2" /> Delete Section
                    </button>
                    <button
                      className="btn btn-sm btn-success btn-outline hover:btn-solid transition-all hover:scale-105"
                      onClick={(e) => {
                        e.preventDefault();
                        setTargetSection(section._id);
                        setAddItemModalOpen(true);
                      }}
                    >
                      <Plus size={16} className="mr-2" /> Add Item
                    </button>
                  </div>
                </div>
              </div>
            )
          )
        ) : (
          <div className="text-center py-8">
            <p className="text-base-content/70 text-lg">No sections found. Add one below!</p>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-center">
        <button
          className="btn btn-lg btn-success shadow-lg hover:shadow-xl transition-all hover:scale-105"
          onClick={() => setAddSectionModalOpen(true)}
        >
          <Plus size={18} className="mr-2" /> Add New Section
        </button>
      </div>

      <div className="modal-action mt-6 justify-end">
                <button
          className="btn btn-neutral hover:btn-solid transition-all hover:scale-105" // ✅ Removed outline for better visibility in dark theme
          onClick={() => {
            setChecklistModalOpen(false);
            setFilteredChecklist([]); // reset search when closing
          }}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

      {/* ✅ Delete Section Confirmation Modal */}
      {deleteSectionModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm sm:max-w-md shadow-2xl"> {/* ✅ Responsive width */}
            {(() => {
              const target = activeChecklist.find(sec => sec._id === targetSection);
              return (
                <>
                  <h3 className="font-bold text-lg sm:text-xl text-error mb-4">Confirm Delete Section</h3>
                  {target && (
                    <p className="text-sm sm:text-base text-base-content/70 mb-4">
                      Are you sure you want to delete Section #{target.order}: {target.section}?
                    </p>
                  )}
                </>
              );
            })()}
            <div className="modal-action">
              <button
                className="btn btn-error transition-transform hover:scale-105"
                onClick={() => {
                  handleDeleteSection(targetSection);
                  setDeleteSectionModalOpen(false);
                }}
              >
                Yes, Delete
              </button>
              <button
                className="btn transition-transform hover:scale-105"
                onClick={() => setDeleteSectionModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Delete Item Confirmation Modal */}
      {deleteItemModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm sm:max-w-md shadow-2xl"> {/* ✅ Responsive width */}
            {(() => {
              const targetSec = activeChecklist.find(sec => sec._id === targetSection);
              const targetItemObj = targetSec?.items.find(it => it._id === targetItem);
              return (
                <>
                  <h3 className="font-bold text-lg sm:text-xl text-error mb-4">Confirm Delete Item</h3>
                  {targetSec && targetItemObj && (
                    <p className="text-sm sm:text-base text-base-content/70 mb-4">
                      Are you sure you want to delete item "{targetItemObj.name}" from Section #{targetSec.order}: {targetSec.section}?
                    </p>
                  )}
                </>
              );
            })()}
            <div className="modal-action">
              <button
                className="btn btn-error transition-transform hover:scale-105"
                onClick={() => {
                  handleDeleteItem(targetSection, targetItem);
                  setDeleteItemModalOpen(false);
                }}
              >
                Yes, Delete
              </button>
              <button
                className="btn transition-transform hover:scale-105"
                onClick={() => setDeleteItemModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Add Section Modal */}
      {addSectionModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm sm:max-w-md shadow-2xl"> {/* ✅ Responsive width */}
            <h3 className="font-bold text-lg sm:text-xl mb-4">
              Add New Section {activeChecklist && `(#${(activeChecklist.length || 0) + 1})`}
            </h3>
            <p className="text-sm sm:text-base text-base-content/70 mb-4">
              This will be section number {(activeChecklist?.length || 0) + 1}.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveSection(); }}>
              <div className="form-control mb-4">
                <label className="label text-sm sm:text-base">Section Name</label>
                <input
                  type="text"
                  placeholder="Section name"
                  className="input input-bordered input-primary w-full"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  required
                />
              </div>
              <div className="modal-action">
                <button type="submit" className="btn btn-primary transition-transform hover:scale-105">
                  Save
                </button>
                <button
                  type="button"
                  className="btn transition-transform hover:scale-105"
                  onClick={() => setAddSectionModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ Add Item Modal */}
      {addItemModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm sm:max-w-md shadow-2xl"> {/* ✅ Responsive width */}
            {(() => {
              const target = activeChecklist.find(sec => sec._id === targetSection);
              return (
                <>
                  <h3 className="font-bold text-lg sm:text-xl mb-4">
                    Add New Item {target ? `to Section #${target.order}: ${target.section}` : ""}
                  </h3>
                  {target && (
                    <p className="text-sm sm:text-base text-base-content/70 mb-4">
                      You are adding an item under section #{target.order} ({target.section}).
                    </p>
                  )}
                </>
              );
            })()}

            {/* ✅ Wrap everything in a form */}
            <form
              onSubmit={(e) => {
                e.preventDefault(); // prevent page reload
                handleSaveItem();   // call your save function
              }}
            >
           {/* Item type selector */}
<div className="form-control mb-4">
  <label className="label text-sm sm:text-base">Item Type</label>
  <select
    className="select select-bordered w-full"
    value={itemType}
    onChange={(e) => setItemType(e.target.value)}
  >
    <option value="status">Status (Good/No Good/etc.)</option>
    <option value="input">Input Field (e.g., Serial Number)</option>
  </select>
</div>

{/* Item name - Only for status items */}
{itemType === "status" && (
  <div className="form-control mb-4">
    <label className="label text-sm sm:text-base">Item Name (required)</label>
    <input
      type="text"
      placeholder="Item name"
      className="input input-bordered input-primary w-full"
      value={newItemName}
      onChange={(e) => setNewItemName(e.target.value)}
      required
    />
  </div>
)}

{/* For input items, show a note */}
{itemType === "input" && (
  <p className="text-sm text-base-content/70 mb-4">
    Name will be auto-generated as a numbered serial input (e.g., "1. Serial Number Input").
  </p>
)}

              
              {/* Optional parent item selector */}
              {(() => {
                const target = activeChecklist.find(sec => sec._id === targetSection);
                if (target && target.items.length > 0) {
                  return (
                    <div className="form-control mb-4">
                      <label className="label text-sm sm:text-base">
                        <span className="label-text">Parent Item (optional)</span>
                      </label>
                      <select
                        className="select select-bordered w-full"
                        value={parentItem || ""}
                        onChange={(e) => setParentItem(e.target.value)}
                      >
                        <option value="">None (top-level item)</option>
                        {target.items.map(itm => (
                          <option key={itm._id} value={itm._id}>
                            {itm.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Image upload section - NEW */}
<div className="form-control mb-4">
  <label className="label text-sm sm:text-base">Reference Image (optional)</label>
  <input
    type="file"
    accept="image/*"
    className="file-input file-input-bordered file-input-primary w-full"
    onChange={handleImageChange}
  />
  {imagePreview && (
    <div className="mt-2 relative">
      <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded" />
      <button
        className="btn btn-xs btn-error absolute top-0 right-0"
        onClick={removeImage}
      >
        <X size={12} />
      </button>
    </div>
  )}
  <p className="text-xs text-base-content/70 mt-1">Max 5MB, JPG/PNG/GIF only.</p>
</div>

              <div className="modal-action">
                {/* ✅ Button type="submit" so Enter also triggers it */}
                <button type="submit" className="btn btn-primary transition-transform hover:scale-105">
                  Save
                </button>
                <button
                  type="button"
                  className="btn transition-transform hover:scale-105"
                  onClick={() => setAddItemModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ Delete Category Confirmation Modal */}
      {deleteCategoryModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm sm:max-w-md shadow-2xl"> {/* ✅ Responsive width */}
            <h3 className="font-bold text-lg sm:text-xl text-error mb-4">Confirm Delete Category</h3>
            {targetCategory && (
              <p className="text-sm sm:text-base text-base-content/70 mb-4">
                Are you sure you want to delete category "{targetCategory.name}"?
              </p>
            )}
            <div className="modal-action">
              <button
                className="btn btn-error transition-transform hover:scale-105"
                onClick={() => {
                  handleDelete(targetCategory._id);
                  setDeleteCategoryModalOpen(false);
                }}
              >
                Yes, Delete
              </button>
              <button
                className="btn transition-transform hover:scale-105"
                onClick={() => setDeleteCategoryModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    {/* ✅ Updated: Edit Item Modal (now identical to Add Item Modal) */}
{editItemModalOpen && editingItem && (
  <div className="modal modal-open">
    <div className="modal-box max-w-sm sm:max-w-md shadow-2xl">
      {(() => {
        const target = activeChecklist.find(sec => sec._id === targetSection);
        return (
          <>
            <h3 className="font-bold text-lg sm:text-xl mb-4">
              Edit Item {target ? `in Section #${target.order}: ${target.section}` : ""}
            </h3>
            {target && (
              <p className="text-sm sm:text-base text-base-content/70 mb-4">
                You are editing an item in section #{target.order} ({target.section}).
              </p>
            )}
          </>
        );
      })()}

      <form onSubmit={(e) => { e.preventDefault(); handleSaveEditedItem(); }}>
        {/* Item type selector */}
        <div className="form-control mb-4">
          <label className="label text-sm sm:text-base">Item Type</label>
          <select
            className="select select-bordered w-full"
            value={editItemType}
            onChange={(e) => setEditItemType(e.target.value)}
          >
            <option value="status">Status (Good/No Good/etc.)</option>
            <option value="input">Input Field (e.g., Serial Number)</option>
          </select>
        </div>

        {/* Item name - Only for status items */}
        {editItemType === "status" && (
          <div className="form-control mb-4">
            <label className="label text-sm sm:text-base">Item Name (required)</label>
            <input
              type="text"
              placeholder="Item name"
              className="input input-bordered input-primary w-full"
              value={editItemName}
              onChange={(e) => setEditItemName(e.target.value)}
              required
            />
          </div>
        )}

        {/* For input items, show a note */}
        {editItemType === "input" && (
          <p className="text-sm text-base-content/70 mb-4">
            Name will be auto-generated as a numbered serial input (e.g., "Serial Number Input #1").
          </p>
        )}

        {/* Optional parent item selector */}
        {(() => {
          const target = activeChecklist.find(sec => sec._id === targetSection);
          if (target && target.items.length > 0) {
            return (
              <div className="form-control mb-4">
                <label className="label text-sm sm:text-base">
                  <span className="label-text">Parent Item (optional)</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={editParentItem || ""}
                  onChange={(e) => setEditParentItem(e.target.value)}
                >
                  <option value="">None (top-level item)</option>
                  {target.items.map(itm => (
                    <option key={itm._id} value={itm._id}>
                      {itm.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          }
          return null;
        })()}

        {/* Image upload section */}
        <div className="form-control mb-4">
          <label className="label text-sm sm:text-base">Reference Image (optional)</label>
          <input
            type="file"
            accept="image/*"
            className="file-input file-input-bordered file-input-primary w-full"
            onChange={handleEditImageChange}
          />
          {editImagePreview && (
            <div className="mt-2 relative">
              <img src={editImagePreview} alt="Preview" className="w-20 h-20 object-cover rounded" />
              <button
                className="btn btn-xs btn-error absolute top-0 right-0"
                onClick={removeEditImage}
              >
                <X size={12} />
              </button>
            </div>
          )}
          {editingItem.image && !editImagePreview && (
            <div className="mt-2">
              <label className="label text-sm sm:text-base">Current Image</label>
              <img
                src={`${API_BASE_URL}${editingItem.image}`}
                alt="Current"
                className="w-20 h-20 object-cover rounded"
              />
            </div>
          )}
          <p className="text-xs text-base-content/70 mt-1">Max 5MB, JPG/PNG/GIF only.</p>
        </div>

        <div className="modal-action">
          <button type="submit" className="btn btn-primary transition-transform hover:scale-105">
            Save Changes
          </button>
          <button
            type="button"
            className="btn transition-transform hover:scale-105"
            onClick={() => setEditItemModalOpen(false)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      
  {/* ✅ Image View Modal (unchanged) */}
  {viewImageModalOpen && (
    <div className="modal modal-open">
      <div className="modal-box max-w-md shadow-2xl">
        <h3 className="font-bold text-lg mb-4">Image Reference</h3>
        <img src={viewImageUrl} alt="Reference" className="w-full rounded" />
        <div className="modal-action">
          <button
            className="btn"
            onClick={() => setViewImageModalOpen(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )}
      <Toaster position="top-right" />
    </div>
  );
}