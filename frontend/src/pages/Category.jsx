import { useState, useEffect, useRef } from "react"; // ✅ Added useRef for outside click
import axiosInstance from "../utils/axiosInstance";
import toast, { Toaster } from "react-hot-toast";
import { toRoman } from "../utils/roman";
import { Plus, Trash2, Edit, Search, Image, Eye, X, ChevronDown, FileText, List } from "lucide-react"; // ✅ Added ChevronDown, FileText, List icons



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

  // ✅ NEW: Saving states for different operations
const [savingCategory, setSavingCategory] = useState(false);       // Add category
const [savingSection, setSavingSection] = useState(false);          // Add section
const [savingItem, setSavingItem] = useState(false);              // Add item
const [savingEditItem, setSavingEditItem] = useState(false);       // Edit item
const [savingAppearance, setSavingAppearance] = useState(false);  // Save appearance images
const [deletingCategory, setDeletingCategory] = useState(false);   // Delete category
const [deletingSection, setDeletingSection] = useState(false);     // Delete section
const [deletingItem, setDeletingItem] = useState(false);           // Delete item

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
  setSavingCategory(true); // ✅ Start saving
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
  } finally {
    setSavingCategory(false); // ✅ End saving
  }
};

 const handleDelete = async (id) => {
  setDeletingCategory(true); // ✅ Start deleting
  try {
    await axiosInstance.delete(`/category/${id}`);
    toast.success("Category deleted!");
    fetchCategories();
  } catch (error) {
    toast.error("Error deleting category");
  } finally {
    setDeletingCategory(false); // ✅ End deleting
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
  front: res.data.appearanceImages?.front || null,
  rear: res.data.appearanceImages?.rear || null,
  left: res.data.appearanceImages?.left || null,
  right: res.data.appearanceImages?.right || null,
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
  setSavingSection(true); // ✅ Start saving
  try {
    const res = await axiosInstance.post(
      `/category/${activeCategory._id}/checklist/section`,
      { section: newSectionName }
    );
    setActiveCategory(res.data);
    setActiveChecklist(res.data.checklist);
    toast.success("Section added!");
    setAddSectionModalOpen(false);
    setNewSectionName("");
  } catch (error) {
    toast.error("Error adding section");
  } finally {
    setSavingSection(false); // ✅ End saving
  }
};
// ✅ Updated handleSaveItem (unchanged, but ensure it's using FormData correctly)
  const handleSaveItem = async () => {
    if (!targetSection) return;
    setSavingItem(true); 
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
    }  finally {
    setSavingItem(false); // ✅ End saving
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
     setDeletingSection(true);
    try {
      const res = await axiosInstance.delete(
        `/category/${activeCategory._id}/checklist/${sectionId}`
      );

      setActiveCategory(res.data);
      setActiveChecklist(res.data.checklist);

      toast.success("Section deleted!");
    } catch (error) {
      toast.error("Error deleting section");
    } finally {
    setDeletingSection(false); // ✅ End deleting
  }
  };

 const handleImageChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    // ✅ Removed MIME type restriction to accept ANY image format (HEIC, AVIF, etc.)
    // ✅ Increased size limit to 20MB (adjust based on backend capability)
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image size must be less than 20MB.");
      return;
    }
    setItemImage(file);
    // ✅ Ensure preview is generated immediately
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
    // ✅ Removed MIME type restriction
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image size must be less than 20MB.");
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

const handleAppearanceImageChange = (side, e) => {
  const file = e.target.files[0];
  if (file) {
    // ✅ Removed MIME type restriction
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image size must be less than 20MB.");
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
  setSavingAppearance(true);
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
  } finally {
    setSavingAppearance(false); // ✅ End saving
  }
};

 const handleSaveEditedItem = async () => {
  if (!targetSection || !editingItem) return;
   setSavingEditItem(true);
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
  } finally {
    setSavingEditItem(false); // ✅ End saving
  }
};

  // Delete Item
  const handleDeleteItem = async (sectionId, itemId) => {
    if (!sectionId || !itemId) {
      toast.error("Invalid section or item ID");
      return;
    }
    setDeletingItem(true);
    try {
      const res = await axiosInstance.delete(
        `/category/${activeCategory._id}/checklist/${sectionId}/item/${itemId}`
      );

      setActiveCategory(res.data);
      setActiveChecklist(res.data.checklist);

      toast.success("Item deleted!");
    } catch (error) {
      toast.error("Error deleting item");
    } finally {
    setDeletingItem(false); // ✅ End deleting
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


  // ✅ NEW: Render categories as collapsible cards with dropdown pattern (closed by default)
  const renderCategoryCards = (cats, level = 0, colorIndex = 0) => {
    const colorClasses = [
      { bg: "bg-linear-to-br from-primary/10 to-primary/5", headerBg: "from-primary/15 to-primary/5", border: "border-l-4 border-primary", badge: "badge-primary" },
      { bg: "bg-linear-to-br from-success/10 to-success/5", headerBg: "from-success/15 to-success/5", border: "border-l-4 border-success", badge: "badge-success" },
      { bg: "bg-linear-to-br from-info/10 to-info/5", headerBg: "from-info/15 to-info/5", border: "border-l-4 border-info", badge: "badge-info" },
      { bg: "bg-linear-to-br from-warning/10 to-warning/5", headerBg: "from-warning/15 to-warning/5", border: "border-l-4 border-warning", badge: "badge-warning" },
    ];

    return cats.map((cat, idx) => {
      const colorClass = colorClasses[(colorIndex + idx) % colorClasses.length];
      const hasChildren = cat.children?.length > 0;
      const levelLabel = level === 0 ? "Main Category" : level === 1 ? "Subcategory" : "Sub-subcategory";

      return (
        <div key={cat._id} className={`${level > 0 ? "ml-4 sm:ml-8" : ""}`}>
          {/* Collapsible Category Card */}
          <div className={`border-2 border-base-300 rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 shadow-md hover:shadow-lg ${hasChildren ? "" : "mb-4"}`}>
            <details className="group cursor-pointer">
              <summary className={`p-4 sm:p-5 bg-linear-to-r ${colorClass.headerBg} hover:from-primary/25 hover:to-primary/15 transition-all flex items-center justify-between group-open:border-b-2 group-open:border-primary/30`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={`badge badge-sm ${colorClass.badge} font-semibold`}>{levelLabel}</span>
                  {hasChildren && <span className="badge badge-sm badge-outline text-xs">{cat.children.length} sub</span>}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm sm:text-base lg:text-lg text-base-content">{cat.name}</h3>
                    {cat.description && <p className="text-xs sm:text-xs text-base-content/60 line-clamp-1">{cat.description}</p>}
                  </div>
                </div>
                <ChevronDown size={20} className="transition-transform duration-300 shrink-0 group-open:rotate-180" />
              </summary>

              {/* Card Content - shown when expanded */}
              <div className="p-4 sm:p-5 bg-base-50 space-y-3">
                {cat.description && (
                  <div className="text-sm text-base-content/70 p-3 bg-base-100 rounded-lg border border-base-300">
                    {cat.description}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                  {hasChildren && (
                    <button
                      className="btn btn-sm btn-primary gap-2"
                      onClick={() => { setParentId(cat._id); setModalOpen(true); }}
                    >
                      <Plus size={16} /> Add Subcategory
                    </button>
                  )}
                  {!hasChildren && (
                    <>
                      <button
                        className="btn btn-sm btn-primary gap-2"
                        onClick={() => { setParentId(cat._id); setModalOpen(true); }}
                      >
                        <Plus size={16} /> Add Subcategory
                      </button>
                      <button
                        className="btn btn-sm btn-secondary gap-2"
                        onClick={() => handleManageChecklist(cat)}
                      >
                        <FileText size={16} /> Manage Checklist
                      </button>
                    </>
                  )}
                  <button
                    className="btn btn-sm btn-error btn-outline gap-2"
                    onClick={() => { setTargetCategory(cat); setDeleteCategoryModalOpen(true); }}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>

                {/* Subcategories - shown when expanded */}
                {hasChildren && (
                  <div className="mt-4 pt-4 border-t border-base-300">
                    <div className="space-y-3">
                      {renderCategoryCards(cat.children, level + 1, level === 0 ? idx : colorIndex)}
                    </div>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      );
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

      {/* ✅ Categories Display - Card-Based Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categories.length > 0 ? (
          renderCategoryCards(categories, 0)
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-base-content/70 text-lg mb-4">No categories yet. Create your first one!</p>
          </div>
        )}
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
             <button type="submit" className="btn btn-primary transition-transform hover:scale-105" disabled={savingCategory}>
  {savingCategory ? (
    <>
      <div className="loading loading-spinner loading-sm"></div> Saving...
    </>
  ) : (
    "Save"
  )}
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
    <div className="modal-box max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-4xl shadow-2xl bg-base-100 max-h-[90vh] flex flex-col" ref={modalRef}>
      {/* Header */}
      <div className="shrink-0 border-b border-base-300 pb-4 mb-4">
        <h3 className="font-bold text-2xl sm:text-3xl text-primary mb-2">
          📋 Checklist for <span className="text-secondary">{activeCategory?.name}</span>
        </h3>
        <p className="text-sm text-base-content/70">Manage sections and items for this category's inspection checklist</p>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-100 pr-2">
        
        {/* Search Bar */}
        <div className="form-control mb-6 sticky top-0 bg-base-100 z-10 py-2">
          <div className="input-group flex">
            <input
              type="text"
              placeholder="Search items or sections..."
              className="input input-bordered input-info w-full focus:ring-2 focus:ring-info transition-all"
              onChange={(e) => {
                const query = e.target.value.toLowerCase();
                if (!query) {
                  setFilteredChecklist([]);
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
              <Search size={18} />
            </button>
          </div>
        </div>

        {/* Appearance Images Section */}
        <div className="mb-6 p-4 bg-linear-to-br from-accent/10 to-accent/5 rounded-xl border-2 border-accent/30">
          <details className="cursor-pointer">
            <summary className="font-bold text-base text-base-content flex items-center gap-2 hover:text-accent transition-colors">
              <Image size={18} className="text-accent" /> Appearance Images (Front, Rear, Left, Right)
            </summary>
            <div className="mt-4 space-y-4">
              <p className="text-sm text-base-content/70">
                Upload reference images for each side of the unit. These images help in marking defects in the appearance checklist.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['front', 'rear', 'left', 'right'].map(side => (
                  <div key={side} className="form-control p-3 bg-base-100 rounded-lg">
                    <label className="label text-sm font-semibold capitalize text-base-content">{side} View</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="file-input file-input-bordered file-input-primary w-full text-sm"
                      onChange={(e) => handleAppearanceImageChange(side, e)}
                    />
                    {appearanceImagePreviews[side] && (
                      <div className="mt-2 relative inline-block">
                        <img src={appearanceImagePreviews[side]} alt={`${side} preview`} className="w-full h-24 object-cover rounded-lg border-2 border-base-300" />
                        <button
                          className="btn btn-xs btn-error absolute top-1 right-1"
                          onClick={() => removeAppearanceImage(side)}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  className="btn btn-success btn-sm gap-2"
                  onClick={handleSaveAppearanceImages}
                  disabled={savingAppearance}
                >
                  {savingAppearance ? (
                    <>
                      <div className="loading loading-spinner loading-sm"></div> Saving...
                    </>
                  ) : (
                    <>💾 Save Images</>
                  )}
                </button>
              </div>
            </div>
          </details>
        </div>

        {/* Checklist Sections */}
        <div className="space-y-4">
          {(filteredChecklist.length ? filteredChecklist : activeChecklist).length > 0 ? (
            (filteredChecklist.length ? filteredChecklist : activeChecklist).map((section, sectionIndex) => (
              <div
                key={section._id}
                className="border-2 border-base-300 rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                {/* Section Header */}
                <details className="group cursor-pointer">
                  <summary className="p-4 sm:p-5 bg-linear-to-r from-primary/15 to-primary/5 hover:from-primary/25 hover:to-primary/15 transition-all flex items-center justify-between group-open:border-b-2 group-open:border-primary/30">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="badge badge-lg badge-primary font-bold">{toRoman(section.order)}</span>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm sm:text-base lg:text-lg text-base-content truncate">{section.section}</h4>
                        <p className="text-xs text-base-content/60">{section.items.length} items</p>
                      </div>
                    </div>
                    <ChevronDown size={20} className="transition-transform duration-300 group-open:rotate-180" />
                  </summary>

                  {/* Section Items */}
                  <div className="p-4 sm:p-5 bg-base-50 space-y-3">
                    {section.items.length > 0 ? (
                      section.items.filter(item => !item.parentItem).map((item, itemIndex) => (
                        <div key={item._id} className="space-y-2">
                          {/* Parent Item */}
                          <div className="p-3 bg-base-100 border-l-4 border-secondary rounded-lg hover:shadow-md transition-all">
                            <div className="flex gap-3 items-start">
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-14 h-14 object-cover rounded-lg cursor-pointer hover:scale-110 transition-transform shrink-0 border-2 border-base-300"
                                  onClick={() => handleViewImage(item.image)}
                                />
                              )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                    <span className="badge badge-xs sm:badge-sm badge-secondary whitespace-nowrap">{item.type === 'input' ? '🔢 Input' : '✓ Status'}</span>
                                    <span className="font-semibold text-base-content text-xs sm:text-sm lg:text-base line-clamp-2">{itemIndex + 1}. {item.name}</span>
                                  </div>
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-3 flex gap-1 sm:gap-2 flex-wrap ml-0 sm:ml-3">
                              {item.image && (
                                <button
                                  className="btn btn-xs gap-0 sm:gap-1"
                                  onClick={() => handleViewImage(item.image)}
                                >
                                  <Eye size={12} /> <span className="hidden sm:inline">View</span>
                                </button>
                              )}
                              <button
                                className="btn btn-xs btn-warning gap-0 sm:gap-1"
                                onClick={() => handleEditItem(section._id, item)}
                              >
                                <Edit size={12} /> <span className="hidden sm:inline">Edit</span>
                              </button>
                              <button
                                className="btn btn-xs btn-error gap-0 sm:gap-1"
                                onClick={() => {
                                  setTargetSection(section._id);
                                  setTargetItem(item._id);
                                  setDeleteItemModalOpen(true);
                                }}
                              >
                                <Trash2 size={12} /> <span className="hidden sm:inline">Delete</span>
                              </button>
                            </div>
                          </div>

                          {/* Child Items */}
                          {section.items.filter(sub => sub.parentItem?.toString() === item._id.toString()).length > 0 && (
                            <div className="ml-6 space-y-2 border-l-4 border-info/50 pl-3">
                              {section.items
                                .filter(sub => sub.parentItem?.toString() === item._id.toString())
                                .map((subItem, subIdx) => (
                                  <div key={subItem._id} className="p-3 bg-base-200 rounded-lg border-l-4 border-info hover:shadow-md transition-all">
                                    <div className="flex gap-3 items-start">
                                      {subItem.image && (
                                        <img
                                          src={subItem.image}
                                          alt={subItem.name}
                                          className="w-10 h-10 object-cover rounded cursor-pointer hover:scale-110 transition-transform shrink-0 border border-base-300"
                                          onClick={() => handleViewImage(subItem.image)}
                                        />
                                      )}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1">
                                            <span className="badge badge-xs badge-info text-xs whitespace-nowrap">{subItem.type === 'input' ? '🔢' : '✓'}</span>
                                            <span className="text-xs sm:text-sm text-base-content truncate">↳ {subItem.name}</span>
                                          </div>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex gap-1 flex-wrap ml-0 sm:ml-3">
                                      {subItem.image && (
                                        <button
                                          className="btn btn-xs btn-info btn-outline gap-0"
                                          onClick={() => handleViewImage(subItem.image)}
                                        >
                                          <Eye size={10} />
                                        </button>
                                      )}
                                      <button
                                        className="btn btn-xs btn-warning btn-outline gap-0"
                                        onClick={() => handleEditItem(section._id, subItem)}
                                      >
                                        <Edit size={10} />
                                      </button>
                                      <button
                                        className="btn btn-xs btn-error btn-outline gap-0"
                                        onClick={() => {
                                          setTargetSection(section._id);
                                          setTargetItem(subItem._id);
                                          setDeleteItemModalOpen(true);
                                        }}
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-base-content/70 py-6 text-sm">No items yet. Add one below! 👇</p>
                    )}

                    {/* Section Actions */}
                    <div className="mt-4 pt-4 border-t border-base-300 flex gap-2 flex-wrap justify-end">
                      <button
                        className="btn btn-sm btn-error btn-outline gap-2"
                        onClick={() => {
                          setTargetSection(section._id);
                          setDeleteSectionModalOpen(true);
                        }}
                      >
                        <Trash2 size={16} /> Delete Section
                      </button>
                      <button
                        className="btn btn-sm btn-success gap-2"
                        onClick={() => {
                          setTargetSection(section._id);
                          setAddItemModalOpen(true);
                        }}
                      >
                        <Plus size={16} /> Add Item
                      </button>
                    </div>
                  </div>
                </details>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <List size={48} className="mx-auto mb-4 text-base-content/30" />
              <p className="text-base-content/70 text-lg mb-4">No sections found yet</p>
              <p className="text-sm text-base-content/60">Create your first section to start building the checklist!</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-base-300 mt-6 pt-4 flex justify-between items-center gap-4">
        <button
          className="btn btn-lg btn-success shadow-lg hover:shadow-xl transition-all gap-2"
          onClick={() => setAddSectionModalOpen(true)}
        >
          <Plus size={18} /> Add Section
        </button>
        <button
          className="btn btn-neutral hover:btn-solid transition-all"
          onClick={() => {
            setChecklistModalOpen(false);
            setFilteredChecklist([]);
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
  disabled={deletingSection}
>
  {deletingSection ? (
    <>
      <div className="loading loading-spinner loading-sm"></div> Deleting...
    </>
  ) : (
    "Yes, Delete"
  )}
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
  disabled={deletingItem}
>
  {deletingItem ? (
    <>
      <div className="loading loading-spinner loading-sm"></div> Deleting...
    </>
  ) : (
    "Yes, Delete"
  )}
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
               <button type="submit" className="btn btn-primary transition-transform hover:scale-105" disabled={savingSection}>
  {savingSection ? (
    <>
      <div className="loading loading-spinner loading-sm"></div> Saving...
    </>
  ) : (
    "Save"
  )}
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
    accept="image/*" // ✅ Changed to accept all images
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
  {/* ✅ Updated text to reflect new limit */}
  <p className="text-xs text-base-content/70 mt-1">Max 20MB, Any Image Format.</p>
</div>

              <div className="modal-action">
                {/* ✅ Button type="submit" so Enter also triggers it */}
               <button type="submit" className="btn btn-primary transition-transform hover:scale-105" disabled={savingItem}>
  {savingItem ? (
    <>
      <div className="loading loading-spinner loading-sm"></div> Saving...
    </>
  ) : (
    "Save"
  )}
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
  disabled={deletingCategory}
>
  {deletingCategory ? (
    <>
      <div className="loading loading-spinner loading-sm"></div> Deleting...
    </>
  ) : (
    "Yes, Delete"
  )}
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
    accept="image/*" // ✅ Changed to accept all images
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
        src={editingItem.image}
        alt="Current"
        className="w-20 h-20 object-cover rounded"
      />
    </div>
  )}
  {/* ✅ Updated text to reflect new limit */}
  <p className="text-xs text-base-content/70 mt-1">Max 20MB, Any Image Format.</p>
</div>

        <div className="modal-action">
          <button type="submit" className="btn btn-primary transition-transform hover:scale-105" disabled={savingEditItem}>
  {savingEditItem ? (
    <>
      <div className="loading loading-spinner loading-sm"></div> Saving...
    </>
  ) : (
    "Save Changes"
  )}
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