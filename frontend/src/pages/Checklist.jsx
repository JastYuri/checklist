import { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import JobEditModal from "../components/JobEditModal"; 
import ChecklistWizard from "../components/ChecklistWizard";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { FolderOpen, ClipboardList, Search, Calendar, ArrowLeft, Save, Edit, Trash2 } from "lucide-react"; // ✅ Added more icons for visuals

export default function Checklist() {
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [jobSaved, setJobSaved] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteJobId, setDeleteJobId] = useState(null);

  const [currentJob, setCurrentJob] = useState(null);     // holds the temporary job object (unsaved until checklist finalizes)
  const [showChecklist, setShowChecklist] = useState(false); // toggles between job form and checklist
  const [checklist, setChecklist] = useState([]);

  const [categoryData, setCategoryData] = useState(null);

  const navigate = useNavigate();

  const [searchDate, setSearchDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 5;

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axiosInstance.get("/category");
        setCategories(res.data);
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("Failed to load categories.");
      }
    };
    fetchCategories();

    // Restore selected category
    const savedCategory = localStorage.getItem("selectedCategory");
    if (savedCategory) {
      setSelected(JSON.parse(savedCategory));
    }

    // Restore temporary job/checklist state (unsaved)
    const savedJob = localStorage.getItem("currentJob");
    const savedShowChecklist = localStorage.getItem("showChecklist");

    if (savedJob) {
      setCurrentJob(JSON.parse(savedJob));
    }

    if (savedShowChecklist === "true") {
      setShowChecklist(true);
      setJobSaved(false); // Not yet saved to DB
    }
  }, []);

  // Persist currentJob whenever it changes
  useEffect(() => {
    if (currentJob) {
      localStorage.setItem("currentJob", JSON.stringify(currentJob));
    } else {
      localStorage.removeItem("currentJob");
    }
  }, [currentJob]);

  // Persist showChecklist flag
  useEffect(() => {
    localStorage.setItem("showChecklist", showChecklist ? "true" : "false");
  }, [showChecklist]);

  // Load jobs when category is selected or after saving
  useEffect(() => {
    if (selected) {
      const fetchJobs = async () => {
        setLoading(true);
        try {
          const res = await axiosInstance.get(`/job/category/${selected._id}`);
          setJobs(res.data);
        } catch (error) {
          console.error("Error fetching jobs:", error);
          toast.error("Failed to load jobs.");
        } finally {
          setLoading(false);
        }
      };
      fetchJobs();
    }
  }, [selected, jobSaved]);

  // Load category details (checklist template)
  useEffect(() => {
    if (selected?._id) {
      const fetchCategoryDetails = async () => {
        try {
          const res = await axiosInstance.get(`/category/${selected._id}`);
          const freshChecklist = initializeChecklist(res.data.checklist || []);
          setChecklist(freshChecklist);

          setSelected(res.data);
          localStorage.setItem("selectedCategory", JSON.stringify(res.data));
        } catch (error) {
          console.error("Error fetching category details:", error);
          toast.error("Failed to load category details.");
        }
      };
      fetchCategoryDetails();
    }
  }, [selected?._id, jobSaved]);

  // ✅ New: Fetch category data when currentJob changes (for appearanceImages)
  useEffect(() => {
    if (currentJob?.category?._id) {  // ✅ Use _id to ensure it's the ID, not the object
      const fetchCategory = async () => {
        try {
          const res = await axiosInstance.get(`/category/${currentJob.category._id}`);  // ✅ Use _id in URL
          setCategoryData(res.data); // Includes appearanceImages
        } catch (err) {
          console.error("Error fetching category:", err);
          toast.error("Failed to load category data");
        }
      };
      fetchCategory();
    } else {
      setCategoryData(null); // Reset if no job or invalid category
    }
  }, [currentJob?.category?._id]);  // ✅ Depend on _id to re-fetch when it changes

  const handleClick = async (cat) => {
    try {
      const res = await axiosInstance.get(`/category/${cat._id}`);
      const freshCat = res.data;

      setSelected(freshCat);
      setChecklist(freshCat.checklist || []);
      localStorage.setItem("selectedCategory", JSON.stringify(freshCat));
      setJobSaved(false);
      setShowChecklist(false); 
      setCurrentJob(null);     
    } catch (error) {
      console.error("❌ Error fetching category details:", error);
      setSelected(cat);
      setChecklist(cat.checklist || []);
      localStorage.setItem("selectedCategory", JSON.stringify(cat));
      setJobSaved(false);
      setShowChecklist(false);
      setCurrentJob(null);
      toast.error("Failed to load category details.");
    }
  };

  const handleBack = () => {
    setSelected(null);
    setChecklist([]);
    setJobSaved(false);
    setCurrentJob(null);
    setShowChecklist(false);

    localStorage.removeItem("selectedCategory");
    localStorage.removeItem("currentJob");
    localStorage.removeItem("showChecklist");
  };

  const initializeChecklist = (template) =>
    template.map(sec => ({
      _id: sec._id,              // ✅ preserve section id
      section: sec.section,
      items: (sec.items || []).map(item => ({
        _id: item._id,           // ✅ preserve item id
        name: item.name,
        type: item.type || "status", // ✅ Include type (default to "status")
        status: "na",            // reset status
        remarks: "",             // clear remarks
        value: item.value || "", // ✅ Include value (default to empty string)
        parentItem: item.parentItem, // ✅ preserve hierarchy
        code: item.code,         // ✅ preserve numbering
        image: item.image        // ✅ NEW: Include image field
      }))
    }));

  // Add this state at the top of your Checklist component (near other useState declarations)
  const [savingJob, setSavingJob] = useState(false); // ✅ New state for saving indicator

  const renderJobForm = (cat) => (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8"> {/* ✅ Responsive padding */}
      {/* Enhanced DaisyUI card */}
      <div className="card bg-linear-to-br from-base-200 to-base-300 shadow-2xl rounded-xl"> {/* ✅ Gradient and shadow */}
        <div className="card-body p-6 sm:p-8">
          <h4 className="card-title text-xl sm:text-2xl font-bold mb-6 text-primary flex items-center gap-2">
            <ClipboardList size={24} /> Job Information
          </h4>

          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
            onSubmit={async (e) => {
              e.preventDefault();

              const formData = new FormData(e.target);
              const jobInfo = Object.fromEntries(formData.entries());

              const requiredFields = [
                "customer","model","bodyType","chassisNum","engineNum",
                "date","joNo","csNo","keyNumber","jobType",
              ];
              const missing = requiredFields.filter(
                (f) => !jobInfo[f] || jobInfo[f].trim() === ""
              );
              if (missing.length > 0) {
                toast.error(
                  `Please fill in all required fields: ${missing.join(", ")}`,
                  { duration: 5000 }
                );
                return;
              }

              setSavingJob(true); // ✅ Start saving state

              try {
                // ✅ Artificial delay so "Saving job..." toast is visible (no actual DB save here)
                await new Promise((r) => setTimeout(r, 1000));

                // Create temporary job object (unsaved) with jobInfo and initialized checklist
                const tempJob = {
                  _id: `temp-${Date.now()}`, // Temporary ID for local use
                  category: selected, // Include category for reference
                  jobInfo,
                  checklist: initializeChecklist(checklist), // Use the category's checklist template
                };

                setCurrentJob(tempJob);
                setShowChecklist(true);
                setJobSaved(false); // Not saved yet

                localStorage.setItem("currentJob", JSON.stringify(tempJob));
                localStorage.setItem("showChecklist", "true");

                toast.success("Job prepared! Now proceed with the checklist.", { duration: 4000 });
              } catch (err) {
                toast.error("Unexpected error preparing job");
                console.error("❌ Error preparing job:", err);
              } finally {
                setSavingJob(false); // ✅ End saving state
              }
            }}
          >
            {/* Customer */}
            <div className="form-control">
              <label className="label text-sm sm:text-base font-medium">
                <span className="label-text">Customer *</span>
              </label>
              <input
                name="customer"
                placeholder="Enter customer name"
                className="input input-bordered input-primary w-full focus:ring-2 focus:ring-primary transition-all"
                required
                disabled={savingJob} // ✅ Disable inputs during save
              />
            </div>

            {/* Model */}
            <div className="form-control">
              <label className="label text-sm sm:text-base font-medium">
                <span className="label-text">Model *</span>
              </label>
              <input
                name="model"
                placeholder="Enter model"
                className="input input-bordered input-primary w-full focus:ring-2 focus:ring-primary transition-all"
                required
                disabled={savingJob} // ✅ Disable inputs during save
              />
            </div>

            {/* Body Type */}
            <div className="form-control">
              <label className="label text-sm sm:text-base font-medium">
                <span className="label-text">Body Type *</span>
              </label>
              <input
                name="bodyType"
                placeholder="Enter body type"
                className="input input-bordered input-primary w-full focus:ring-2 focus:ring-primary transition-all"
                required
                disabled={savingJob} // ✅ Disable inputs during save
              />
            </div>

            {/* Chassis Number */}
            <div className="form-control">
              <label className="label text-sm sm:text-base font-medium">
                <span className="label-text">Chassis Number *</span>
              </label>
              <input
                name="chassisNum"
                placeholder="Enter chassis number"
                className="input input-bordered input-primary w-full focus:ring-2 focus:ring-primary transition-all"
                required
                disabled={savingJob} // ✅ Disable inputs during save
              />
            </div>

            {/* Engine Number */}
            <div className="form-control">
              <label className="label text-sm sm:text-base font-medium">
                <span className="label-text">Engine Number *</span>
              </label>
              <input
                name="engineNum"
                placeholder="Enter engine number"
                className="input input-bordered input-primary w-full focus:ring-2 focus:ring-primary transition-all"
                required
                disabled={savingJob} // ✅ Disable inputs during save
              />
            </div>

            {/* Date */}
            <div className="form-control">
              <label className="label text-sm sm:text-base font-medium">
                <span className="label-text">Date *</span>
              </label>
              <input
                type="date"
                name="date"
                className="input input-bordered input-secondary w-full focus:ring-2 focus:ring-secondary transition-all"
                required
                disabled={savingJob} // ✅ Disable inputs during save
              />
            </div>

            {/* J/O No. */}
            <div className="form-control">
              <label className="label text-sm sm:text-base font-medium">
                <span className="label-text">J/O No. *</span>
              </label>
              <input
                name="joNo"
                placeholder="Enter J/O number"
                className="input input-bordered input-primary w-full focus:ring-2 focus:ring-primary transition-all"
                required
                disabled={savingJob} // ✅ Disable inputs during save
              />
            </div>

            {/* CS No. */}
            <div className="form-control">
              <label className="label text-sm sm:text-base font-medium">
                <span className="label-text">CS No. *</span>
              </label>
              <input
                name="csNo"
                placeholder="Enter CS number"
                className="input input-bordered input-primary w-full focus:ring-2 focus:ring-primary transition-all"
                required
                disabled={savingJob} // ✅ Disable inputs during save
              />
            </div>

            {/* Key Number */}
            <div className="form-control">
              <label className="label text-sm sm:text-base font-medium">
                <span className="label-text">Key Number *</span>
              </label>
              <input
                name="keyNumber"
                placeholder="Enter key number"
                className="input input-bordered input-primary w-full focus:ring-2 focus:ring-primary transition-all"
                required
                disabled={savingJob} // ✅ Disable inputs during save
              />
            </div>

            {/* Job Type */}
            <div className="form-control">
              <label className="label text-sm sm:text-base font-medium">
                <span className="label-text">Job Type *</span>
              </label>
              <select
                name="jobType"
                className="select select-bordered select-primary w-full focus:ring-2 focus:ring-primary transition-all"
                required
                disabled={savingJob} // ✅ Disable inputs during save
              >
                <option value="">Select Job Type</option>
                <option value="standard">Standard</option>
                <option value="modified">Modified</option>
              </select>
            </div>

            {/* Submit button */}
            <div className="col-span-1 md:col-span-2 flex justify-end mt-6">
              <button 
                type="submit" 
                className="btn btn-primary btn-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center gap-2"
                disabled={savingJob} // ✅ Disable button during save
              >
                {savingJob ? (
                  <>
                    <div className="loading loading-spinner loading-sm"></div> Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} /> Prepare Job
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  // Recursive helper to find category by ID in nested children
  const findCategoryById = (categories, id) => {
    for (const cat of categories) {
      if (cat._id === id) return cat;
      if (cat.children?.length) {
        const found = findCategoryById(cat.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const renderChecklist = (job) => {
    console.log("📂 Rendering checklist for temporary job:", job?._id);
    console.log("📋 Checklist data (temporary):", job?.checklist);

    return (
      <div className="card bg-base-100 shadow-xl rounded-xl p-4 sm:p-6 lg:p-8"> {/* ✅ Enhanced card */}
        <h4 className="text-xl sm:text-2xl font-bold mb-6 text-primary flex items-center gap-2">
          <ClipboardList size={24} /> Checklist for {job.jobInfo?.customer}
        </h4>

        <ChecklistWizard
          job={job}
          checklist={job.checklist}
          appearanceImages={categoryData?.appearanceImages || {}} // ✅ Pass appearance images from category

          // Local state changes (no auto-save to DB)
          onChange={(updatedChecklist) => {
            const updatedJob = {
              ...job,
              checklist: updatedChecklist.map((sec) => ({
                ...sec,
                items: sec.items.map((itm) => ({ ...itm })),
              })),
            };

            setCurrentJob(updatedJob);
            // ✅ Persist changes locally so refresh keeps progress
            localStorage.setItem("currentJob", JSON.stringify(updatedJob));
            localStorage.setItem("showChecklist", "true");
          }}

        onSaveAll={async (allData) => {
  try {
    console.log("📋 allData received in parent:", allData);
    
    // ✅ Create FormData for multipart upload (required for files)
    const formData = new FormData();
    
    // Append JSON data as strings (files in arrays will be ignored here)
    formData.append('jobInfo', JSON.stringify(job.jobInfo));
    formData.append('checklist', JSON.stringify(allData.checklist.map((sec) => ({
      _id: sec._id,
      section: sec.section,
      items: sec.items.map((itm) => ({
        _id: itm._id,
        name: itm.name,
        type: itm.type,
        status: itm.status,
        remarks: itm.remarks,
        value: itm.value,
        parentItem: itm.parentItem,
        code: itm.code,
        image: itm.image
      })),
    }))));
    formData.append('appearanceMarks', JSON.stringify(allData.appearanceData || []));
    formData.append('defectSummary', JSON.stringify(allData.summaryData || []));
    formData.append('technicalTests', JSON.stringify(allData.technicalData || {}));
    
    // ✅ Append files with dynamic fieldnames (matching backend expectations)
    (allData.appearanceData || []).forEach((mark, idx) => {
      if (mark.image && mark.image instanceof File) {
        formData.append(`appearance-${idx}`, mark.image);
      }
    });
    (allData.summaryData || []).forEach((defect, idx) => {
      if (defect.image && defect.image instanceof File) {
        formData.append(`summary-${idx}`, defect.image);
      }
    });
    
    // ✅ Send FormData with multipart headers
    let res;
    const isValidId = job._id && /^[a-f\d]{24}$/i.test(job._id);
    if (isValidId) {
      res = await axiosInstance.put(`/job/${job._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } else {
      res = await axiosInstance.post(`/job/category/${job.category._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    
    const savedJob = res.data;
    
    // Clear temporary state and persistence after final save
    localStorage.removeItem("currentJob");
    localStorage.removeItem("showChecklist");
    setCurrentJob(null);
    setShowChecklist(false);
    setJobSaved(true); // Trigger job list refresh
    
    toast.success(`Job and all checklists saved successfully for: ${savedJob.jobInfo?.customer}`, { duration: 4000 });
  } catch (err) {
    toast.error("Error saving job and all checklists: " + err.message);
  }
}}
      />
    </div>
  );
};

  const renderPastJobs = () => {
  // Filter and sort jobs by date (latest first) and search term
  const filteredJobs = jobs
    .filter((job) => {
      const matchesDate = !searchDate || (job.jobInfo?.date
                  ? new Date(job.jobInfo.date).toISOString().split("T")[0] === searchDate
        : false);
    const matchesSearch = !searchTerm || 
      (job.jobInfo?.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       job.jobInfo?.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       job.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesDate && matchesSearch;
  })
  .sort((a, b) => new Date(b.jobInfo?.date || 0) - new Date(a.jobInfo?.date || 0)); // Latest date first

  // Pagination logic (set to 5 jobs per page)
  const jobsPerPage = 5;
  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);

  // Delete job function (moved to modal confirm)
  const handleDeleteJob = async () => {
    if (!deleteJobId) return;

    try {
      await axiosInstance.delete(`/job/${deleteJobId}`);
      setJobs((prev) => prev.filter((j) => j._id !== deleteJobId));
      setDeleteJobId(null); // Close modal
      toast.success("Job deleted successfully!", { duration: 4000 });
    } catch (err) {
      toast.error("Error deleting job: " + err.message, { duration: 5000 });
    }
  };

  return (
    <div id="past-jobs-card" className="card bg-base-200 shadow-xl rounded-xl p-4 sm:p-6 lg:p-8 mt-6"> {/* ✅ Enhanced card */}
      <h4 className="text-lg sm:text-xl font-semibold mb-6 text-primary flex items-center gap-2">
        <Calendar size={20} /> Past Jobs
      </h4>

      {/* Enhanced Search inputs */}
      <div className="mb-6 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex-1">
          <label className="label font-medium text-sm sm:text-base">
            <span className="label-text">Search by Customer, Model, or Category</span>
          </label>
          <div className="input-group">
            <input
              type="text"
              placeholder="Enter search term..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // reset to first page when searching
              }}
              className="input input-bordered w-full focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
        </div>
        <div className="flex-1">
          <label className="label font-medium text-sm sm:text-base">
            <span className="label-text">Filter by Date</span>
          </label>
          <input
            type="date"
            value={searchDate}
            onChange={(e) => {
              setSearchDate(e.target.value);
              setCurrentPage(1); // reset to first page when searching
            }}
            className="input input-bordered w-full focus:ring-2 focus:ring-secondary transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="loading loading-spinner text-primary loading-lg"></div> {/* ✅ Larger spinner */}
        </div>
      ) : filteredJobs.length === 0 ? (
        <p className="text-center text-base-content/70 py-8 text-lg">No past jobs match your search.</p>
      ) : (
        <div className="space-y-4 animate-fadeIn">
          {currentJobs.map((job) => (
            <div key={job._id} className="border border-base-300 rounded-xl p-4 sm:p-6 bg-base-100 shadow-md hover:shadow-lg transition-all">
              <h5 className="font-semibold text-lg text-primary mb-2">
                {job.category?.name || "Unknown Category"}
              </h5>
              <p className="text-sm text-base-content/80 mb-1">
                Customer: {job.jobInfo?.customer}
              </p>
              <p className="text-sm text-base-content/80 mb-1">
                Model: {job.jobInfo?.model}
              </p>
              <p className="text-sm text-base-content/80 mb-4">
                Date:{" "}
                {job.jobInfo?.date
                  ? new Date(job.jobInfo.date).toLocaleDateString()
                  : "N/A"}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                <button
                  className="btn btn-sm btn-warning btn-outline hover:btn-solid transition-all hover:scale-105 flex items-center gap-1"
                  onClick={() => setEditingJob(job)}
                >
                  <Edit size={14} /> Edit Job
                </button>
                <button
                  className="btn btn-sm btn-error btn-outline hover:btn-solid transition-all hover:scale-105 flex items-center gap-1"
                  onClick={() => setDeleteJobId(job._id)} // Open delete modal
                >
                  <Trash2 size={14} /> Delete Job
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 space-x-2">
          <button
            className="btn btn-sm btn-outline hover:btn-solid transition-all hover:scale-105"
            disabled={currentPage === 1}
            onClick={() => {
              const newPage = currentPage - 1;
              setCurrentPage(newPage);
              toast(`Moved to page ${newPage}`, { duration: 2000 });
              document
                .getElementById("past-jobs-card")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Prev
          </button>
          <span className="text-sm text-base-content/70 self-center">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-sm btn-outline hover:btn-solid transition-all hover:scale-105"
            disabled={currentPage === totalPages}
            onClick={() => {
              const newPage = currentPage + 1;
              setCurrentPage(newPage);
              toast(`Moved to page ${newPage}`, { duration: 2000 });
              document
                .getElementById("past-jobs-card")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Edit modal for job info + checklist editing */}
      {editingJob && (
        <JobEditModal
          job={editingJob}
          onSave={async (formData) => { // ✅ Updated: Accept FormData instead of plain object
            try {
              const res = await axiosInstance.put(
                `/job/${editingJob._id}`,
                formData, // ✅ Send FormData directly
                {
                  headers: { 'Content-Type': 'multipart/form-data' }, // ✅ Set multipart headers
                }
              );

              // Update jobs list
              setJobs((prev) =>
                prev.map((j) => (j._id === editingJob._id ? res.data : j))
              );

              // If editing current job, update persistence
              if (currentJob?._id === editingJob._id) {
                setCurrentJob(res.data);
                localStorage.setItem("currentJob", JSON.stringify(res.data));
                localStorage.setItem("showChecklist", "true");
              }

              setEditingJob(null);

              // Toast with delay
              toast.success("Job updated successfully!", { duration: 4000 });
            } catch (err) {
              toast.error("Error updating job: " + err.message, {
                duration: 5000,
              });
            }
          }}
          onCancel={() => setEditingJob(null)}
        />
      )}

      {/* Enhanced Delete confirmation modal */}
      {deleteJobId && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm sm:max-w-md shadow-2xl bg-base-100 rounded-xl"> {/* ✅ Responsive and themed */}
            <h3 className="font-bold text-lg sm:text-xl text-error mb-4 flex items-center gap-2">
              <Trash2 size={20} /> Confirm Deletion
            </h3>
            <p className="py-4 text-sm sm:text-base text-base-content/80">
              Are you sure you want to delete this job? This action cannot be undone.
            </p>
            <div className="modal-action justify-end">
              <button
                className="btn btn-ghost hover:btn-solid transition-all hover:scale-105"
                onClick={() => setDeleteJobId(null)} // Cancel
              >
                Cancel
              </button>
              <button
                className="btn btn-error hover:btn-solid transition-all hover:scale-105"
                onClick={handleDeleteJob} // Confirm delete
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
const renderCards = (cats) => {
  const isTwo = cats.length === 2;

  return (
    <div
      className={`grid gap-4 sm:gap-6 ${
        isTwo
          ? "grid-cols-1 md:grid-cols-2 justify-center max-w-2xl mx-auto" // ✅ Balanced layout for 2 cards
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      }`}
    >
      {cats.map((cat) => (
        <div
          key={cat._id}
          className="card bg-linear-to-br from-base-200 to-base-300 shadow-lg hover:shadow-xl cursor-pointer hover:scale-105 transition-all duration-300 rounded-xl"
          onClick={() => {
            handleClick(cat);
            setCurrentJob(null);
            setShowChecklist(false);
            localStorage.removeItem("currentJob");
            localStorage.setItem("showChecklist", "false");
          }}
        >
          <div className="card-body p-4 sm:p-6">
            {/* Enhanced Icon + Title */}
            <div className="flex items-center gap-3 mb-2">
              {cat.children?.length ? (
                <FolderOpen className="text-primary w-6 h-6" />
              ) : (
                <ClipboardList className="text-secondary w-6 h-6" />
              )}
              <h3 className="card-title text-lg sm:text-xl font-semibold text-base-content">{cat.name}</h3>
            </div>

            {/* Description */}
            <p className="text-sm sm:text-base text-base-content/70 mb-4">
              {cat.description || "No description"}
            </p>

            {/* Actions */}
            <div className="card-actions justify-end">
              <span className="badge badge-outline badge-primary hover:badge-solid transition-all">View</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

return (
  <div className="p-4 sm:p-6 lg:p-8 space-y-6"> {/* ✅ Responsive padding */}
    <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-primary flex items-center gap-2">
      <ClipboardList size={28} /> Checklist
    </h2>

    {selected ? (
      <div>
        <button className="btn btn-outline btn-primary mb-4 sm:mb-6 hover:btn-solid transition-all hover:scale-105 flex items-center gap-2" onClick={handleBack}>
          <ArrowLeft size={16} /> Back
        </button>
        <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-secondary">{selected.name}</h3>

        {selected.children && selected.children.length > 0 ? (
          renderCards(selected.children)
        ) : (
          <>
            {showChecklist ? (
              renderChecklist(currentJob) // ✅ Show checklist if flag is true
            ) : (
              <>
                {renderJobForm(selected, checklist)}
                {renderPastJobs()} {/* ✅ Only show past jobs under job form */}
              </>
            )}
          </>
        )}
      </div>
    ) : (
      renderCards(categories)
    )}
  </div>
);
}

<Toaster position="top-right" />