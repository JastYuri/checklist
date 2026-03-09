import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { ChevronDown, FileText, List } from "lucide-react";





// ✅ Import special checklists
import AppearanceChecklist from "./appearanceChecklist";
import SummaryChecklist from "./summaryChecklist";
import TechnicalChecklist from "./technicalChecklist";

// ✅ Helper component for canvas preview in modal (updated for better sizing)
const AppearancePreviewCanvas = ({ side, marks, imageSrc }) => {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const redrawCanvas = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Debug: Log canvas size and marks
      console.log(`Canvas size for ${side}:`, canvas.width, canvas.height);
      console.log(`Marks for ${side}:`, marks);
      // Draw permanent marks (adapted from AppearanceChecklist)
      marks.forEach((mark) => {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        if (mark.type === 'circle') {
          ctx.beginPath();
          ctx.arc(mark.x * canvas.width, mark.y * canvas.height, mark.radius * Math.min(canvas.width, canvas.height), 0, 2 * Math.PI);
          ctx.stroke();
          // Add label if defectName exists
          if (mark.defectName) {
            ctx.fillStyle = 'red';
            ctx.font = '16px Arial';
            ctx.fillText(mark.defectName, mark.x * canvas.width + mark.radius * Math.min(canvas.width, canvas.height) + 5, mark.y * canvas.height - 5);
          }
        } else if (mark.type === 'path') {
          ctx.beginPath();
          mark.path.forEach((point, i) => {
            const px = point.x * canvas.width;
            const py = point.y * canvas.height;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
          // Add label at start of path if defectName exists
          if (mark.defectName && mark.path.length > 0) {
            ctx.fillStyle = 'red';
            ctx.font = '16px Arial';
            ctx.fillText(mark.defectName, mark.path[0].x * canvas.width + 5, mark.path[0].y * canvas.height - 5);
          }
        }
      });
    };

    const updateCanvasSize = () => {
      // Use clientWidth/Height for displayed size (more accurate for constrained images)
      const width = img.clientWidth;
      const height = img.clientHeight;
      canvas.width = width;
      canvas.height = height;
      console.log(`Image displayed size for ${side}:`, width, height); // Debug
      redrawCanvas();
    };

    img.addEventListener('load', updateCanvasSize);
    if (img.complete) updateCanvasSize(); // If already loaded
    window.addEventListener('resize', updateCanvasSize); // Handle resize

    return () => {
      img.removeEventListener('load', updateCanvasSize);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [marks, imageSrc, side]); // Include side for logging

  return (
    <div key={side}>
      <h5 className="font-semibold capitalize mb-2">{side} Side</h5>
      <div className="relative mb-4 w-full aspect-video bg-base-300 rounded-lg overflow-hidden border">
        <img
          ref={imgRef}
          src={imageSrc}
          alt={`${side} side`}
          className="w-full h-full object-contain" // ✅ Removed max-h-96 to match edit mode sizing
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none" // Overlay, no interaction
        />
      </div>
      {/* Improved list of defects (unchanged) */}
      <div className="space-y-4">
        {marks.map((mark, idx) => (
          <div key={idx} className="bg-base-100 p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-base-content">Defect {idx + 1} ({mark.type})</span>
            </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className="text-sm font-medium text-base-content/80">Defect Name:</span>
                <p className="text-sm text-base-content mt-1">{mark.defectName || "N/A"}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-base-content/80">Remarks:</span>
                <p className="text-sm text-base-content mt-1">{mark.remarks || "No remarks"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChecklistWizard = ({
  job,
  checklist,
  onChange,
  // ✅ Removed old onSave; added onSaveAll for saving everything at the end
  onSaveAll,
  // ✅ New props for special checklists (no incremental saves)
  appearanceData,
  summaryData,
  technicalData,
  appearanceImages // ✅ New: Appearance images from category
}) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // ✅ New states for image preview
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  // ✅ New state for special checklist step (0 = normal, 1 = appearance, 2 = summary, 3 = technical)
  const [specialStep, setSpecialStep] = useState(0);
  // ✅ States for special checklist data (local copies with job-specific localStorage persistence)
  const [localAppearanceData, setLocalAppearanceData] = useState(() => {
    const saved = localStorage.getItem(`appearanceData-${job?._id}`);
    return saved ? JSON.parse(saved) : (appearanceData || []);
  });
  const [localSummaryData, setLocalSummaryData] = useState(() => {
    const saved = localStorage.getItem(`summaryData-${job?._id}`);
    return saved ? JSON.parse(saved) : (summaryData || []);
  });
  const [localTechnicalData, setLocalTechnicalData] = useState(() => {
    const saved = localStorage.getItem(`technicalData-${job?._id}`);
    return saved ? JSON.parse(saved) : (technicalData || {});
  });

  const [validationError, setValidationError] = useState(null);

  // close details when clicking inside content (not on summary)
  const handleDetailsClick = (e) => {
    const details = e.currentTarget;
    if (e.target.closest("summary")) return; // ignore clicks on summary itself
    details.open = false;
  };

  // ✅ Persist special data to job-specific localStorage on change
  useEffect(() => {
    if (job?._id) {
      localStorage.setItem(`appearanceData-${job._id}`, JSON.stringify(localAppearanceData));
    }
  }, [localAppearanceData, job?._id]);

  useEffect(() => {
    if (job?._id) {
      localStorage.setItem(`summaryData-${job._id}`, JSON.stringify(localSummaryData));
    }
  }, [localSummaryData, job?._id]);

  useEffect(() => {
    if (job?._id) {
      localStorage.setItem(`technicalData-${job._id}`, JSON.stringify(localTechnicalData));
    }
  }, [localTechnicalData, job?._id]);

  // ✅ Clear job-specific localStorage when job changes
  useEffect(() => {
    if (job?._id) {
      // Clear previous job's data if any
      const keys = Object.keys(localStorage).filter(key => key.startsWith('appearanceData-') || key.startsWith('summaryData-') || key.startsWith('technicalData-'));
      keys.forEach(key => {
        if (!key.includes(job._id)) {
          localStorage.removeItem(key);
        }
      });
    }
  }, [job?._id]);

  // ✅ Clear localStorage on final save
  const clearLocalStorage = () => {
    if (job?._id) {
      localStorage.removeItem(`appearanceData-${job._id}`);
      localStorage.removeItem(`summaryData-${job._id}`);
      localStorage.removeItem(`technicalData-${job._id}`);
    }
  };

  useEffect(() => {
    if (currentSection >= checklist.length) {
      setCurrentSection(0);
    }
  }, [checklist]);

  // Update status (preserves parentItem and code)
  const updateStatus = (sectionIdx, itemIdx, value) => {
    const updated = [...checklist];
    updated[sectionIdx] = {
      ...updated[sectionIdx],
      items: updated[sectionIdx].items.map((itm, idx) =>
        idx === itemIdx
          ? {
              ...itm,
              status: value,
              remarks: itm.remarks, 
            }
          : itm
      ),
    };
    onChange(updated);
  };


   // ✅ ADD THIS useEffect
useEffect(() => {
  if (checklist && checklist.length > 0) {
    validateChecklist();
  }
}, [checklist]);
  // Update remarks (preserves parentItem and code)
  const updateRemarks = (sectionIdx, itemIdx, value) => {
    const updated = [...checklist];
    updated[sectionIdx] = {
      ...updated[sectionIdx],
      items: updated[sectionIdx].items.map((itm, idx) =>
        idx === itemIdx ? { ...itm, remarks: value } : itm
      ),
    };
    onChange(updated);
  };

   

  // Update value for input-type items (dynamic name: value if entered, else original name)
  const updateValue = (sectionIdx, itemIdx, value) => {
    const updated = [...checklist];
    const item = updated[sectionIdx].items[itemIdx];
    const originalName = item.originalName || item.name; // Fallback to original auto-generated name
    updated[sectionIdx].items[itemIdx] = {
      ...item,
      value: value,
      name: value ? value : originalName, // Dynamic if value exists; revert to original if empty
    };
    onChange(updated);
  };

  // ✅ ADD THIS FUNCTION HERE
const validateChecklist = () => {
  let hasError = false;
  let errorMessage = "";

  checklist.forEach((section, sectionIdx) => {
    section.items.forEach((item, itemIdx) => {
      if (item.status === "noGood" && (!item.remarks || item.remarks.trim() === "")) {
        hasError = true;
        errorMessage = `Section "${section.section}" - Item "${item.name}" requires remarks for "No Good" status.`;
      }
    });
  });

  if (hasError) {
    setValidationError(errorMessage);
    return false;
  }

  setValidationError(null);
  return true;
};

  // ✅ New function to open image preview
  const openImagePreview = (imageUrl) => {
    setPreviewImageUrl(imageUrl);
    setImagePreviewOpen(true);
  };

  if (!checklist || checklist.length === 0) {
    return (
      <div className="bg-linear-to-br from-base-100 to-base-200 border-2 border-base-300 shadow-xl rounded-xl p-4 sm:p-6 lg:p-8 w-full">
        <p className="text-center text-base-content/70 text-sm sm:text-base">No checklist available.</p>
      </div>
    );
  }

  const section = checklist[currentSection] || { section: "No section", items: [] };

  return (
   <div className="bg-linear-to-br from-base-100 to-base-200 border-2 border-base-300 shadow-xl rounded-xl overflow-hidden">
      <div className="bg-linear-to-r from-primary/15 to-primary/5 p-4 sm:p-6 border-b-2 border-primary/20">
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary flex items-center gap-3 mb-1">
          <List size={28} /> Job Checklist
        </h3>
        <p className="text-sm text-base-content/70">Complete all sections and special checklists before saving</p>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 space-y-4">
      {/* Legend for Normal Checklist always visible */}
      {specialStep === 0 && (
        <div className="mb-4 p-4 bg-base-100 rounded-lg border-2 border-primary/30">
          <h6 className="text-sm font-semibold mb-2">Status Legend</h6>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2 p-2 bg-success/10 rounded-lg"><span>⭕</span> <span className="font-medium">Good</span></div>
            <div className="flex items-center gap-2 p-2 bg-error/10 rounded-lg"><span>❌</span> <span className="font-medium">No Good</span></div>
            <div className="flex items-center gap-2 p-2 bg-warning/10 rounded-lg"><span>ⓧ</span> <span className="font-medium">Corrected</span></div>
            <div className="flex items-center gap-2 p-2 bg-info/10 rounded-lg"><span>🚫</span> <span className="font-medium">N/A</span></div>
          </div>
        </div>
      )}

      {/* ✅ Conditional header based on step */}
      {specialStep === 0 ? (
        <div className="bg-linear-to-r from-secondary/15 to-secondary/5 p-4 sm:p-5 rounded-lg border-l-4 border-secondary mb-4">
          <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-secondary flex items-center gap-2 mb-1">
            <FileText size={24} /> {section.section}
          </h4>
          <p className="text-xs sm:text-sm text-base-content/70">Section {currentSection + 1} of {checklist.length}</p>
        </div>
      ) : (
        <div className="bg-linear-to-r from-warning/15 to-warning/5 p-4 sm:p-5 rounded-lg border-l-4 border-warning mb-4">
          <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-warning flex items-center gap-2 mb-1">
            <FileText size={24} /> Special Checklist {specialStep}
          </h4>
          <p className="text-xs sm:text-sm text-base-content/70">{
            specialStep === 1 ? "Mark defects on vehicle appearance images" :
            specialStep === 2 ? "Document all encountered defects" :
            "Record technical test measurements"
          }</p>
        </div>
      )}

      {/* ✅ Conditional rendering for normal vs. special checklists */}
      {specialStep === 0 ? (
        // Normal checklist table with responsive design
        <>
          <div className="overflow-x-auto rounded-xl border-2 border-base-300 bg-base-100">
  <table className="table w-full">
            <thead>
              <tr className="bg-linear-to-r from-primary/15 to-primary/5 border-b-2 border-primary/30">
                <th className="text-center text-sm sm:text-base font-bold text-primary">Reference</th>
                <th className="text-center text-sm sm:text-base font-bold text-primary">Item Name</th>
                <th className="text-center text-sm sm:text-base font-bold text-primary">Status</th>
                <th className="text-center text-sm sm:text-base font-bold text-primary">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {section.items.map((item, idx) => {
                const statusSymbols = {
                  good: "⭕",
                  noGood: "❌",
                  corrected: "ⓧ",
                  na: "🚫",
                };
                return (
                  <tr key={item._id || idx} className="hover:bg-base-200 transition-colors border-b border-base-300">
                    <td className="text-center p-3 sm:p-4">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded cursor-pointer hover:scale-110 transition-transform mx-auto border border-base-300"
                          onClick={() => openImagePreview(item.image)}
                        />
                      ) : (
                        <span className="text-base-content/40 text-xs sm:text-sm">No Image</span>
                      )}
                    </td>
                    <td className="text-center p-3 sm:p-4">
                      {item.type === "input" ? (
                        <input
                          type="text"
                          placeholder="Enter serial"
                          value={item.value || ""}
                          onChange={(e) => updateValue(currentSection, idx, e.target.value)}
                          className="input input-sm input-bordered w-full focus:ring-2 focus:ring-primary transition-all"
                        />
                      ) : (
                        <span className="font-medium text-sm sm:text-base">{item.name}</span>
                      )}
                    </td>
                    <td className="text-center p-3 sm:p-4">
                      <div className="flex items-center justify-center flex-col gap-1">
                        <span className="text-xl sm:text-2xl font-semibold" title="Current status">
                          {statusSymbols[item.status] || "ℹ️"}
                        </span>
                        <div className="flex flex-wrap gap-1 justify-center">
                          <button
                            className={`btn btn-xs transition-all ${
                              item.status === "good"
                                ? "btn-success"
                                : "btn-outline btn-sm hover:btn-success"
                            }`}
                            onClick={() => updateStatus(currentSection, idx, "good")}
                            title="Mark as Good"
                          >
                            ⭕
                          </button>
                          <button
                            className={`btn btn-xs transition-all ${
                              item.status === "noGood"
                                ? "btn-error"
                                : "btn-outline btn-sm hover:btn-error"
                            }`}
                            onClick={() => updateStatus(currentSection, idx, "noGood")}
                            title="Mark as No Good"
                          >
                            ❌
                          </button>
                          <button
                            className={`btn btn-xs transition-all ${
                              item.status === "corrected"
                                ? "btn-warning"
                                : "btn-outline btn-sm hover:btn-warning"
                            }`}
                            onClick={() => updateStatus(currentSection, idx, "corrected")}
                            title="Mark as Corrected"
                          >
                            ⓧ
                          </button>
                          <button
                            className={`btn btn-xs transition-all ${
                              item.status === "na"
                                ? "btn-info"
                                : "btn-outline btn-sm hover:btn-info"
                            }`}
                            onClick={() => updateStatus(currentSection, idx, "na")}
                            title="Mark as N/A"
                          >
                            🚫
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="text-center p-3 sm:p-4">
  <input
    type="text"
    placeholder={`${item.status === "noGood" ? "Required" : "Optional"}`}
    value={item.remarks || ""}
    onChange={(e) => updateRemarks(currentSection, idx, e.target.value)}
    className={`input input-sm input-bordered w-full focus:ring-2 transition-all ${
  item.status === "noGood" && (!item.remarks || item.remarks.trim() === "")
    ? "border-red-500 focus:ring-red-500"
    : ""
}`}
    required={item.status === "noGood"}
  />
</td>
                  </tr>
                );
              })}
              {section.items.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center text-base-content/70 p-6 font-medium">
                    📭 No items in this section
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </>
      ) : specialStep === 1 ? (
        <AppearanceChecklist
          data={localAppearanceData}
          onChange={setLocalAppearanceData}
          onSave={() => setSpecialStep(2)} // ✅ No save; just proceed
          appearanceImages={appearanceImages} // ✅ New: Pass appearance images
          showLegend={false} // ✅ Hide legend for special checklists
        />
      ) : specialStep === 2 ? (
        <SummaryChecklist
          data={localSummaryData}
          onChange={setLocalSummaryData}
          onSave={() => setSpecialStep(3)} // ✅ No save; just proceed
          showLegend={false} // ✅ Hide legend for special checklists
        />
      ) : (
        <TechnicalChecklist
          data={localTechnicalData}
          onChange={setLocalTechnicalData}
          onSave={() => setPreviewOpen(true)} // ✅ Proceed to preview after last special
          showLegend={false} // ✅ Hide legend for special checklists
        />
      )}

      {/* Navigation - ✅ Updated for special steps */}
      <div className="flex flex-col sm:flex-row justify-between mt-8 gap-3 pt-6 border-t-2 border-base-300">
        {(currentSection > 0 && specialStep === 0) && (
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentSection(currentSection - 1)}
          >
            Previous
          </button>
        )}
        {specialStep > 0 && (
          <button
            className="btn btn-secondary"
            onClick={() => setSpecialStep(specialStep - 1)}
          >
            Back to Previous Special
          </button>
        )}
       {currentSection < checklist.length - 1 && specialStep === 0 ? (
  <button
    className="btn btn-primary ml-auto gap-2"
    onClick={() => {
      if (validateChecklist()) {
        setCurrentSection(currentSection + 1);
      }
    }}
    disabled={validationError !== null}
  >
    Next Section →
  </button>
) : specialStep === 0 ? (
  <button
    className="btn btn-warning ml-auto gap-2"
    onClick={() => {
      if (validateChecklist()) {
        setSpecialStep(1);
      }
    }}
    disabled={validationError !== null}
  >
    Start Special Checklists
  </button>
) : specialStep < 3 ? (
  <button
    className="btn btn-primary ml-auto gap-2"
    onClick={() => {
      if (validateChecklist()) {
        setSpecialStep(specialStep + 1);
      }
    }}
    disabled={validationError !== null}
  >
    Next Checklist →
  </button>
) : null}
      </div>

      {/* ✅ ADD THIS ERROR MESSAGE DISPLAY HERE */}
{validationError && (
  <div className="alert alert-error text-sm mt-4 shadow-md border-2 border-error/50">
    <div className="flex items-center gap-2">
      <span className="text-lg">⚠️</span>
      <span className="font-medium">{validationError}</span>
    </div>
  </div>
)}



      {/* Preview modal - ✅ Full details of all checklists */}
      {previewOpen && job && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-linear-to-br from-base-100 to-base-200 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col max-h-[95vh] md:max-h-[90vh] border-2 border-base-300">
            <div className="bg-linear-to-r from-primary/15 to-primary/5 border-b-2 border-primary/30 px-4 sm:px-6 py-4 sticky top-0 z-10">
              <h3 className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-2 mb-1">✔️ Final Review</h3>
              <p className="text-sm text-base-content/70">
                Review all sections and special checklists before finalizing
              </p>
            </div>

            <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1 space-y-4">
              {/* Normal checklist sections - Full details */}
              {checklist.map((sec, idx) => (
                <details onClick={handleDetailsClick} key={sec._id || sec.section} className="group cursor-pointer border-2 border-secondary/30 rounded-xl overflow-hidden hover:border-secondary/50 transition-all">
                  <summary className="p-4 sm:p-5 bg-linear-to-r from-secondary/15 to-secondary/5 hover:from-secondary/25 hover:to-secondary/15 transition-all flex items-center justify-between group-open:border-b-2 group-open:border-secondary/30 font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-lg badge-secondary font-bold text-white">{idx + 1}</span>
                      <span className="text-base sm:text-lg text-secondary">{sec.section}</span>
                    </div>
                    <ChevronDown size={20} className="transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <div className="p-4 sm:p-5 bg-base-100">
                  <h4 className="text-lg font-bold text-secondary mb-3 pb-2">
                    {sec.section}
                  </h4>
                  <ul className="space-y-2">
                    {sec.items
                      .filter((item) => !(item.type === "input" && !item.value))
                      .map((item) => {
                        const statusSymbols = {
                          good: "⭕",
                          noGood: "❌",
                          corrected: "ⓧ",
                          na: "🚫",
                        };
                        return (
                          <li
                            key={item._id || item.name}
                            className="flex items-start justify-between border-b border-base-300 pb-2 last:border-b-0"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-10 h-10 object-cover rounded cursor-pointer hover:scale-105 transition-transform shrink-0"
                                  onClick={() => openImagePreview(item.image)}
                                />
                              )}
                              <div className="flex flex-col">
                                <span className="font-medium text-base-content">
                                  {item.name}
                                </span>
                                {item.remarks && (
                                  <span className="text-sm text-base-content/70 mt-1">
                                    Remarks: {item.remarks}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-lg">
                              {statusSymbols[item.status] || "ℹ️"}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                  {sec.items.filter((item) => !(item.type === "input" && !item.value)).length === 0 && (
                    <p className="text-center text-base-content/70 py-4 italic">No applicable items in this section.</p>
                  )}
                  </div>
                </details>
              ))}

             {/* ✅ Enhanced: Appearance with canvas-overlaid marks (like AppearanceChecklist) */}
<details onClick={handleDetailsClick} className="group cursor-pointer border-2 border-warning/30 rounded-xl overflow-hidden hover:border-warning/50 transition-all">
  <summary className="p-4 sm:p-5 bg-linear-to-r from-warning/15 to-warning/5 hover:from-warning/25 hover:to-warning/15 transition-all flex items-center justify-between group-open:border-b-2 group-open:border-warning/30 font-semibold">
    <div className="flex items-center gap-2">
      <span className="badge badge-lg badge-warning font-bold text-white">A</span>
      <span className="text-base sm:text-lg text-warning">Appearance Checklist</span>
    </div>
    <ChevronDown size={20} className="transition-transform duration-300 group-open:rotate-180" />
  </summary>
  <div className="p-4 sm:p-5 bg-base-100 space-y-4">
  {localAppearanceData.length > 0 ? (
    <div className="space-y-4">
      {/* Display marks grouped by side with canvas overlay */}
      {['front', 'rear', 'left', 'right'].map(side => {
        const sideMarks = localAppearanceData.filter(mark => mark.side === side);
        if (sideMarks.length === 0) return null;
        return (
          <AppearancePreviewCanvas
            key={side}
            side={side}
            marks={sideMarks}
           imageSrc={appearanceImages?.[side] || '/images/default-appearance.jpg'}
          />
        );
      })}
    </div>
  ) : (
    <p className="text-base-content/70 italic text-center py-4">No defects marked.</p>
  )}
  </div>
</details>

              {/* ✅ Summary in table format (already is) */}
              <details onClick={handleDetailsClick} className="group cursor-pointer border-2 border-info/30 rounded-xl overflow-hidden hover:border-info/50 transition-all">
                <summary className="p-4 sm:p-5 bg-linear-to-r from-info/15 to-info/5 hover:from-info/25 hover:to-info/15 transition-all flex items-center justify-between group-open:border-b-2 group-open:border-info/30 font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-lg badge-info font-bold text-white">S</span>
                    <span className="text-base sm:text-lg text-info">Summary Checklist</span>
                  </div>
                  <ChevronDown size={20} className="transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <div className="p-4 sm:p-5 bg-base-100">
                {localSummaryData.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-base-300 bg-base-100">
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>Defect Code</th>
                        <th>Defect Encountered</th>
                        <th>Status</th>
                        <th>Recurrence</th>
                        <th>Image</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localSummaryData.map((defect, idx) => (
                        <tr key={idx}>
                          <td>{defect.no}</td>
                          <td>{defect.defectCode}</td>
                          <td>{defect.defectEncountered}</td>
                          <td>{defect.status}</td>
                          <td>{defect.recurrence}</td>
                          <td>
                            {/* ✅ Fixed: Check if image is a File before using createObjectURL */}
                            {defect.image && defect.image instanceof File && (
                              <img
                                src={URL.createObjectURL(defect.image)}
                                alt="Defect"
                                className="w-10 h-10 object-cover rounded cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => openImagePreview(URL.createObjectURL(defect.image))}
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                ) : (
                  <p className="text-base-content/70 italic text-center py-4">No defects listed.</p>
                )}
                </div>
              </details>

              {/* ✅ Enhanced: Technical in card-based layout */}
<details onClick={handleDetailsClick} className="group cursor-pointer border-2 border-success/30 rounded-xl overflow-hidden hover:border-success/50 transition-all">
  <summary className="p-4 sm:p-5 bg-linear-to-r from-success/15 to-success/5 hover:from-success/25 hover:to-success/15 transition-all flex items-center justify-between group-open:border-b-2 group-open:border-success/30 font-semibold">
    <div className="flex items-center gap-2">
      <span className="badge badge-lg badge-success font-bold text-white">T</span>
      <span className="text-base sm:text-lg text-success">Technical Checklist</span>
    </div>
    <ChevronDown size={20} className="transition-transform duration-300 group-open:rotate-180" />
  </summary>
  <div className="p-4 sm:p-5 bg-base-100">
  {Object.keys(localTechnicalData).length > 0 ? (
    <div className="space-y-4">
      {/* Breaking Force */}
      {localTechnicalData.breakingForce && (
        <div className="bg-base-100 p-4 rounded-lg shadow-sm border">
          <h5 className="font-semibold text-base-content mb-3">Breaking Force (daN)</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h6 className="text-sm font-medium text-base-content/80 mb-2">Max Front</h6>
              <ul className="text-sm space-y-1">
                <li>Left: {localTechnicalData.breakingForce.max?.front?.left || 'N/A'}</li>
                <li>Right: {localTechnicalData.breakingForce.max?.front?.right || 'N/A'}</li>
                <li>Sum: {localTechnicalData.breakingForce.max?.front?.sum || 'N/A'}</li>
                <li>Difference: {localTechnicalData.breakingForce.max?.front?.difference || 'N/A'}</li>
              </ul>
            </div>
            <div>
              <h6 className="text-sm font-medium text-base-content/80 mb-2">Max Rear</h6>
              <ul className="text-sm space-y-1">
                <li>Left: {localTechnicalData.breakingForce.max?.rear?.left || 'N/A'}</li>
                <li>Right: {localTechnicalData.breakingForce.max?.rear?.right || 'N/A'}</li>
                <li>Sum: {localTechnicalData.breakingForce.max?.rear?.sum || 'N/A'}</li>
                <li>Difference: {localTechnicalData.breakingForce.max?.rear?.difference || 'N/A'}</li>
              </ul>
            </div>
            <div>
              <h6 className="text-sm font-medium text-base-content/80 mb-2">Min Front</h6>
              <ul className="text-sm space-y-1">
                <li>Left: {localTechnicalData.breakingForce.min?.front?.left || 'N/A'}</li>
                <li>Right: {localTechnicalData.breakingForce.min?.front?.right || 'N/A'}</li>
                <li>Sum: {localTechnicalData.breakingForce.min?.front?.sum || 'N/A'}</li>
                <li>Difference: {localTechnicalData.breakingForce.min?.front?.difference || 'N/A'}</li>
              </ul>
            </div>
            <div>
              <h6 className="text-sm font-medium text-base-content/80 mb-2">Min Rear</h6>
              <ul className="text-sm space-y-1">
                <li>Left: {localTechnicalData.breakingForce.min?.rear?.left || 'N/A'}</li>
                <li>Right: {localTechnicalData.breakingForce.min?.rear?.right || 'N/A'}</li>
                <li>Sum: {localTechnicalData.breakingForce.min?.rear?.sum || 'N/A'}</li>
                <li>Difference: {localTechnicalData.breakingForce.min?.rear?.difference || 'N/A'}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Speed Testing */}
      {localTechnicalData.speedTesting && (
        <div className="bg-base-100 p-4 rounded-lg shadow-sm border">
          <h5 className="font-semibold text-base-content mb-3">Speed Testing</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-base-content/80">Speedometer:</span>
              <p className="text-sm text-base-content mt-1">{localTechnicalData.speedTesting.speedometer || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-base-content/80">Tester:</span>
              <p className="text-sm text-base-content mt-1">{localTechnicalData.speedTesting.tester || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Turning Radius */}
      {localTechnicalData.turningRadius && (
        <div className="bg-base-100 p-4 rounded-lg shadow-sm border">
          <h5 className="font-semibold text-base-content mb-3">Turning Radius</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h6 className="text-sm font-medium text-base-content/80 mb-2">Inner</h6>
              <ul className="text-sm space-y-1">
                <li>Left: {localTechnicalData.turningRadius.inner?.left || 'N/A'}</li>
                <li>Right: {localTechnicalData.turningRadius.inner?.right || 'N/A'}</li>
              </ul>
            </div>
            <div>
              <h6 className="text-sm font-medium text-base-content/80 mb-2">Outer</h6>
              <ul className="text-sm space-y-1">
                <li>Left: {localTechnicalData.turningRadius.outer?.left || 'N/A'}</li>
                <li>Right: {localTechnicalData.turningRadius.outer?.right || 'N/A'}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Slip Tester */}
      {localTechnicalData.slipTester && localTechnicalData.slipTester.length > 0 && (
        <div className="bg-base-100 p-4 rounded-lg shadow-sm border">
          <h5 className="font-semibold text-base-content mb-3">Slip Tester</h5>
          <ul className="text-sm space-y-1">
            {localTechnicalData.slipTester.map((slip, idx) => (
              <li key={idx}>Speed: {slip.speed}, Value: {slip.value}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Headlight Tester */}
      {localTechnicalData.headlightTester && (
        <div className="bg-base-100 p-4 rounded-lg shadow-sm border">
          <h5 className="font-semibold text-base-content mb-3">Headlight Tester</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h6 className="text-sm font-medium text-base-content/80 mb-2">Low Beam Before</h6>
              <ul className="text-sm space-y-1">
                <li>Left: {localTechnicalData.headlightTester.lowBeam?.before?.left || 'N/A'}</li>
                <li>Right: {localTechnicalData.headlightTester.lowBeam?.before?.right || 'N/A'}</li>
              </ul>
            </div>
            <div>
              <h6 className="text-sm font-medium text-base-content/80 mb-2">Low Beam After</h6>
              <ul className="text-sm space-y-1">
                <li>Left: {localTechnicalData.headlightTester.lowBeam?.after?.left || 'N/A'}</li>
                <li>Right: {localTechnicalData.headlightTester.lowBeam?.after?.right || 'N/A'}</li>
              </ul>
            </div>
            <div>
              <h6 className="text-sm font-medium text-base-content/80 mb-2">High Beam Before</h6>
              <ul className="text-sm space-y-1">
                <li>Left: {localTechnicalData.headlightTester.highBeam?.before?.left || 'N/A'}</li>
                <li>Right: {localTechnicalData.headlightTester.highBeam?.before?.right || 'N/A'}</li>
              </ul>
            </div>
            <div>
              <h6 className="text-sm font-medium text-base-content/80 mb-2">High Beam After</h6>
              <ul className="text-sm space-y-1">
                <li>Left: {localTechnicalData.headlightTester.highBeam?.after?.left || 'N/A'}</li>
                <li>Right: {localTechnicalData.headlightTester.highBeam?.after?.right || 'N/A'}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ABS Testing */}
      {localTechnicalData.absTesting && localTechnicalData.absTesting.length > 0 && (
        <div className="bg-base-100 p-4 rounded-lg shadow-sm border">
          <h5 className="font-semibold text-base-content mb-3">ABS Testing</h5>
          <ul className="text-sm space-y-1">
            {localTechnicalData.absTesting.map((abs, idx) => (
              <li key={idx}>{abs.option}: {abs.remarks}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  ) : (
    <p className="text-base-content/70 italic text-center py-4">No tests completed.</p>
  )}
  </div>
</details>
            </div>

            <div className="flex justify-end gap-3 border-t-2 border-base-300 px-4 sm:px-6 py-4 bg-linear-to-r from-base-200 to-base-100 sticky bottom-0 z-10">
              <button
                className="btn btn-sm btn-neutral gap-2"
                onClick={() => setPreviewOpen(false)}
                disabled={saving}
              >
                ← Back
              </button>
              <button
                className="btn btn-sm btn-success gap-2 shadow-lg"
                disabled={saving}
                onClick={async () => {
                  try {
                    setSaving(true);
                    // ✅ Add console logs here to debug
                    console.log("📋 localAppearanceData:", localAppearanceData);
                    console.log("📋 localSummaryData:", localSummaryData);
                    console.log("📋 localTechnicalData:", localTechnicalData);
                    // ✅ Updated: Pass data in correct structure (appearanceData as array)
                    await onSaveAll({
                      checklist,
                      appearanceData: localAppearanceData, // ✅ Direct array
                      summaryData: localSummaryData,
                      technicalData: localTechnicalData,
                    });
                    setPreviewOpen(false);
                    clearLocalStorage(); // ✅ Clear localStorage on final save
                    toast.success("All checklists finalized and saved successfully!");
                  } catch (err) {
                    console.error("❌ Error finalizing all checklists:", err);
                    toast.error("Failed to save all checklists!");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Saving...
                  </>
                ) : (
                  "✔️ Confirm & Save"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Image Preview Modal */}
      {imagePreviewOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 rounded-xl shadow-2xl max-w-4xl max-h-[90vh] p-4 sm:p-6 relative border-2 border-base-300">
            <button
              className="btn btn-sm btn-circle btn-error absolute top-3 sm:top-4 right-3 sm:right-4 shadow-lg"
              onClick={() => setImagePreviewOpen(false)}
            >
              ✕
            </button>
            <h3 className="text-lg sm:text-xl font-bold mb-4 text-center text-primary">🖼️ Image Preview</h3>
            <img
              src={previewImageUrl}
              alt="Preview"
              className="w-full h-auto max-h-[70vh] object-contain rounded-lg border border-base-300"
            />
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ChecklistWizard;