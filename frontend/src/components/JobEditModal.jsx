import React, { useState, useEffect } from "react";

// ✅ Add API_BASE_URL (adjust if needed; matches your Category component)
const API_BASE_URL = 'http://localhost:5000';

// ✅ Import special checklists
import AppearanceChecklist from "./appearanceChecklist";
import SummaryChecklist from "./summaryChecklist";
import TechnicalChecklist from "./technicalChecklist";

const JobEditModal = ({ job, onSave, onCancel }) => {
  const [editedJobInfo, setEditedJobInfo] = useState(job.jobInfo);
  const [editedChecklist, setEditedChecklist] = useState(job.checklist || []);
  const [currentSection, setCurrentSection] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  // ✅ New states for image preview
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  // ✅ Updated: Use correct property names from backend (appearanceMarks, defectSummary, technicalTests)
  const [specialStep, setSpecialStep] = useState(0); // 0 = normal, 1 = appearance, 2 = summary, 3 = technical
  const [editedAppearanceData, setEditedAppearanceData] = useState(job.appearanceMarks || []); // ✅ Fixed: Initialize from job.appearanceMarks
  const [editedSummaryData, setEditedSummaryData] = useState(job.defectSummary || []); // ✅ Fixed: Initialize from job.defectSummary
  const [editedTechnicalData, setEditedTechnicalData] = useState(job.technicalTests || {}); // ✅ Fixed: Initialize from job.technicalTests

  // ✅ Updated: useEffect to sync with correct backend properties
  useEffect(() => {
    setEditedAppearanceData(job.appearanceMarks || []);
    setEditedSummaryData(job.defectSummary || []);
    setEditedTechnicalData(job.technicalTests || {});
  }, [job]);

  const updateJobInfo = (field, value) => {
    setEditedJobInfo(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateStatus = (sectionIdx, itemIdx, status) => {
    setEditedChecklist(prev => {
      const updated = [...prev];
      updated[sectionIdx].items[itemIdx].status = status;
      if (status === "good" || status === "na") updated[sectionIdx].items[itemIdx].remarks = "";
      return updated;
    });
  };

  const updateRemarks = (sectionIdx, itemIdx, value) => {
    setEditedChecklist(prev => {
      const updated = [...prev];
      updated[sectionIdx].items[itemIdx].remarks = value;
      return updated;
    });
  };

  // ✅ New: Update name for input-type items (only if they have a value)
  const updateName = (sectionIdx, itemIdx, value) => {
    setEditedChecklist(prev => {
      const updated = [...prev];
      updated[sectionIdx].items[itemIdx].name = value;
      return updated;
    });
  };

  // ✅ New function to open image preview
  const openImagePreview = (imageUrl) => {
    setPreviewImageUrl(imageUrl);
    setImagePreviewOpen(true);
  };

  const handleSave = async () => {
    // ✅ Updated: Create FormData for multipart upload (required for images)
    const formData = new FormData();
    
    // Append JSON data as strings (files in arrays will be ignored here)
    formData.append('jobInfo', JSON.stringify(editedJobInfo));
    formData.append('checklist', JSON.stringify(editedChecklist));
    formData.append('appearanceMarks', JSON.stringify(editedAppearanceData));
    formData.append('defectSummary', JSON.stringify(editedSummaryData));
    formData.append('technicalTests', JSON.stringify(editedTechnicalData));
    
    // ✅ Append files with dynamic fieldnames (matching backend expectations)
    editedAppearanceData.forEach((mark, idx) => {
      if (mark.image && mark.image instanceof File) {
        formData.append(`appearance-${idx}`, mark.image);
      }
    });
    editedSummaryData.forEach((defect, idx) => {
      if (defect.image && defect.image instanceof File) {
        formData.append(`summary-${idx}`, defect.image);
      }
    });
    
    try {
      await onSave(formData); // Parent handles axios PUT with FormData
    } catch (err) {
      console.error("❌ Error saving job:", err);
      alert("Error saving job: " + err.message);
    }
  };

  const section = editedChecklist[currentSection] || { section: "", items: [] };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"> {/* ✅ Responsive: Add padding for mobile */}
      <div className="bg-base-100 p-4 md:p-6 rounded shadow-lg w-full max-w-5xl max-h-[90vh] flex flex-col"> {/* ✅ Responsive: Adaptive padding */}
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 space-y-2 md:space-y-0"> {/* ✅ Responsive: Stack vertically on mobile */}
          <h3 className="text-lg font-bold">
            Editing Job: {job.category?.name} ({editedJobInfo.customer || "No customer"})
          </h3>
          <div className="flex flex-wrap space-x-2"> {/* ✅ Responsive: Wrap buttons */}
            <button className="btn btn-sm btn-info" onClick={() => setFormOpen(true)}>
              Edit Form
            </button>
            <button
              className="btn btn-sm btn-warning"
              onClick={() => setSpecialStep(specialStep === 0 ? 1 : 0)}
            >
              {specialStep === 0 ? "Edit Special Checklists" : "Back to Normal Checklist"}
            </button>
          </div>
        </div>

        {/* Conditional Rendering for Normal vs Special Checklists */}
        {specialStep === 0 ? (
          // Normal Checklist
          <div className="flex-1 overflow-y-auto border p-4 rounded">
            <h4 className="text-lg font-semibold mb-4">Normal Checklist</h4>

            {/* Legend */}
            <div className="flex flex-wrap space-x-4 md:space-x-6 mb-4 text-sm"> {/* ✅ Responsive: Wrap legend */}
              <span>⭕ Good</span>
              <span>❌ No Good</span>
              <span>ⓧ Corrected</span>
              <span>🚫 N/A</span>
            </div>

            {/* Section header with counter */}
            <h5 className="font-bold mb-2 text-sm md:text-base"> {/* ✅ Responsive: Adaptive text size */}
              Section {currentSection + 1} of {editedChecklist.length}: {section.section}
            </h5>

            {/* Items table - ✅ Added Image column, reordered, and centered */}
            <div className="overflow-x-auto"> {/* ✅ Responsive: Horizontal scroll for table */}
              <table className="table w-full border min-w-150"> {/* ✅ Responsive: Min width for table */}
                <thead>
                  <tr>
                    <th className="text-center">Reference</th>
                    <th className="text-center">Item Name</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {/* ✅ Filter: Hide input items with no value (same as wizard preview) */}
                  {section.items
                    .filter((item) => !(item.type === "input" && !item.value))
                    .map((item, idx) => {
                      const originalIdx = section.items.indexOf(item); // Get original index for updates
                      return (
                        <tr key={originalIdx}>
                          <td className="text-center">
                            {item.image ? (
                              <img
                                src={`${API_BASE_URL}${item.image}`}
                                alt={item.name}
                                className="w-12 h-12 object-cover rounded cursor-pointer hover:scale-105 transition-transform mx-auto"
                                onClick={() => openImagePreview(`${API_BASE_URL}${item.image}`)}
                              />
                            ) : (
                              <span className="text-gray-400 text-sm">No Image</span>
                            )}
                          </td>
                          <td className="text-center">
                            {item.type === "input" ? (
                              <input
                                type="text"
                                placeholder="Enter item name"
                                value={item.name || ""}
                                onChange={(e) => updateName(currentSection, originalIdx, e.target.value)}
                                className="input input-bordered w-full"
                              />
                            ) : (
                              item.name
                            )}
                          </td>
                          <td className="text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                className={`btn btn-xs ${item.status === "good" ? "btn-success" : "btn-outline"}`}
                                onClick={() => updateStatus(currentSection, originalIdx, "good")}
                              >
                                ⭕
                              </button>
                              <button
                                className={`btn btn-xs ${item.status === "noGood" ? "btn-error" : "btn-outline"}`}
                                onClick={() => updateStatus(currentSection, originalIdx, "noGood")}
                              >
                                ❌
                              </button>
                              <button
                                className={`btn btn-xs ${item.status === "corrected" ? "btn-warning" : "btn-outline"}`}
                                onClick={() => updateStatus(currentSection, originalIdx, "corrected")}
                              >
                                ⓧ
                              </button>
                              <button
                                className={`btn btn-xs ${item.status === "na" ? "btn-info" : "btn-outline"}`}
                                onClick={() => updateStatus(currentSection, originalIdx, "na")}
                              >
                                🚫
                              </button>
                            </div>
                          </td>
                          <td className="text-center">
                            {item.status === "noGood" ? (
                              <input
                                type="text"
                                placeholder="Remarks (required)"
                                value={item.remarks || ""}
                                onChange={(e) => updateRemarks(currentSection, originalIdx, e.target.value)}
                                className="input input-bordered w-full border-red-500"
                                required
                              />
                            ) : item.status === "corrected" ? (
                              <input
                                type="text"
                                placeholder="Remarks (optional)"
                                value={item.remarks || ""}
                                onChange={(e) => updateRemarks(currentSection, originalIdx, e.target.value)}
                                className="input input-bordered w-full"
                              />
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Navigation */}
            <div className="flex flex-col md:flex-row justify-between mt-6 space-y-2 md:space-y-0"> {/* ✅ Responsive: Stack buttons */}
              {currentSection > 0 && (
                <button
                  className="btn btn-secondary w-full md:w-auto"
                  onClick={() => setCurrentSection(currentSection - 1)}
                >
                  Previous
                </button>
              )}
              {currentSection < editedChecklist.length - 1 && (
                <button
                  className="btn btn-primary w-full md:w-auto ml-auto"
                  onClick={() => setCurrentSection(currentSection + 1)}
                >
                  Next
                </button>
              )}
            </div>
          </div>
        ) : (
          // Special Checklists
          <div className="flex-1 overflow-y-auto border p-4 rounded">
            <h4 className="text-lg font-semibold mb-4">
              Special Checklist {specialStep}: {
                specialStep === 1 ? "Appearance" :
                specialStep === 2 ? "Summary" :
                "Technical"
              }
            </h4>

            {specialStep === 1 ? (
              <AppearanceChecklist
                // ✅ Removed key prop to prevent re-mounting during drag
                data={editedAppearanceData}
                onChange={setEditedAppearanceData}
                onSave={() => setSpecialStep(2)}
                appearanceImages={job.appearanceImages}
                showLegend={false}
              />
            ) : specialStep === 2 ? (
              <SummaryChecklist
                // ✅ Removed key prop to prevent re-mounting during typing
                data={editedSummaryData}
                onChange={setEditedSummaryData}
                onSave={() => setSpecialStep(3)}
                showLegend={false}
                openImagePreview={openImagePreview} // ✅ Pass preview function for image display
              />
            ) : (
              <TechnicalChecklist
                // ✅ Removed key prop to prevent re-mounting during typing
                data={editedTechnicalData}
                onChange={setEditedTechnicalData}
                onSave={() => setSpecialStep(0)} // Back to normal
                showLegend={false}
              />
            )}

            {/* Special Navigation */}
            <div className="flex flex-col md:flex-row justify-between mt-6 space-y-2 md:space-y-0"> {/* ✅ Responsive: Stack buttons */}
              {specialStep > 1 && (
                <button
                  className="btn btn-secondary w-full md:w-auto"
                  onClick={() => setSpecialStep(specialStep - 1)}
                >
                  Previous Special
                </button>
              )}
              {specialStep < 3 && (
                <button
                  className="btn btn-primary w-full md:w-auto ml-auto"
                  onClick={() => setSpecialStep(specialStep + 1)}
                >
                  Next Special
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col md:flex-row justify-end space-y-2 md:space-y-0 md:space-x-2 mt-4"> {/* ✅ Responsive: Stack buttons */}
          <button className="btn btn-sm btn-ghost w-full md:w-auto" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-sm btn-success w-full md:w-auto" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>

      {/* ✅ New Image Preview Modal */}
      {imagePreviewOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4"> {/* ✅ Responsive: Add padding */}
          <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] p-4 relative">
            <button
              className="btn btn-sm btn-circle btn-error absolute top-2 right-2"
              onClick={() => setImagePreviewOpen(false)}
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold mb-4 text-center">Image Preview</h3>
            <img
              src={previewImageUrl}
              alt="Preview"
              className="w-full h-auto max-h-[70vh] object-contain rounded"
            />
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-60 p-4"> {/* ✅ Responsive: Add padding */}
          <div className="bg-base-100 p-4 md:p-6 rounded shadow-lg w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Edit Form</h3>

            {/* Full job info form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6"> {/* ✅ Responsive: Adaptive grid */}
              <div>
                <label className="label font-medium">Customer</label>
                <input
                  type="text"
                  value={editedJobInfo.customer || ""}
                  onChange={(e) => updateJobInfo("customer", e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
              <div>
                <label className="label font-medium">JO Number</label>
                <input
                  type="text"
                  value={editedJobInfo.joNo || ""}
                  onChange={(e) => updateJobInfo("joNo", e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
              <div>
                <label className="label font-medium">CS Number</label>
                <input
                  type="text"
                  value={editedJobInfo.csNo || ""}
                  onChange={(e) => updateJobInfo("csNo", e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
              <div>
                <label className="label font-medium">Model</label>
                <input
                  type="text"
                  value={editedJobInfo.model || ""}
                  onChange={(e) => updateJobInfo("model", e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
              <div>
                <label className="label font-medium">Body Type</label>
                <input
                  type="text"
                  value={editedJobInfo.bodyType || ""}
                  onChange={(e) => updateJobInfo("bodyType", e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
              <div>
                <label className="label font-medium">Chassis Number</label>
                <input
                  type="text"
                  value={editedJobInfo.chassisNum || ""}
                  onChange={(e) => updateJobInfo("chassisNum", e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
              <div>
                <label className="label font-medium">Engine Number</label>
                <input
                  type="text"
                  value={editedJobInfo.engineNum || ""}
                  onChange={(e) => updateJobInfo("engineNum", e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
              <div>
                <label className="label font-medium">Date</label>
                <input
                  type="date"
                  value={editedJobInfo.date ? editedJobInfo.date.substring(0, 10) : ""}
                  onChange={(e) => updateJobInfo("date", e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
              <div>
                <label className="label font-medium">Key Number</label>
                <input
                  type="text"
                  value={editedJobInfo.keyNumber || ""}
                  onChange={(e) => updateJobInfo("keyNumber", e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
              <div>
                <label className="label font-medium">Job Type</label>
               <select
              value={editedJobInfo.jobType || ""}
              onChange={(e) => updateJobInfo("jobType", e.target.value)}
              className="select select-bordered w-full"
            >
              <option value="">Select Job Type</option>
              <option value="standard">Standard</option>
              <option value="modified">Modified</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col md:flex-row justify-end space-y-2 md:space-y-0 md:space-x-2 mt-4"> {/* ✅ Responsive: Stack buttons */}
          <button className="btn btn-sm btn-ghost w-full md:w-auto" onClick={() => setFormOpen(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  )}
</div>
); };

export default JobEditModal;